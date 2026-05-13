'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { createPresignedR2UploadUrl, createPresignedR2DownloadUrl } from '@/lib/r2'
import { revalidatePath } from 'next/cache'
import { sendEmailAsync } from '@/lib/email'
import { proofReadyEmail, proofApprovedEmail } from '@/lib/email-templates'
import { getOrderDisplayCode } from '@/lib/orders-workflow'

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user?.role !== 'ADMIN') throw new Error('No autorizado')
}

export async function getProofUploadUrl(orderId: string, fileName: string, contentType: string) {
  await requireAdmin()

  const objectKey = `proofs/${orderId}/${Date.now()}-${fileName}`
  const uploadUrl = await createPresignedR2UploadUrl({ objectKey, contentType })

  return { uploadUrl, objectKey }
}

export async function createProof(input: {
  orderId: string
  objectKey: string
  fileName: string
  note?: string
}) {
  await requireAdmin()

  const downloadUrl = await createPresignedR2DownloadUrl({
    objectKey: input.objectKey,
    fileName: input.fileName,
  })

  const proof = await prisma.proofFile.create({
    data: {
      orderId: input.orderId,
      fileUrl: downloadUrl,
      fileName: input.fileName,
      objectKey: input.objectKey,
      note: input.note || null,
      status: 'PENDING',
    },
  })

  // Update order status to PROOF_SENT
  await prisma.order.update({
    where: { id: input.orderId },
    data: { status: 'PROOF_SENT' },
  })

  // Log event
  await prisma.orderEvent.create({
    data: {
      orderId: input.orderId,
      status: 'PROOF_SENT',
      note: `Prueba de diseño enviada: ${input.fileName}`,
    },
  })

  // Send email
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    select: { guestEmail: true, guestName: true, user: { select: { email: true, name: true } } },
  })

  const email = order?.user?.email || order?.guestEmail
  const name = order?.user?.name || order?.guestName || 'Cliente'

  if (email) {
    const orderCode = getOrderDisplayCode(input.orderId)
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const template = proofReadyEmail({
      customerName: name,
      orderCode,
      proofNote: input.note,
      reviewUrl: `${baseUrl}/perfil/ordenes`,
    })
    sendEmailAsync({ to: email, ...template })
  }

  revalidatePath(`/admin/ordenes/${input.orderId}`)
  revalidatePath(`/perfil/ordenes/${input.orderId}`)

  return proof
}

export async function reviewProof(input: {
  proofId: string
  status: 'APPROVED' | 'REJECTED'
  reviewNote?: string
}) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('No autorizado')

  const proof = await prisma.proofFile.findUnique({
    where: { id: input.proofId },
    include: {
      order: {
        select: {
          id: true,
          guestEmail: true,
          guestName: true,
          userId: true,
          user: { select: { email: true, name: true } },
        },
      },
    },
  })

  if (!proof) throw new Error('Prueba no encontrada')

  // Verify the user owns this order
  const isOwner = proof.order.userId === session.user.id
  const isAdmin = session.user.role === 'ADMIN'
  if (!isOwner && !isAdmin) throw new Error('No autorizado')

  await prisma.proofFile.update({
    where: { id: input.proofId },
    data: {
      status: input.status,
      reviewedAt: new Date(),
      reviewNote: input.reviewNote || null,
    },
  })

  const orderId = proof.order.id
  const orderCode = getOrderDisplayCode(orderId)
  const email = proof.order.user?.email || proof.order.guestEmail
  const name = proof.order.user?.name || proof.order.guestName || 'Cliente'

  if (input.status === 'APPROVED') {
    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'IN_PRODUCTION' },
    })

    await prisma.orderEvent.create({
      data: {
        orderId,
        status: 'IN_PRODUCTION',
        note: 'Diseño aprobado por el cliente — en producción',
      },
    })

    if (email) {
      const template = proofApprovedEmail({ customerName: name, orderCode })
      sendEmailAsync({ to: email, ...template })
    }
  } else {
    await prisma.orderEvent.create({
      data: {
        orderId,
        status: 'PROOF_SENT',
        note: `Diseño rechazado: ${input.reviewNote || 'sin comentario'}`,
      },
    })
  }

  revalidatePath(`/admin/ordenes/${orderId}`)
  revalidatePath(`/perfil/ordenes/${orderId}`)
}
