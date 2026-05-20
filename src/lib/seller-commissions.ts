import { prisma } from '@/lib/prisma'

export type SellerRankCode = 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND'

export const SELLER_RANKS: Array<{
  rank: SellerRankCode
  label: string
  commissionRate: number
  threshold: number
}> = [
  { rank: 'BRONZE', label: 'Inicial', commissionRate: 10, threshold: 0 },
  { rank: 'SILVER', label: 'Asociado', commissionRate: 13, threshold: 5_000_000 },
  { rank: 'GOLD', label: 'Senior', commissionRate: 16, threshold: 15_000_000 },
  { rank: 'DIAMOND', label: 'Estrategico', commissionRate: 20, threshold: 40_000_000 },
]

const RANK_INDEX = new Map(SELLER_RANKS.map((rank, index) => [rank.rank, index]))

function getRankIndex(rank: string | null | undefined) {
  return RANK_INDEX.get((rank || 'BRONZE') as SellerRankCode) ?? 0
}

export function getSellerRankConfig(rank: string | null | undefined) {
  return SELLER_RANKS[getRankIndex(rank)]
}

export function getRankForLifetimeRevenue(lifetimeNetRevenue: number) {
  return [...SELLER_RANKS]
    .reverse()
    .find((rank) => lifetimeNetRevenue >= rank.threshold) ?? SELLER_RANKS[0]
}

export function getNextSellerRank(rank: string | null | undefined) {
  const nextIndex = getRankIndex(rank) + 1
  return SELLER_RANKS[nextIndex] ?? null
}

export function getEffectiveCommissionRate(profile: {
  rank?: string | null
  temporaryCommissionRate?: number | null
  temporaryRateExpiresAt?: Date | null
}) {
  if (
    typeof profile.temporaryCommissionRate === 'number' &&
    (!profile.temporaryRateExpiresAt || profile.temporaryRateExpiresAt > new Date())
  ) {
    return profile.temporaryCommissionRate
  }

  return getSellerRankConfig(profile.rank).commissionRate
}

export function getOrderCommissionBase(order: {
  subtotal?: number | null
  discountTotal?: number | null
  total?: number | null
}) {
  const subtotal = typeof order.subtotal === 'number' ? order.subtotal : order.total || 0
  const discountTotal = order.discountTotal || 0
  return Math.max(0, subtotal - discountTotal)
}

async function promoteSellerIfNeeded(tx: any, sellerId: string) {
  const profile = await tx.sellerProfile.findUnique({
    where: { userId: sellerId },
    select: {
      rank: true,
      maxRankAchieved: true,
      lifetimeNetRevenue: true,
    },
  })

  if (!profile) return

  const earnedRank = getRankForLifetimeRevenue(profile.lifetimeNetRevenue)
  if (getRankIndex(earnedRank.rank) <= getRankIndex(profile.rank)) return

  const maxRank =
    getRankIndex(earnedRank.rank) > getRankIndex(profile.maxRankAchieved)
      ? earnedRank.rank
      : profile.maxRankAchieved

  await tx.sellerProfile.update({
    where: { userId: sellerId },
    data: {
      rank: earnedRank.rank,
      maxRankAchieved: maxRank,
      defaultCommissionRate: earnedRank.commissionRate,
    },
  })

  await tx.sellerRankEvent.create({
    data: {
      sellerId,
      fromRank: profile.rank,
      toRank: earnedRank.rank,
      eventType: 'AUTOMATIC_PROMOTION',
      reason: `Ascenso automatico por facturacion historica acumulada de $${profile.lifetimeNetRevenue.toLocaleString('es-AR')}.`,
    },
  })
}

async function upsertOrderLedger(tx: any, input: {
  sellerId: string
  clientId?: string | null
  orderId: string
  type: 'STORE' | 'MANUAL' | 'ROYALTY'
  status: 'PENDING' | 'AVAILABLE'
  baseAmount: number
  commissionRate: number
  rank?: SellerRankCode | null
  notes?: string
}) {
  const existing = await tx.sellerCommissionLedger.findUnique({
    where: {
      sellerId_orderId_type: {
        sellerId: input.sellerId,
        orderId: input.orderId,
        type: input.type,
      },
    },
    select: { id: true, status: true },
  })
  const amount = input.baseAmount * (input.commissionRate / 100)
  const availableAt = input.status === 'AVAILABLE' ? new Date() : null

  if (existing) {
    await tx.sellerCommissionLedger.update({
      where: { id: existing.id },
      data: {
        status: input.status,
        baseAmount: input.baseAmount,
        commissionRate: input.commissionRate,
        amount,
        rank: input.rank,
        notes: input.notes,
        availableAt,
        cancelledAt: null,
      },
    })

    return existing.status !== 'AVAILABLE' && input.status === 'AVAILABLE'
  }

  await tx.sellerCommissionLedger.create({
    data: {
      sellerId: input.sellerId,
      clientId: input.clientId,
      orderId: input.orderId,
      type: input.type,
      status: input.status,
      baseAmount: input.baseAmount,
      commissionRate: input.commissionRate,
      amount,
      rank: input.rank,
      notes: input.notes,
      availableAt,
    },
  })

  return input.status === 'AVAILABLE'
}

