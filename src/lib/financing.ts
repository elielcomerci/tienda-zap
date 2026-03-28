import 'server-only'

import { request as httpsRequest } from 'node:https'
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

type SeriesDataPoint = {
  date: string
  value: number
}

type IndecSeriesCacheEntry = {
  expiresAt: number
  data: SeriesDataPoint[]
}

const INDEC_CACHE_TTL_MS = 24 * 60 * 60 * 1000
const globalForIndecCache = globalThis as typeof globalThis & {
  indecSeriesCache?: Map<string, IndecSeriesCacheEntry>
}
const indecSeriesCache = globalForIndecCache.indecSeriesCache ?? new Map()

globalForIndecCache.indecSeriesCache = indecSeriesCache

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function normalizeIndecSeriesId(seriesId?: string | null) {
  const normalized = seriesId?.trim()
  return normalized || DEFAULT_INDEC_SERIES_ID
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
    .filter((entry): entry is SeriesDataPoint => {
      return Boolean(entry && Number.isFinite(entry.value))
    })
}

function buildIndecCacheKey(searchParams: Record<string, string>) {
  return Object.entries(searchParams)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, value]) => `${key}=${value}`)
    .join('&')
}

function requestIndecPayload(url: URL): Promise<IndecSeriesResponse> {
  return new Promise((resolve, reject) => {
    const request = httpsRequest(
      url,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'zap-tienda/1.0',
        },
      },
      (response) => {
        const chunks: Buffer[] = []

        response.on('data', (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        })

        response.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8')

          if ((response.statusCode ?? 500) < 200 || (response.statusCode ?? 500) >= 300) {
            reject(
              new Error(
                `Respuesta inesperada ${response.statusCode}: ${body.slice(0, 300)}`
              )
            )
            return
          }

          try {
            resolve(JSON.parse(body) as IndecSeriesResponse)
          } catch (error) {
            reject(
              new Error(
                `No pudimos parsear la respuesta del IPC INDEC: ${
                  error instanceof Error ? error.message : 'JSON invalido'
                }`
              )
            )
          }
        })
      }
    )

    request.setTimeout(15000, () => {
      request.destroy(new Error('Timeout consultando IPC INDEC'))
    })

    request.on('error', reject)
    request.end()
  })
}

async function fetchIndecSeriesData(
  searchParams: Record<string, string>
): Promise<SeriesDataPoint[]> {
  const cacheKey = buildIndecCacheKey(searchParams)
  const cachedEntry = indecSeriesCache.get(cacheKey)

  if (cachedEntry && cachedEntry.expiresAt > Date.now()) {
    return cachedEntry.data
  }

  const url = new URL('https://apis.datos.gob.ar/series/api/series')

  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, value)
  }

  const payload = await requestIndecPayload(url)
  const normalizedData = normalizeSeriesData(payload.data || [])

  if (normalizedData.length === 0) {
    console.warn(`La API de IPC INDEC respondio sin datos para ${url.toString()}.`)
  }

  indecSeriesCache.set(cacheKey, {
    expiresAt: Date.now() + INDEC_CACHE_TTL_MS,
    data: normalizedData,
  })

  return normalizedData
}

function buildAverageRateSnapshot(seriesData: SeriesDataPoint[], monthlyRates: number[]) {
  if (seriesData.length === 0 || monthlyRates.length === 0) {
    return null
  }

  const averageRatePercent = roundCurrency(
    monthlyRates.reduce((total, rate) => total + rate, 0) / monthlyRates.length
  )

  return {
    averageRatePercent,
    lastObservationDate: seriesData[seriesData.length - 1]?.date || '',
    monthlyRates,
  } satisfies IndecRateSnapshot
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
  const normalizedSeriesId = normalizeIndecSeriesId(seriesId)

  try {
    const transformedSeriesData = await fetchIndecSeriesData({
      ids: normalizedSeriesId,
      representation_mode: 'percent_change',
      format: 'json',
      metadata: 'none',
      last: '12',
    })

    if (transformedSeriesData.length >= 12) {
      const monthlyRates = transformedSeriesData
        .map((entry) => roundCurrency(entry.value * 100))
        .filter((value) => Number.isFinite(value))

      const transformedSnapshot = buildAverageRateSnapshot(
        transformedSeriesData,
        monthlyRates
      )

      if (transformedSnapshot) {
        return transformedSnapshot
      }
    }

    const fallbackSeriesData = await fetchIndecSeriesData({
      ids: normalizedSeriesId,
      format: 'json',
      metadata: 'none',
      last: '13',
    })

    if (fallbackSeriesData.length < 13) {
      console.warn(
        `No alcanzan los datos del IPC INDEC para calcular el promedio. Serie=${normalizedSeriesId}, transformados=${transformedSeriesData.length}, base=${fallbackSeriesData.length}.`
      )
      return null
    }

    const monthlyRates: number[] = []

    for (let index = 1; index < fallbackSeriesData.length; index += 1) {
      const previousValue = fallbackSeriesData[index - 1]?.value
      const currentValue = fallbackSeriesData[index]?.value

      if (!previousValue || !currentValue) {
        continue
      }

      const variation = ((currentValue - previousValue) / previousValue) * 100
      monthlyRates.push(roundCurrency(variation))
    }

    return buildAverageRateSnapshot(fallbackSeriesData, monthlyRates)
  } catch (error) {
    console.error('No se pudo consultar IPC INDEC:', error)
    return null
  }
}

export async function getFinancingSnapshot() {
  const settings = await getFinancingSettings()
  const normalizedSeriesId = normalizeIndecSeriesId(settings.indecSeriesId)
  let indecRate = await getIndecAverageRatePercent(normalizedSeriesId)

  if (!indecRate && normalizedSeriesId !== DEFAULT_INDEC_SERIES_ID) {
    console.warn(
      `No se pudo leer la serie INDEC configurada (${normalizedSeriesId}). Usando fallback ${DEFAULT_INDEC_SERIES_ID}.`
    )
    indecRate = await getIndecAverageRatePercent(DEFAULT_INDEC_SERIES_ID)
  }

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
  const autoApproved = eligibility.authenticated && !eligibility.hasDelinquency

  return {
    status: autoApproved ? ('APPROVED' as const) : ('QUOTED' as const),
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
      : 'Credito aprobado automaticamente por historial de pagos saludable.',
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
