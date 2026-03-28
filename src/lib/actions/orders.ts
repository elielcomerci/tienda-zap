'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { findAccessibleOrder, findAccessibleOrderItem } from '@/lib/order-access'
import { activateZapCreditPlanForOrder } from '@/lib/actions/credits'
import { deleteR2Object, getR2ObjectMetadata } from '@/lib/r2'
import {
  isArtworkUploadAllowedStatus,
  sanitizeFileName,
} from '@/lib/order-files'
import {
  revalidateOrderViews,
  syncOrderStatusAfterArtworkChange,
  syncOrderStatusAfterPayment,
} from '@/lib/orders-workflow'

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
    throw new Error('Este item esta marcado como diseno solicitado.')
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
    throw new Error('Este item ya esta marcado para diseno.')
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
