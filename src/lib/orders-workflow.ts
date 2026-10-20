import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { orderItemIsProductionReady } from '@/lib/order-files'
import { confirmCouponRedemptionForOrder } from '@/lib/coupons'
import { evaluateSellerIncentivesForOrder } from '@/lib/incentives-evaluator'
import { sendEmailAsync } from '@/lib/email'
import { paymentConfirmedEmail, orderReadyEmail } from '@/lib/email-templates'
import { syncOrderSellerCommissions } from '@/lib/seller-commissions'

export function getOrderDisplayCode(orderId: string) {
  return orderId.slice(-8).toUpperCase()
}

export function revalidateOrderViews(orderId: string) {
  revalidatePath('/admin')
  revalidatePath('/admin/ordenes')
  revalidatePath(`/admin/ordenes/${orderId}`)
  revalidatePath('/perfil')
  revalidatePath(`/perfil/ordenes/${orderId}`)
  revalidatePath('/checkout/success')
}

function allItemsReadyForProduction(items: Array<{
  designRequested?: boolean | null
  fileObjectKey?: string | null
  fileUrl?: string | null
}>) {
  return items.length > 0 && items.every(orderItemIsProductionReady)
}

export async function syncOrderStatusAfterPayment(orderId: string, paymentId?: string | null) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      items: { select: { designRequested: true, fileObjectKey: true, fileUrl: true } },
    },
  })

  if (!order) throw new Error('Orden no encontrada')

  const confirmationKey = `payment-confirmed:${orderId}:${paymentId || 'manual'}`
  let resultingStatus = order.status

  // Only advance a pending order. Recovery must never roll back a later status.
  if (order.status === 'PENDING') {
    resultingStatus = allItemsReadyForProduction(order.items) ? 'PROCESSING' : 'PAID'
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.order.updateMany({
        where: { id: orderId, status: 'PENDING' },
        data: { status: resultingStatus, ...(paymentId ? { paymentId } : {}) },
      })
      if (claimed.count === 0) {
        const current = await tx.order.findUnique({ where: { id: orderId }, select: { status: true } })
        if (!current) throw new Error('Orden no encontrada')
        resultingStatus = current.status
      }
    })
  }

  // Unique idempotency key allows a retry to repair a missing event without duplicates.
  await prisma.orderEvent.upsert({
    where: { idempotencyKey: confirmationKey },
    create: { orderId, status: resultingStatus, note: 'Pago confirmado', idempotencyKey: confirmationKey },
    update: {},
  })

  const orderData = await prisma.order.findUnique({
    where: { id: orderId },
    select: { guestEmail: true, guestName: true, user: { select: { email: true, name: true } } },
  })
  const email = orderData?.user?.email || orderData?.guestEmail
  const name = orderData?.user?.name || orderData?.guestName || 'Cliente'
  if (email) {
    const template = paymentConfirmedEmail({ customerName: name, orderCode: getOrderDisplayCode(orderId) })
    sendEmailAsync({ to: email, ...template, idempotencyKey: confirmationKey })
  }

  await confirmCouponRedemptionForOrder(orderId)
  await syncOrderSellerCommissions(orderId)
  await evaluateSellerIncentivesForOrder(orderId)
  revalidateOrderViews(orderId)
  return resultingStatus
}

export async function syncOrderStatusAfterArtworkChange(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      items: {
        select: {
          designRequested: true,
          fileObjectKey: true,
          fileUrl: true,
        },
      },
    },
  })

  if (!order) {
    throw new Error('Orden no encontrada')
  }

  if (['CANCELLED', 'READY', 'DELIVERED', 'PROOF_SENT', 'IN_PRODUCTION'].includes(order.status)) {
    return order.status
  }

  const readyForProduction = allItemsReadyForProduction(order.items)
  const nextStatus =
    order.status === 'PAID' && readyForProduction ? 'PROCESSING' : order.status

  if (nextStatus !== order.status) {
    await prisma.order.update({
      where: { id: orderId },
      data: { status: nextStatus },
    })
  }

  revalidateOrderViews(orderId)
  return nextStatus
}
