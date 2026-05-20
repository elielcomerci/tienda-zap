'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { getSellerRankConfig } from '@/lib/seller-commissions'

export async function setRole(userId: string, newRole: 'CUSTOMER' | 'SELLER') {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') throw new Error('Unauthorized')

  await prisma.user.update({
    where: { id: userId },
    data: { role: newRole },
  })

  // Create SellerProfile if becoming a SELLER
  if (newRole === 'SELLER') {
    await prisma.sellerProfile.upsert({
      where: { userId },
      update: { active: true },
      create: { userId, defaultCommissionRate: 10 },
    })
  }

  revalidatePath('/admin/usuarios')
}

export async function toggleBan(userId: string, isBanned: boolean) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') throw new Error('Unauthorized')

  await prisma.user.update({
    where: { id: userId },
    data: { isBanned },
  })

  revalidatePath('/admin/usuarios')
}

export async function updateCommissionRate(userId: string, rate: number) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') throw new Error('Unauthorized')

  await prisma.sellerProfile.update({
    where: { userId },
    data: { defaultCommissionRate: rate },
  })

  revalidatePath('/admin/usuarios')
}

export async function updateSellerProfileSettings(
  userId: string,
  input: {
    status?: 'ACTIVE' | 'RETIRED' | 'SUSPENDED'
    temporaryCommissionRate?: number | null
    temporaryRateExpiresAt?: Date | null
    excludeFromLeaderboards?: boolean
  }
) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') throw new Error('Unauthorized')

  await prisma.sellerProfile.update({
    where: { userId },
    data: {
      status: input.status,
      temporaryCommissionRate: input.temporaryCommissionRate,
      temporaryRateExpiresAt: input.temporaryRateExpiresAt,
      excludeFromLeaderboards: input.excludeFromLeaderboards,
      active: input.status === 'SUSPENDED' ? false : undefined,
    },
  })

  revalidatePath('/admin/usuarios')
  revalidatePath('/seller/dashboard')
}

export async function assignCustomerCommercialOwners(
  userId: string,
  input: {
    sellerId?: string | null
    operationalSellerId?: string | null
  }
) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') throw new Error('Unauthorized')

  await prisma.user.update({
    where: { id: userId },
    data: {
      sellerId: input.sellerId || null,
      operationalSellerId: input.operationalSellerId || null,
    },
  })

  revalidatePath('/admin/usuarios')
  revalidatePath('/seller/clientes')
}

export async function updateSellerRank(userId: string, rank: 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND') {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') throw new Error('Unauthorized')

  const current = await prisma.sellerProfile.findUnique({
    where: { userId },
    select: { rank: true, maxRankAchieved: true },
  })
  const rankConfig = getSellerRankConfig(rank)

  await prisma.sellerProfile.upsert({
    where: { userId },
    update: {
      rank,
      maxRankAchieved:
        current && ['BRONZE', 'SILVER', 'GOLD', 'DIAMOND'].indexOf(rank) >
          ['BRONZE', 'SILVER', 'GOLD', 'DIAMOND'].indexOf(current.maxRankAchieved)
          ? rank
          : current?.maxRankAchieved ?? rank,
      defaultCommissionRate: rankConfig.commissionRate,
    },
    create: {
      userId,
      rank,
      maxRankAchieved: rank,
      defaultCommissionRate: rankConfig.commissionRate,
    },
  })

  await prisma.sellerRankEvent.create({
    data: {
      sellerId: userId,
      fromRank: current?.rank,
      toRank: rank,
      eventType: 'MANUAL_CHANGE',
      reason: 'Cambio manual desde admin.',
      createdById: session.user.id,
    },
  })

  revalidatePath('/admin/usuarios')
  revalidatePath('/seller/dashboard')
}

export async function penalizeSellerRank(
  userId: string,
  rank: 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND',
  reason: string
) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') throw new Error('Unauthorized')

  const trimmedReason = reason.trim()
  if (trimmedReason.length < 10) {
    throw new Error('El motivo de penalizacion debe tener al menos 10 caracteres.')
  }

  const current = await prisma.sellerProfile.findUnique({
    where: { userId },
    select: { rank: true },
  })
  if (!current) throw new Error('El usuario no tiene perfil vendedor.')

  const rankConfig = getSellerRankConfig(rank)
  await prisma.sellerProfile.update({
    where: { userId },
    data: {
      rank,
      defaultCommissionRate: rankConfig.commissionRate,
    },
  })

  await prisma.sellerRankEvent.create({
    data: {
      sellerId: userId,
      fromRank: current.rank,
      toRank: rank,
      eventType: 'PENALTY',
      reason: trimmedReason,
      createdById: session.user.id,
    },
  })

  revalidatePath('/admin/usuarios')
  revalidatePath('/seller/dashboard')
}
