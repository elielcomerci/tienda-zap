import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export async function evaluateSellerIncentivesForOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { sellerId: true, total: true, status: true },
  })

  if (!order?.sellerId || (order.status !== 'PAID' && order.status !== 'DELIVERED')) return

  const now = new Date()
  const activeIncentives = await prisma.sellerIncentive.findMany({
    where: { active: true, startDate: { lte: now }, endDate: { gte: now } },
  })

  for (const incentive of activeIncentives) {
    const increment = incentive.goalType === 'SALES_COUNT' ? 1 : order.total
    try {
      await prisma.$transaction(async (tx) => {
        const progress = await tx.sellerIncentiveProgress.upsert({
          where: { sellerId_incentiveId: { sellerId: order.sellerId!, incentiveId: incentive.id } },
          update: {},
          create: { sellerId: order.sellerId!, incentiveId: incentive.id, currentValue: 0, completed: false },
        })
        if (progress.completed) return

        // The unique order/incentive pair is the durable idempotency guard.
        // Do not record contributions after the incentive has already completed.
        await tx.sellerIncentiveOrderContribution.create({
          data: { orderId, sellerId: order.sellerId!, incentiveId: incentive.id, amount: increment },
        })

        const updated = await tx.sellerIncentiveProgress.update({
          where: { id: progress.id },
          data: { currentValue: { increment } },
        })
        const completed = updated.currentValue >= incentive.goalTarget
        if (completed) {
          await tx.sellerIncentiveProgress.update({
            where: { id: progress.id },
            data: { completed: true, completedAt: new Date() },
          })
        }
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    } catch (error) {
      // A duplicate contribution means this order already counted for this incentive.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') continue
      throw error
    }
  }
}
