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
  return 'dia'
}

export default function ZapCreditSimulationCard({
  totalAmount,
  items,
  eligibility,
  isLoading = false,
  compact = false,
  installmentsOverride,
  paymentFrequencyOverride,
  title = 'Simula tu Credito ZAP',
  description = 'La tasa se congela al cerrar la venta y no cambia durante el plan.',
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
        <p className="mt-2 text-sm text-gray-500">Cargando simulacion de financiamiento...</p>
      </div>
    )
  }

  if (!eligibility) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-5">
        <p className="text-sm font-semibold text-red-900">{title}</p>
        <p className="mt-2 text-sm text-red-700">
          No pudimos cargar la simulacion del credito en este momento.
        </p>
      </div>
    )
  }

  const downPaymentPercent = clampCreditDownPaymentPercent(
    calculateWeightedDownPaymentPercent(items) + eligibility.downPaymentPenaltyPercent
  )
  const summary = calculateFinancingPlan({
    baseAmount: totalAmount,
    downPaymentPercent,
    ratePercent: eligibility.effectiveRatePercent,
    installments: installmentsOverride ?? eligibility.defaultInstallments,
    paymentFrequency: paymentFrequencyOverride ?? eligibility.defaultPaymentFrequency,
  })
  const monthlyRatePercent = Math.max(0, eligibility.effectiveRatePercent)
  const nominalAnnualRatePercent = getNominalAnnualRatePercent(monthlyRatePercent)
  const effectiveAnnualRatePercent = getEffectiveAnnualRatePercent(monthlyRatePercent)
  const periodicRatePercent = getPeriodicRatePercent(
    monthlyRatePercent,
    eligibility.defaultPaymentFrequency
  )
  const financedSharePercent = Math.max(0, 100 - summary.downPaymentPercent)

  return (
    <div className="rounded-3xl border border-orange-200 bg-gradient-to-br from-orange-50 via-white to-amber-50 p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
            Credito ZAP
          </p>
          <h3 className="mt-1 text-xl font-black text-gray-900">{title}</h3>
          <p className="mt-2 max-w-2xl text-sm text-gray-600">{description}</p>
        </div>

        <div className="rounded-2xl border border-orange-200 bg-white/80 px-4 py-3 text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Tasa mensual fija
          </p>
          <p className="mt-1 text-2xl font-black text-orange-600">
            {monthlyRatePercent.toLocaleString('es-AR')}%
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/70 bg-white/90 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <CircleDollarSign size={15} className="text-orange-500" />
            Anticipo
          </div>
          <p className="mt-2 text-2xl font-black text-gray-900">
            {formatMoney(summary.downPaymentAmount)}
          </p>
          <p className="mt-1 text-xs text-gray-500">{summary.downPaymentPercent}% del pedido</p>
        </div>

        <div className="rounded-2xl border border-white/70 bg-white/90 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <WalletCards size={15} className="text-orange-500" />
            Saldo financiado
          </div>
          <p className="mt-2 text-2xl font-black text-gray-900">
            {formatMoney(summary.financedAmount)}
          </p>
          <p className="mt-1 text-xs text-gray-500">{financedSharePercent}% del pedido</p>
        </div>

        <div className="rounded-2xl border border-white/70 bg-white/90 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <CalendarClock size={15} className="text-orange-500" />
            Cuota estimada
          </div>
          <p className="mt-2 text-2xl font-black text-gray-900">
            {formatMoney(summary.installmentAmount)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {getPaymentLabel(summary.installments, summary.paymentFrequency)}
          </p>
        </div>

        <div className="rounded-2xl border border-white/70 bg-white/90 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <BadgePercent size={15} className="text-orange-500" />
            Total proyectado
          </div>
          <p className="mt-2 text-2xl font-black text-gray-900">
            {formatMoney(summary.totalRepayable)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Interes estimado {formatMoney(summary.totalInterest)}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-orange-100 bg-white/85 p-4">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-semibold text-gray-900">Composicion del pedido</span>
          <span className="text-gray-500">
            Anticipo {summary.downPaymentPercent}% · Credito {financedSharePercent}%
          </span>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-orange-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500"
            style={{ width: `${summary.downPaymentPercent}%` }}
          />
        </div>
      </div>

      <details
        className="mt-5 overflow-hidden rounded-2xl border border-orange-200 bg-white/70"
        open={!compact}
      >
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-gray-900 marker:hidden">
          Ver detalle de tasas y como calculamos el plan
        </summary>

        <div className="border-t border-orange-100 px-4 pb-4 pt-4">
          <div className="grid gap-3 lg:grid-cols-3">
            <div className="rounded-2xl border border-gray-100 bg-white/90 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Tasa base
              </p>
              <p className="mt-2 text-xl font-black text-gray-900">
                {eligibility.baseRatePercent.toLocaleString('es-AR')}% mensual
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Promedio mensual IPC de los ultimos 12 meses.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white/90 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                TNA estimada
              </p>
              <p className="mt-2 text-xl font-black text-gray-900">
                {nominalAnnualRatePercent.toLocaleString('es-AR')}%
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Equivale a sumar la tasa mensual fija durante 12 meses.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white/90 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                TEA estimada
              </p>
              <p className="mt-2 text-xl font-black text-gray-900">
                {effectiveAnnualRatePercent.toLocaleString('es-AR')}%
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Con capitalizacion mensual y cuota equivalente de{' '}
                {periodicRatePercent.toLocaleString('es-AR')}% por{' '}
                {getPeriodUnitLabel(eligibility.defaultPaymentFrequency)}.
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-dashed border-orange-200 bg-white/70 p-4 text-sm text-gray-700">
            <p className="font-semibold text-gray-900">Como se calcula este plan</p>
            <p className="mt-2">
              1. Se toma el total del carrito y se define el anticipo minimo segun los productos.
            </p>
            <p className="mt-1">
              2. Sobre el saldo restante se aplica una tasa fija mensual cerrada al momento de la
              venta.
            </p>
            <p className="mt-1">
              3. El sistema proyecta {getPaymentLabel(summary.installments, summary.paymentFrequency)}{' '}
              y te muestra el costo final estimado antes de confirmar.
            </p>
          </div>
        </div>
      </details>

      {!eligibility.authenticated && (
        <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          Inicia sesion para solicitar este credito y despues seguir tus cuotas, comprobantes y
          vencimientos desde tu panel.
        </div>
      )}

      {eligibility.hasDelinquency && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Esta simulacion ya incluye el recargo por mora vigente:{' '}
          <strong>+{eligibility.ratePenaltyPercent}%</strong> sobre la tasa y{' '}
          <strong>+{eligibility.downPaymentPenaltyPercent}</strong> puntos sobre el anticipo.
        </div>
      )}
    </div>
  )
}
