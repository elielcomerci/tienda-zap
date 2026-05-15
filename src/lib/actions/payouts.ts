'use strict'
'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'

export async function createSellerPayout(sellerId: string, amount: number, reference?: string) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    throw new Error('No autorizado')
  }

  if (amount <= 0) {
    throw new Error('El monto debe ser mayor a 0')
  }

  await prisma.sellerPayout.create({
    data: {
      sellerId,
      amount,
      reference,
    }
  })

  revalidatePath('/admin/liquidaciones')
  revalidatePath('/seller/dashboard')
}
