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

  const availableLedgers = await prisma.sellerCommissionLedger.findMany({
    where: {
      sellerId,
      status: 'AVAILABLE',
    },
    select: { id: true, amount: true },
    orderBy: { availableAt: 'asc' },
  })
  const availableBalance = availableLedgers.reduce((total, ledger) => total + ledger.amount, 0)

  if (amount > availableBalance) {
    throw new Error('El monto supera el saldo disponible del vendedor.')
  }

  if (Math.abs(amount - availableBalance) > 0.01) {
    throw new Error('Por ahora las liquidaciones deben cerrar el saldo completo de comisiones disponibles.')
  }

  await prisma.$transaction(async (tx) => {
    const payout = await tx.sellerPayout.create({
      data: {
        sellerId,
        amount,
        reference,
      }
    })

    await tx.sellerCommissionLedger.updateMany({
      where: {
        id: { in: availableLedgers.map((ledger) => ledger.id) },
      },
      data: {
        status: 'PAID_OUT',
        payoutId: payout.id,
        paidOutAt: new Date(),
      },
    })
  })

  revalidatePath('/admin/liquidaciones')
  revalidatePath('/seller/dashboard')
}
