'use client'

import {
  BadgePercent,
  CalendarClock,
  CircleDollarSign,
  WalletCards,
} from 'lucide-react'
import {
  calculateFinancingPlan,
  calculateWeightedDownPaymentPercent,
  clampCreditDownPaymentPercent,
  getEffectiveAnnualRatePercent,
  getNominalAnnualRatePercent,
  getPaymentFrequencyLabel,
  getPeriodicRatePercent,
  PaymentFrequency,
} from '@/lib/financing-calculator'
import { CreditEligibilitySnapshot } from '@/lib/use-credit-eligibility'

type CreditSimulationItem = {
  unitPrice: number
  quantity: number
  creditDownPaymentPercent: number
}

function formatMoney(value: number) {
  return `$${value.toLocaleString('es-AR')}`
}

function getPaymentLabel(installments: number, paymentFrequency: PaymentFrequency) {
  const frequencyLabel =
    paymentFrequency === 'MONTHLY'
      ? installments === 1
        ? 'mensual'
        : 'mensuales'
      : paymentFrequency === 'WEEKLY'
        ? installments === 1
          ? 'semanal'
          : 'semanales'
        : installments === 1
          ? 'diario'
          : 'diarios'

  return `${installments} pago${installments === 1 ? '' : 's'} ${frequencyLabel}`
}

function getPeriodUnitLabel(paymentFrequency: PaymentFrequency) {
  if (paymentFrequency === 'MONTHLY') return 'mes'
  if (paymentFrequency === 'WEEKLY') return 'semana'
  return 'día'
}

