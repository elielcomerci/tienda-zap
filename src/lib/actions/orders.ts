'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { releaseCouponRedemptionForOrder } from '@/lib/coupons'
import { findAccessibleOrder, findAccessibleOrderItem } from '@/lib/order-access'
import { activateZapCreditPlanForOrder } from '@/lib/actions/credits'
import { evaluateSellerIncentivesForOrder } from '@/lib/incentives-evaluator'
import { deleteR2Object, getR2ObjectMetadata } from '@/lib/r2'
import {
  isArtworkUploadAllowedStatus,
  sanitizeFileName,
} from '@/lib/order-files'
import {
  revalidateOrderViews,
  syncOrderStatusAfterArtworkChange,
  syncOrderStatusAfterPayment,
  getOrderDisplayCode,
} from '@/lib/orders-workflow'
import { sendEmailAsync } from '@/lib/email'
import { orderReadyEmail } from '@/lib/email-templates'

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user?.role !== 'ADMIN') throw new Error('No autorizado')
}

export async function updateOrderStatus(id: string, status: string) {
  await requireAdmin()
  await prisma.order.update({
    where: { id },
    data: { status: status as any },
  })

  // Log event
  await prisma.orderEvent.create({
    data: { orderId: id, status, note: null },
  })

  if (status === 'CANCELLED') {
    await releaseCouponRedemptionForOrder(id)
  }

  if (status === 'PAID' || status === 'DELIVERED') {
    await evaluateSellerIncentivesForOrder(id)
  }

  // Send email on READY
  if (status === 'READY') {
    const order = await prisma.order.findUnique({
      where: { id },
      select: { guestEmail: true, guestName: true, user: { select: { email: true, name: true } } },
    })
    const email = order?.user?.email || order?.guestEmail
    const name = order?.user?.name || order?.guestName || 'Cliente'
    if (email) {
      const template = orderReadyEmail({ customerName: name, orderCode: getOrderDisplayCode(id) })
      sendEmailAsync({ to: email, ...template })
    }
  }

  revalidateOrderViews(id)
}

export async function confirmManualPayment(id: string) {
  await requireAdmin()
  await syncOrderStatusAfterPayment(id)
  await activateZapCreditPlanForOrder(id)
}

export async function finalizeOrderItemUpload(input: {
  orderId: string
  itemId: string
  accessToken?: string
  objectKey: string
  originalName: string
  contentType: string
  sizeBytes: number
}) {
  const item = await findAccessibleOrderItem(input.orderId, input.itemId, input.accessToken, {
    select: {
      id: true,
      orderId: true,
      isService: true,
      designRequested: true,
      fileObjectKey: true,
      order: {
        select: {
          status: true,
        },
      },
    },
  })

  if (!item) {
    throw new Error('No autorizado')
  }

  if (item.designRequested) {
    throw new Error('Este item esta marcado como diseño solicitado.')
  }

  if (item.isService) {
    throw new Error('Este item corresponde a un servicio y no requiere archivo.')
  }

  if (!isArtworkUploadAllowedStatus(item.order.status)) {
    throw new Error('La orden ya no permite cambios de archivos.')
  }

  const expectedPrefix = `orders/${input.orderId}/${input.itemId}/`
  if (!input.objectKey.startsWith(expectedPrefix)) {
    throw new Error('La referencia del archivo es invalida.')
  }

  const objectMetadata = await getR2ObjectMetadata(input.objectKey)
  const persistedContentType = objectMetadata.ContentType || input.contentType
  const persistedSize = Number(objectMetadata.ContentLength ?? input.sizeBytes)

  await prisma.orderItem.update({
    where: { id: input.itemId },
    data: {
      fileUrl: null,
      fileObjectKey: input.objectKey,
      fileOriginalName: sanitizeFileName(input.originalName),
      fileContentType: persistedContentType,
      fileSizeBytes: persistedSize,
      fileUploadedAt: new Date(),
      artworkSubmissionChannel: 'R2',
      designRequested: false,
    },
  })

  if (item.fileObjectKey && item.fileObjectKey !== input.objectKey) {
    try {
      await deleteR2Object(item.fileObjectKey)
    } catch (error) {
      console.error('No se pudo borrar el archivo reemplazado de R2:', error)
    }
  }

  await syncOrderStatusAfterArtworkChange(input.orderId)
}

export async function markOrderItemAsWhatsapp(input: {
  orderId: string
  itemId: string
  accessToken?: string
}) {
  const item = await findAccessibleOrderItem(input.orderId, input.itemId, input.accessToken, {
    select: {
      id: true,
      orderId: true,
      isService: true,
      designRequested: true,
      fileObjectKey: true,
      fileUrl: true,
      order: {
        select: {
          status: true,
        },
      },
    },
  })

  if (!item) {
    throw new Error('No autorizado')
  }

  if (item.designRequested) {
    throw new Error('Este item ya esta marcado para diseño.')
  }

  if (item.isService) {
    throw new Error('Este item corresponde a un servicio y no requiere archivo.')
  }

  if (item.fileObjectKey || item.fileUrl) {
    throw new Error('Este item ya tiene un archivo cargado.')
  }

  if (!isArtworkUploadAllowedStatus(item.order.status)) {
    throw new Error('La orden ya no permite cambios de archivos.')
  }

  await prisma.orderItem.update({
    where: { id: input.itemId },
    data: {
      artworkSubmissionChannel: 'WHATSAPP',
    },
  })

  await syncOrderStatusAfterArtworkChange(input.orderId)
}

export async function addOrderItemBriefReferenceFile(input: {
  orderId: string
  itemId: string
  accessToken?: string
  objectKey: string
  publicUrl: string
  originalName: string
  contentType: string
  sizeBytes: number
}) {
  const item = await findAccessibleOrderItem(input.orderId, input.itemId, input.accessToken, {
    select: {
      id: true,
      orderId: true,
      briefType: true,
      briefReferenceFiles: true,
    },
  })

  if (!item) {
    throw new Error('No autorizado')
  }

  if (!item.briefType || item.briefType === 'NONE') {
    throw new Error('Este item no tiene brief configurado.')
  }

  const expectedPrefix = `orders/${input.orderId}/${input.itemId}/brief/`
  if (!input.objectKey.startsWith(expectedPrefix)) {
    throw new Error('La referencia del archivo es invalida.')
  }

  const currentFiles = Array.isArray(item.briefReferenceFiles) ? item.briefReferenceFiles : []
  const safeFile = {
    url: input.publicUrl,
    objectKey: input.objectKey,
    fileName: sanitizeFileName(input.originalName),
    contentType: input.contentType,
    sizeBytes: input.sizeBytes,
    uploadedAt: new Date().toISOString(),
  }

  await prisma.orderItem.update({
    where: { id: input.itemId },
    data: {
      briefReferenceFiles: [...currentFiles, safeFile],
    },
  })

  revalidateOrderViews(input.orderId)
}
