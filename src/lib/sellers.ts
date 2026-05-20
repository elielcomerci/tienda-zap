import { prisma } from '@/lib/prisma'

export async function getActiveSellerById(sellerId?: string | null) {
  if (!sellerId) return null

  return prisma.user.findFirst({
    where: {
      id: sellerId,
      role: { in: ['SELLER', 'ADMIN'] },
      isBanned: false,
      OR: [
        { role: 'ADMIN' },
        { sellerProfile: { active: true, status: 'ACTIVE' } },
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  })
}

export async function resolveActiveSellerId(sellerId?: string | null) {
  const seller = await getActiveSellerById(sellerId)
  return seller?.id ?? null
}
