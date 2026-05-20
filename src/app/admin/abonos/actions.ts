'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import {
  getCurrentCommissionPeriod,
  syncAllActiveRecurringCommissions,
  syncRecurringSubscriptionCommission,
} from '@/lib/seller-commissions'
import { revalidatePath } from 'next/cache'

type CreateRecurringSubscriptionInput = {
  clientId: string
  portfolioSellerId: string
  operationalSellerId?: string | null
  name: string
  monthlyAmount: number
  dueDay: number
  notes?: string | null
}

async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    throw new Error('No autorizado')
  }
  return session
}

export async function createRecurringSubscription(input: CreateRecurringSubscriptionInput) {
  await requireAdmin()

  const name = input.name.trim()
  if (!name) throw new Error('El nombre del abono es obligatorio.')
  if (!input.clientId) throw new Error('Selecciona un cliente.')
  if (!input.portfolioSellerId) throw new Error('Selecciona un asesor titular.')
  if (!Number.isFinite(input.monthlyAmount) || input.monthlyAmount <= 0) {
    throw new Error('El monto mensual debe ser mayor a 0.')
  }
  if (!Number.isInteger(input.dueDay) || input.dueDay < 1 || input.dueDay > 28) {
    throw new Error('El dia de vencimiento debe estar entre 1 y 28.')
  }

  await prisma.sellerRecurringSubscription.create({
    data: {
      clientId: input.clientId,
      portfolioSellerId: input.portfolioSellerId,
      operationalSellerId: input.operationalSellerId || null,
      name,
      monthlyAmount: input.monthlyAmount,
      dueDay: input.dueDay,
      notes: input.notes?.trim() || null,
    },
  })

  revalidatePath('/admin/abonos')
  revalidatePath('/seller/dashboard')
}

export async function updateRecurringSubscriptionStatus(
  id: string,
  status: 'ACTIVE' | 'PAUSED' | 'CANCELLED'
) {
  await requireAdmin()

  await prisma.sellerRecurringSubscription.update({
    where: { id },
    data: {
      status,
      pausedAt: status === 'PAUSED' ? new Date() : null,
      cancelledAt: status === 'CANCELLED' ? new Date() : null,
    },
  })

  revalidatePath('/admin/abonos')
  revalidatePath('/seller/dashboard')
}

export async function generateRecurringCommission(id: string) {
  await requireAdmin()

  await syncRecurringSubscriptionCommission(id, getCurrentCommissionPeriod())

  revalidatePath('/admin/abonos')
  revalidatePath('/admin/liquidaciones')
  revalidatePath('/seller/dashboard')
}

export async function generateAllRecurringCommissions() {
  await requireAdmin()

  const count = await syncAllActiveRecurringCommissions(getCurrentCommissionPeriod())

  revalidatePath('/admin/abonos')
  revalidatePath('/admin/liquidaciones')
  revalidatePath('/seller/dashboard')

  return count
}