async function upsertRecurringLedger(tx: any, input: {
  sellerId: string
  clientId?: string | null
  recurringId: string
  period: string
  type: 'RECURRING' | 'ROYALTY'
  baseAmount: number
  commissionRate: number
  rank?: SellerRankCode | null
  notes?: string
}) {
  const existing = await tx.sellerCommissionLedger.findUnique({
    where: {
      sellerId_recurringId_type_period: {
        sellerId: input.sellerId,
        recurringId: input.recurringId,
        type: input.type,
        period: input.period,
      },
    },
    select: { id: true, status: true },
  })
  const amount = input.baseAmount * (input.commissionRate / 100)
  const availableAt = new Date()

  if (existing) {
    await tx.sellerCommissionLedger.update({
      where: { id: existing.id },
      data: {
        status: 'AVAILABLE',
        baseAmount: input.baseAmount,
        commissionRate: input.commissionRate,
        amount,
        rank: input.rank,
        notes: input.notes,
        availableAt,
        cancelledAt: null,
      },
    })

    return existing.status !== 'AVAILABLE' && existing.status !== 'PAID_OUT'
  }

  await tx.sellerCommissionLedger.create({
    data: {
      sellerId: input.sellerId,
      clientId: input.clientId,
      recurringId: input.recurringId,
      period: input.period,
      type: input.type,
      status: 'AVAILABLE',
      baseAmount: input.baseAmount,
      commissionRate: input.commissionRate,
      amount,
      rank: input.rank,
      notes: input.notes,
      availableAt,
    },
  })

  return true
}

export function getCurrentCommissionPeriod(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export async function syncRecurringSubscriptionCommission(recurringId: string, period = getCurrentCommissionPeriod()) {
  await prisma.$transaction(async (tx) => {
    const recurring = await tx.sellerRecurringSubscription.findUnique({
      where: { id: recurringId },
      include: {
        portfolioSeller: {
          select: {
            id: true,
            role: true,
            sellerProfile: true,
          },
        },
        operationalSeller: {
          select: {
            id: true,
            sellerProfile: true,
          },
        },
      },
    })

    if (!recurring || recurring.status !== 'ACTIVE' || recurring.monthlyAmount <= 0) return

    let profile = recurring.portfolioSeller.sellerProfile
    if (!profile && recurring.portfolioSeller.role === 'ADMIN') {
      profile = await tx.sellerProfile.create({
        data: {
          userId: recurring.portfolioSellerId,
          defaultCommissionRate: 10,
          excludeFromLeaderboards: true,
        },
      })
    }
    if (!profile || !profile.active || profile.status === 'SUSPENDED') return

    let shouldAccumulateRevenue = false

    if (
      profile.status === 'RETIRED' &&
      recurring.operationalSellerId &&
      recurring.operationalSellerId !== recurring.portfolioSellerId
    ) {
      const conqueredRate = getSellerRankConfig(profile.maxRankAchieved).commissionRate
      const splitRate = conqueredRate / 2

      shouldAccumulateRevenue = await upsertRecurringLedger(tx, {
        sellerId: recurring.portfolioSellerId,
        clientId: recurring.clientId,
        recurringId: recurring.id,
        period,
        type: 'ROYALTY',
        baseAmount: recurring.monthlyAmount,
        commissionRate: splitRate,
        rank: profile.maxRankAchieved,
        notes: 'Regalia mensual por cartera retirada.',
      })

      await upsertRecurringLedger(tx, {
        sellerId: recurring.operationalSellerId,
        clientId: recurring.clientId,
        recurringId: recurring.id,
        period,
        type: 'RECURRING',
        baseAmount: recurring.monthlyAmount,
        commissionRate: splitRate,
        rank: profile.maxRankAchieved,
        notes: 'Comision operativa mensual por cartera heredada.',
      })
    } else {
      const commissionRate = getEffectiveCommissionRate(profile)
      shouldAccumulateRevenue = await upsertRecurringLedger(tx, {
        sellerId: recurring.portfolioSellerId,
        clientId: recurring.clientId,
        recurringId: recurring.id,
        period,
        type: 'RECURRING',
        baseAmount: recurring.monthlyAmount,
        commissionRate,
        rank: profile.rank,
      })
    }

    if (shouldAccumulateRevenue) {
      await tx.sellerProfile.update({
        where: { userId: recurring.portfolioSellerId },
        data: {
          lifetimeNetRevenue: { increment: recurring.monthlyAmount },
        },
      })
      await promoteSellerIfNeeded(tx, recurring.portfolioSellerId)
    }
  })
}

export async function syncAllActiveRecurringCommissions(period = getCurrentCommissionPeriod()) {
  const subscriptions = await prisma.sellerRecurringSubscription.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true },
  })

  for (const subscription of subscriptions) {
    await syncRecurringSubscriptionCommission(subscription.id, period)
  }

  return subscriptions.length
}

