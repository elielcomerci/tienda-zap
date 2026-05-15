import { prisma } from '@/lib/prisma'

export async function evaluateSellerIncentivesForOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { sellerId: true, total: true, status: true }
  })

  if (!order || !order.sellerId) return
  if (order.status !== 'PAID' && order.status !== 'DELIVERED') return

  const now = new Date()
  const activeIncentives = await prisma.sellerIncentive.findMany({
    where: {
      active: true,
      startDate: { lte: now },
      endDate: { gte: now },
    }
  })

  for (const incentive of activeIncentives) {
    const progress = await prisma.sellerIncentiveProgress.upsert({
      where: {
        sellerId_incentiveId: {
          sellerId: order.sellerId,
          incentiveId: incentive.id
        }
      },
      update: {},
      create: {
        sellerId: order.sellerId,
        incentiveId: incentive.id,
        currentValue: 0,
        completed: false
      }
    })

    if (progress.completed) continue

    const increment = incentive.goalType === 'SALES_COUNT' ? 1 : order.total
    const newValue = progress.currentValue + increment
    const completed = newValue >= incentive.goalTarget

    await prisma.sellerIncentiveProgress.update({
      where: { id: progress.id },
      data: {
        currentValue: newValue,
        completed,
        completedAt: completed ? new Date() : null
      }
    })
  }
}
