import 'server-only'

import { prisma } from '@/lib/prisma'
import {
  PaymentFrequency,
  calculateFinancingPlan,
  calculateWeightedDownPaymentPercent,
  clampCreditDownPaymentPercent,
} from '@/lib/financing-calculator'

const DEFAULT_FINANCING_SETTINGS_ID = 'default'
const DEFAULT_INDEC_SERIES_ID = '101.1_I2NG_2016_M_22'

type IndecSeriesResponse = {
  data?: unknown[]
}

type IndecRateSnapshot = {
  averageRatePercent: number
  lastObservationDate: string
  monthlyRates: number[]
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function normalizeSeriesData(data: unknown[]) {
  return data
    .map((entry) => {
      if (Array.isArray(entry) && entry.length >= 2) {
        return {
          date: String(entry[0]),
          value: Number(entry[1]),
        }
      }

      if (entry && typeof entry === 'object') {
        const record = entry as Record<string, unknown>
        const date = record.indice_tiempo ?? record.date ?? record.fecha
        const value = record.valor ?? record.value

        if (date != null && value != null) {
          return {
            date: String(date),
            value: Number(value),
          }
        }
      }

      return null
    })
    .filter((entry): entry is { date: string; value: number } => {
      return Boolean(entry && Number.isFinite(entry.value))
    })
}

function getDefaultFirstDueDate(paymentFrequency: PaymentFrequency) {
  const now = new Date()

  if (paymentFrequency === 'DAILY') {
    now.setDate(now.getDate() + 1)
    return now
  }

  if (paymentFrequency === 'WEEKLY') {
    now.setDate(now.getDate() + 7)
    return now
  }

  now.setMonth(now.getMonth() + 1)
  return now
}

export async function getFinancingSettings() {
  return prisma.financingSettings.upsert({
    where: { id: DEFAULT_FINANCING_SETTINGS_ID },
    update: {},
    create: {
      id: DEFAULT_FINANCING_SETTINGS_ID,
      indecSeriesId: DEFAULT_INDEC_SERIES_ID,
    },
  })
}

export async function getIndecAverageRatePercent(
  seriesId = DEFAULT_INDEC_SERIES_ID
): Promise<IndecRateSnapshot | null> {
  try {
    const url = new URL('https://apis.datos.gob.ar/series/api/series')
    url.searchParams.set('ids', seriesId)
    url.searchParams.set('format', 'json')
    url.searchParams.set('last', '13')

    const response = await fetch(url.toString(), {
      next: { revalidate: 60 * 60 * 24 },
    })

    if (!response.ok) {
      throw new Error(`Respuesta inesperada ${response.status}`)
    }

    const payload = (await response.json()) as IndecSeriesResponse
    const seriesData = normalizeSeriesData(payload.data || [])

    if (seriesData.length < 13) {
      return null
    }

    const monthlyRates: number[] = []

    for (let index = 1; index < seriesData.length; index += 1) {
      const previousValue = seriesData[index - 1]?.value
      const currentValue = seriesData[index]?.value

      if (!previousValue || !currentValue) {
        continue
      }

      const variation = ((currentValue - previousValue) / previousValue) * 100
      monthlyRates.push(roundCurrency(variation))
    }

    if (monthlyRates.length === 0) {
      return null
    }

    const averageRatePercent = roundCurrency(
      monthlyRates.reduce((total, rate) => total + rate, 0) / monthlyRates.length
    )

    return {
      averageRatePercent,
      lastObservationDate: seriesData[seriesData.length - 1]?.date || '',
      monthlyRates,
    }
  } catch (error) {
    console.error('No se pudo consultar IPC INDEC:', error)
    return null
  }
}

export async function getFinancingSnapshot() {
  const settings = await getFinancingSettings()
  const indecRate = await getIndecAverageRatePercent(settings.indecSeriesId)

  if (settings.manualRatePercent != null) {
    return {
      settings,
      indecRate,
      effectiveRatePercent: settings.manualRatePercent,
      rateSource: 'MANUAL_OVERRIDE' as const,
    }
  }

  if (indecRate) {
    return {
      settings,
      indecRate,
      effectiveRatePercent: indecRate.averageRatePercent,
      rateSource: 'INDEC_AVERAGE' as const,
    }
  }

  return {
    settings,
    indecRate,
    effectiveRatePercent: 0,
    rateSource: 'CUSTOM' as const,
  }
}

export async function getCreditEligibilityForUser(userId?: string | null) {
  const financingSnapshot = await getFinancingSnapshot()

  if (!userId) {
    return {
      authenticated: false,
      canRequestCredit: false,
      activeCreditsCount: 0,
      overdueInstallmentsCount: 0,
      hasDelinquency: false,
      effectiveRatePercent: financingSnapshot.effectiveRatePercent,
      baseRatePercent: financingSnapshot.effectiveRatePercent,
      ratePenaltyPercent: 0,
      downPaymentPenaltyPercent: 0,
    }
  }

  const [activeCreditsCount, overdueInstallmentsCount] = await Promise.all([
    prisma.zapCreditPlan.count({
      where: {
        order: { userId },
        status: { in: ['QUOTED', 'APPROVED', 'ACTIVE'] },
      },
    }),
    prisma.zapCreditInstallment.count({
      where: {
        dueDate: { lt: new Date() },
        status: { in: ['PENDING', 'REJECTED'] },
        plan: {
          status: { in: ['APPROVED', 'ACTIVE'] },
          order: { userId },
        },
      },
    }),
  ])

  const hasDelinquency = overdueInstallmentsCount > 0
  const ratePenaltyPercent = hasDelinquency
    ? financingSnapshot.settings.delinquentRatePenaltyPercent
    : 0
  const downPaymentPenaltyPercent = hasDelinquency
    ? financingSnapshot.settings.delinquentDownPaymentPenaltyPercent
    : 0

  return {
    authenticated: true,
    canRequestCredit: true,
    activeCreditsCount,
    overdueInstallmentsCount,
    hasDelinquency,
    effectiveRatePercent: financingSnapshot.effectiveRatePercent + ratePenaltyPercent,
    baseRatePercent: financingSnapshot.effectiveRatePercent,
    ratePenaltyPercent,
    downPaymentPenaltyPercent,
  }
}

export async function buildDraftZapCreditPlan(input: {
  baseAmount: number
  userId?: string | null
  items: Array<{
    unitPrice: number
    quantity: number
    creditDownPaymentPercent: number
  }>
}) {
  const { settings, indecRate, effectiveRatePercent, rateSource } =
    await getFinancingSnapshot()
  const eligibility = await getCreditEligibilityForUser(input.userId)

  const downPaymentPercent = clampCreditDownPaymentPercent(
    calculateWeightedDownPaymentPercent(input.items) + eligibility.downPaymentPenaltyPercent
  )
  const firstDueDate = getDefaultFirstDueDate(
    settings.defaultPaymentFrequency as PaymentFrequency
  )
  const summary = calculateFinancingPlan({
    baseAmount: input.baseAmount,
    downPaymentPercent,
    ratePercent: eligibility.effectiveRatePercent || effectiveRatePercent,
    installments: settings.defaultInstallments,
    paymentFrequency: settings.defaultPaymentFrequency as PaymentFrequency,
    firstDueDate,
  })

  return {
    status: 'REQUESTED' as const,
    rateSource: eligibility.ratePenaltyPercent > 0 ? 'CUSTOM' : rateSource,
    indecAveragePercent: indecRate?.averageRatePercent ?? null,
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
    notes: eligibility.hasDelinquency
      ? `Cliente con mora activa: recargo +${eligibility.ratePenaltyPercent}% y anticipo +${eligibility.downPaymentPenaltyPercent} puntos.`
      : null,
    scheduleItems:
      summary.schedule.length > 0
        ? {
            create: summary.schedule.map((item) => ({
              sequence: item.installmentNumber,
              dueDate: item.dueDate,
              amount: item.amount,
              principalAmount: item.principalAmount,
              interestAmount: item.interestAmount,
              balanceAfter: item.balanceAfter,
              status: 'PENDING' as const,
            })),
          }
        : undefined,
  }
}