export default function ZapCreditSimulationCard({
  totalAmount,
  items,
  eligibility,
  isLoading = false,
  compact = false,
  installmentsOverride,
  paymentFrequencyOverride,
  title = 'Simulación Crédito ZAP',
  description = 'Tasa fija al confirmar.',
}: {
  totalAmount: number
  items: CreditSimulationItem[]
  eligibility: CreditEligibilitySnapshot | null
  isLoading?: boolean
  compact?: boolean
  installmentsOverride?: number
  paymentFrequencyOverride?: PaymentFrequency
  title?: string
  description?: string
}) {
  if (isLoading) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-5">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="mt-2 text-sm text-gray-500">Cargando simulación...</p>
      </div>
    )
  }

  if (!eligibility) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-5">
        <p className="text-sm font-semibold text-red-900">{title}</p>
        <p className="mt-2 text-sm text-red-700">No pudimos cargar la simulación.</p>
      </div>
    )
  }

  const downPaymentPercent = clampCreditDownPaymentPercent(
    calculateWeightedDownPaymentPercent(items) + eligibility.downPaymentPenaltyPercent
  )
  const selectedInstallments = installmentsOverride ?? eligibility.defaultInstallments
  const selectedPaymentFrequency =
    paymentFrequencyOverride ?? eligibility.defaultPaymentFrequency
  const summary = calculateFinancingPlan({
    baseAmount: totalAmount,
    downPaymentPercent,
    ratePercent: eligibility.effectiveRatePercent,
    installments: selectedInstallments,
    paymentFrequency: selectedPaymentFrequency,
  })
  const monthlyRatePercent = Math.max(0, eligibility.effectiveRatePercent)
  const nominalAnnualRatePercent = getNominalAnnualRatePercent(monthlyRatePercent)
  const effectiveAnnualRatePercent = getEffectiveAnnualRatePercent(monthlyRatePercent)
  const periodicRatePercent = getPeriodicRatePercent(
    monthlyRatePercent,
    selectedPaymentFrequency
  )
  const financedSharePercent = Math.max(0, 100 - summary.downPaymentPercent)

  return (
    <div className="rounded-3xl border border-[#F66B9A]/25 bg-gradient-to-br from-[#FEF1F6] via-white to-[#F0F5FA] p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#ED2C71]">
            Crédito ZAP
          </p>
          <h3 className="mt-1 break-words text-base font-black text-gray-900 sm:text-lg md:text-xl">
            {title}
          </h3>
          {description && <p className="mt-1 text-sm text-gray-600">{description}</p>}
        </div>

        <div className="shrink-0 rounded-2xl border border-[#F66B9A]/25 bg-white/80 px-3 py-2 text-right">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 sm:text-xs">
            Tasa mensual
          </p>
          <p className="mt-1 text-lg font-black text-[#ED2C71] sm:text-xl md:text-2xl">
            {monthlyRatePercent.toLocaleString('es-AR')}%
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3">
        <div className="rounded-2xl border border-white/70 bg-white/90 p-3 sm:p-4">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 sm:text-xs">
            <CircleDollarSign size={14} className="text-[#ED2C71]" />
            Anticipo
          </div>
          <p className="mt-1.5 break-words text-base font-black text-gray-900 sm:text-lg md:text-xl">
            {formatMoney(summary.downPaymentAmount)}
          </p>
          <p className="mt-0.5 text-[10px] text-gray-500 sm:text-xs">
            {summary.downPaymentPercent}% del pedido
          </p>
        </div>

        <div className="rounded-2xl border border-white/70 bg-white/90 p-3 sm:p-4">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 sm:text-xs">
            <WalletCards size={14} className="text-[#ED2C71]" />
            Financiado
          </div>
          <p className="mt-1.5 break-words text-base font-black text-gray-900 sm:text-lg md:text-xl">
            {formatMoney(summary.financedAmount)}
          </p>
          <p className="mt-0.5 text-[10px] text-gray-500 sm:text-xs">
            {financedSharePercent}% del pedido
          </p>
        </div>

        <div className="rounded-2xl border border-white/70 bg-white/90 p-3 sm:p-4">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 sm:text-xs">
            <CalendarClock size={14} className="text-[#ED2C71]" />
            Cuota
          </div>
          <p className="mt-1.5 break-words text-base font-black text-gray-900 sm:text-lg md:text-xl">
            {formatMoney(summary.installmentAmount)}
          </p>
          <p className="mt-0.5 text-[10px] text-gray-500 sm:text-xs">
            {getPaymentLabel(summary.installments, summary.paymentFrequency)}
          </p>
        </div>

        <div className="rounded-2xl border border-white/70 bg-white/90 p-3 sm:p-4">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 sm:text-xs">
            <BadgePercent size={14} className="text-[#ED2C71]" />
            Total
          </div>
          <p className="mt-1.5 break-words text-base font-black text-gray-900 sm:text-lg md:text-xl">
            {formatMoney(summary.totalRepayable)}
          </p>
          <p className="mt-0.5 text-[10px] text-gray-500 sm:text-xs">
            Interés {formatMoney(summary.totalInterest)}
          </p>
        </div>
      </div>

      {compact ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-[#F66B9A]/25 bg-white/90 px-3 py-1.5 text-xs font-semibold text-[#C91F5B]">
            Anticipo {summary.downPaymentPercent}%
          </span>
          <span className="rounded-full border border-gray-200 bg-white/90 px-3 py-1.5 text-xs font-semibold text-gray-700">
            {summary.installments} pagos {getPaymentFrequencyLabel(summary.paymentFrequency).toLowerCase()}
          </span>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-[#F66B9A]/15 bg-white/85 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="font-semibold text-gray-900">Pedido</span>
            <span className="text-xs text-gray-500 sm:text-sm">
              Anticipo {summary.downPaymentPercent}% / Crédito {financedSharePercent}%
            </span>
          </div>
          <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-[#FEF1F6]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#ED2C71] to-[#4576B9]"
              style={{ width: `${summary.downPaymentPercent}%` }}
            />
          </div>
        </div>
      )}

      <details className="mt-4 overflow-hidden rounded-2xl border border-[#F66B9A]/25 bg-white/70">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-gray-900 marker:hidden">
          Ver detalle técnico
        </summary>

        <div className="border-t border-[#F66B9A]/15 px-4 pb-4 pt-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-gray-100 bg-white/90 p-3 sm:p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Tasa base
              </p>
              <p className="mt-2 break-words text-lg font-black text-gray-900 sm:text-xl">
                {eligibility.baseRatePercent.toLocaleString('es-AR')}%
              </p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white/90 p-3 sm:p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                TNA
              </p>
              <p className="mt-2 break-words text-lg font-black text-gray-900 sm:text-xl">
                {nominalAnnualRatePercent.toLocaleString('es-AR')}%
              </p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white/90 p-3 sm:p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                TEA
              </p>
              <p className="mt-2 break-words text-lg font-black text-gray-900 sm:text-xl">
                {effectiveAnnualRatePercent.toLocaleString('es-AR')}%
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {periodicRatePercent.toLocaleString('es-AR')}% por{' '}
                {getPeriodUnitLabel(summary.paymentFrequency)}
              </p>
            </div>
          </div>
        </div>
      </details>

      {!eligibility.authenticated && (
        <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 sm:p-4 sm:text-sm">
          Iniciá sesión para solicitar el crédito y seguir tus cuotas.
        </div>
      )}

      {eligibility.hasDelinquency && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 sm:p-4 sm:text-sm">
          Incluye recargo por mora: <strong>+{eligibility.ratePenaltyPercent}%</strong> tasa y{' '}
          <strong>+{eligibility.downPaymentPenaltyPercent}</strong> puntos de anticipo.
        </div>
      )}
    </div>
  )
}
