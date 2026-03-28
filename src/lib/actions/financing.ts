'use server'

import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import {
  PAYMENT_FREQUENCIES,
  PaymentFrequency,
  calculateFinancingPlan,
  calculateWeightedDownPaymentPercent,
} from '@/lib/financing-calculator'
import { getFinancingSnapshot } from '@/lib/financing'

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user?.role !== 'ADMIN') {
    throw new Error('No autorizado')
  }
}

function parsePositiveInteger(value: unknown, fieldLabel: string, options?: { min?: number; max?: number }) {
  const parsedValue = Number(value)

  if (!Number.isInteger(parsedValue)) {
    throw new Error(`${fieldLabel} debe ser un numero entero.`)
  }

  if (options?.min != null && parsedValue < options.min) {
    throw new Error(`${fieldLabel} debe ser mayor o igual a ${options.min}.`)
  }

  if (options?.max != null && parsedValue > options.max) {
    throw new Error(`${fieldLabel} debe ser menor o igual a ${options.max}.`)
  }

  return parsedValue
}

function parseOptionalNonNegativeNumber(value: unknown, fieldLabel: string) {
  if (value == null || String(value).trim() === '') {
    return null
  }

  const parsedValue = Number(value)

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    throw new Error(`${fieldLabel} debe ser un numero valido mayor o igual a 0.`)
  }

  return parsedValue
}

function assertPaymentFrequency(value: string): PaymentFrequency {
  if (!PAYMENT_FREQUENCIES.includes(value as PaymentFrequency)) {
    throw new Error('La frecuencia de pago seleccionada no es valida.')
  }

  return value as PaymentFrequency
}

function isSameRate(left: number, right: number) {
  return Math.abs(left - right) < 0.01
}

export async function saveFinancingSettings(formData: FormData) {
  await requireAdmin()

  const indecSeriesId = String(formData.get('indecSeriesId') || '').trim() || '101.1_I2NG_2016_M_22'
  const manualRatePercent = parseOptionalNonNegativeNumber(
    formData.get('manualRatePercent'),
    'La tasa manual'
  )
  const defaultInstallments = parsePositiveInteger(
    formData.get('defaultInstallments'),
    'Las cuotas por defecto',
    { min: 1, max: 36 }
  )
  const defaultPaymentFrequency = assertPaymentFrequency(
    String(formData.get('defaultPaymentFrequency') || 'MONTHLY')
  )
  const cardInstallments = parsePositiveInteger(
    formData.get('cardInstallments'),
    'Las cuotas con tarjeta',
    { min: 1, max: 6 }
  )

  await prisma.financingSettings.upsert({
    where: { id: 'default' },
    update: {
      indecSeriesId,
      manualRatePercent,
      defaultInstallments,
      defaultPaymentFrequency,
      cardInstallments,
    },
    create: {
      id: 'default',
      indecSeriesId,
      manualRatePercent,
      defaultInstallments,
      defaultPaymentFrequency,
      cardInstallments,
    },
  })

  revalidatePath('/admin/financiacion')
  revalidatePath('/admin/ordenes')
  revalidatePath('/checkout')
  revalidatePath('/productos')
  revalidatePath('/')
}

export async function saveOrderZapCreditPlan(input: {
  orderId: string
  ratePercent: number
  installments: number
  paymentFrequency: PaymentFrequency
  firstDueDate?: string
  notes?: string
}) {
  await requireAdmin()

  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    select: {
      id: true,
      total: true,
      paymentType: true,
      items: {
        select: {
          quantity: true,
          unitPrice: true,
          creditDownPaymentPercent: true,
        },
      },
    },
  })

  if (!order) {
    throw new Error('La orden no existe.')
  }

  if (order.paymentType !== 'ZAP_CREDIT') {
    throw new Error('Solo podes guardar una propuesta sobre ordenes de Credito ZAP.')
  }

  const ratePercent = parseOptionalNonNegativeNumber(input.ratePercent, 'La tasa') ?? 0
  const installments = parsePositiveInteger(input.installments, 'Las cuotas', {
    min: 1,
    max: 60,
  })
  const paymentFrequency = assertPaymentFrequency(input.paymentFrequency)
  const firstDueDate = input.firstDueDate ? new Date(input.firstDueDate) : undefined

  if (firstDueDate && Number.isNaN(firstDueDate.getTime())) {
    throw new Error('La fecha de la primera cuota no es valida.')
  }

  const financingSnapshot = await getFinancingSnapshot()
  const downPaymentPercent = calculateWeightedDownPaymentPercent(order.items)
  const summary = calculateFinancingPlan({
    baseAmount: order.total,
    downPaymentPercent,
    ratePercent,
    installments,
    paymentFrequency,
    firstDueDate,
  })

  const rateSource = isSameRate(ratePercent, financingSnapshot.effectiveRatePercent)
    ? financingSnapshot.rateSource
    : 'CUSTOM'

  await prisma.zapCreditPlan.upsert({
    where: { orderId: order.id },
    update: {
      status: 'QUOTED',
      rateSource,
      indecAveragePercent: financingSnapshot.indecRate?.averageRatePercent ?? null,
      ratePercent: summary.ratePercent,
      installments: summary.installments,
      paymentFrequency: summary.paymentFrequency,
      firstDueDate: summary.firstDueDate,
      baseAmount: summary.baseAmount,
      downPaymentPercent: summary.downPaymentPercent,
      downPaymentAmount: summary.downPaymentAmount,
      financedAmount: summary.financedAmount,
      installmentAmount: summary.installmentAmount,
      totalRepayable: summary.totalRepayable,
      totalInterest: summary.totalInterest,
      notes: input.notes?.trim() || null,
      quotedAt: new Date(),
    },
    create: {
      orderId: order.id,
      status: 'QUOTED',
      rateSource,
      indecAveragePercent: financingSnapshot.indecRate?.averageRatePercent ?? null,
      ratePercent: summary.ratePercent,
      installments: summary.installments,
      paymentFrequency: summary.paymentFrequency,
      firstDueDate: summary.firstDueDate,
      baseAmount: summary.baseAmount,
      downPaymentPercent: summary.downPaymentPercent,
      downPaymentAmount: summary.downPaymentAmount,
      financedAmount: summary.financedAmount,
      installmentAmount: summary.installmentAmount,
      totalRepayable: summary.totalRepayable,
      totalInterest: summary.totalInterest,
      notes: input.notes?.trim() || null,
      quotedAt: new Date(),
    },
  })

  revalidatePath('/admin/financiacion')
  revalidatePath('/admin/ordenes')
  revalidatePath(`/admin/ordenes/${order.id}`)
  revalidatePath('/checkout/success')
}
