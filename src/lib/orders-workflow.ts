import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { orderItemIsProductionReady } from '@/lib/order-files'

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
  isService?: boolean | null
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
      items: {
        select: {
          isService: true,
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

  const nextStatus = allItemsReadyForProduction(order.items) ? 'PROCESSING' : 'PAID'

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: nextStatus,
      ...(paymentId ? { paymentId } : {}),
    },
  })

  revalidateOrderViews(orderId)
  return nextStatus
}

export async function syncOrderStatusAfterArtworkChange(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      items: {
        select: {
          isService: true,
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

  if (['CANCELLED', 'READY', 'DELIVERED'].includes(order.status)) {
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
