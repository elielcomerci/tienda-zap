'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

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