export async function syncOrderSellerCommissions(orderId: string) {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: {
            id: true,
            operationalSellerId: true,
          },
        },
        seller: {
          select: {
            id: true,
            role: true,
            sellerProfile: true,
          },
        },
      },
    })

    if (!order?.sellerId || !order.seller) return

    if (order.status === 'CANCELLED') {
      await tx.sellerCommissionLedger.updateMany({
        where: { orderId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
      })
      await tx.order.update({
        where: { id: orderId },
        data: { commissionAmount: null },
      })
      return
    }

    const commissionEligibleStatuses = ['PAID', 'PROCESSING', 'IN_PRODUCTION', 'PROOF_SENT', 'READY', 'DELIVERED']
    if (!commissionEligibleStatuses.includes(order.status)) return

    let profile = order.seller.sellerProfile
    if (!profile && order.seller.role === 'ADMIN') {
      profile = await tx.sellerProfile.create({
        data: {
          userId: order.sellerId,
          defaultCommissionRate: 10,
          excludeFromLeaderboards: true,
        },
      })
    }
    if (!profile) return
    if (!profile.active || profile.status === 'SUSPENDED') return

    const baseAmount = getOrderCommissionBase(order)
    if (baseAmount <= 0) return

    const ledgerStatus = order.status === 'DELIVERED' ? 'AVAILABLE' : 'PENDING'
    const type = order.paymentType === 'CASH' ? 'MANUAL' : 'STORE'
    let compatibilityCommissionAmount = 0
    let shouldAccumulateRevenue = false

    if (
      profile.status === 'RETIRED' &&
      order.user?.operationalSellerId &&
      order.user.operationalSellerId !== order.sellerId
    ) {
      const conqueredRate = getSellerRankConfig(profile.maxRankAchieved).commissionRate
      const splitRate = conqueredRate / 2

      shouldAccumulateRevenue = await upsertOrderLedger(tx, {
        sellerId: order.sellerId,
        clientId: order.userId,
        orderId,
        type: 'ROYALTY',
        status: ledgerStatus,
        baseAmount,
        commissionRate: splitRate,
        rank: profile.maxRankAchieved,
        notes: 'Regalia por cartera retirada.',
      })
      compatibilityCommissionAmount = baseAmount * (splitRate / 100)

      await upsertOrderLedger(tx, {
        sellerId: order.user.operationalSellerId,
        clientId: order.userId,
        orderId,
        type,
        status: ledgerStatus,
        baseAmount,
        commissionRate: splitRate,
        rank: profile.maxRankAchieved,
        notes: 'Comision operativa por cartera heredada.',
      })
    } else {
      const commissionRate = getEffectiveCommissionRate(profile)
      shouldAccumulateRevenue = await upsertOrderLedger(tx, {
        sellerId: order.sellerId,
        clientId: order.userId,
        orderId,
        type,
        status: ledgerStatus,
        baseAmount,
        commissionRate,
        rank: profile.rank,
      })
      compatibilityCommissionAmount = baseAmount * (commissionRate / 100)
    }

    if (shouldAccumulateRevenue && order.status === 'DELIVERED') {
      await tx.sellerProfile.update({
        where: { userId: order.sellerId },
        data: {
          lifetimeNetRevenue: { increment: baseAmount },
        },
      })
      await promoteSellerIfNeeded(tx, order.sellerId)
    }

    await tx.order.update({
      where: { id: orderId },
      data: { commissionAmount: compatibilityCommissionAmount },
    })
  })
}
