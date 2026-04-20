'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  CalendarClock,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Gauge,
  Repeat,
  SlidersHorizontal,
} from 'lucide-react'
import ZapCreditSimulationCard from '@/components/public/ZapCreditSimulationCard'
import {
  clampInstallmentsForFrequency,
  CREDIT_INSTALLMENT_LIMITS,
  PaymentFrequency,
  getPaymentFrequencyLabel,
} from '@/lib/financing-calculator'
import { CreditEligibilitySnapshot } from '@/lib/use-credit-eligibility'

type CreditSimulationItem = {
  unitPrice: number
  quantity: number
  creditDownPaymentPercent: number
}

type ZapCreditSelection = {
  installments: number
  paymentFrequency: PaymentFrequency
}

function getSuggestedInstallments(paymentFrequency: PaymentFrequency) {
  if (paymentFrequency === 'MONTHLY') return [3, 6, 9, 12]
  if (paymentFrequency === 'WEEKLY') return [4, 8, 12, 18, 26]
  return [7, 15, 30, 45, 60, 90]
}

function getEstimatedFirstDueDate(paymentFrequency: PaymentFrequency) {
  const date = new Date()

  if (paymentFrequency === 'DAILY') {
    date.setDate(date.getDate() + 1)
    return date
  }

  if (paymentFrequency === 'WEEKLY') {
    date.setDate(date.getDate() + 7)
    return date
  }

  date.setMonth(date.getMonth() + 1)
  return date
}

export default function CheckoutZapCreditConfigurator({
  totalAmount,
  items,
  eligibility,
  isLoading = false,
  minimumDownPaymentAmount,
  minimumDownPaymentPercent,
  onChange,
}: {
  totalAmount: number
  items: CreditSimulationItem[]
  eligibility: CreditEligibilitySnapshot | null
  isLoading?: boolean
  minimumDownPaymentAmount: number
  minimumDownPaymentPercent: number
  onChange: (selection: ZapCreditSelection | null) => void
}) {
  const [paymentFrequency, setPaymentFrequency] = useState<PaymentFrequency>('MONTHLY')
  const [installments, setInstallments] = useState(6)
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    if (!eligibility) {
      onChange(null)
      return
    }

    const nextFrequency = eligibility.defaultPaymentFrequency
    const nextInstallments = clampInstallmentsForFrequency(
      eligibility.defaultInstallments,
      nextFrequency
    )

    setPaymentFrequency(nextFrequency)
    setInstallments(nextInstallments)
    setShowAdvanced(false)
    onChange({
      installments: nextInstallments,
      paymentFrequency: nextFrequency,
    })
  }, [eligibility, onChange])

  useEffect(() => {
    if (!eligibility) return

    const normalizedInstallments = clampInstallmentsForFrequency(
      installments,
      paymentFrequency
    )

    if (normalizedInstallments !== installments) {
      setInstallments(normalizedInstallments)
      return
    }

    onChange({
      installments: normalizedInstallments,
      paymentFrequency,
    })
  }, [eligibility, installments, onChange, paymentFrequency])

  const installmentLimits = CREDIT_INSTALLMENT_LIMITS[paymentFrequency]
  const firstDueDate = useMemo(
    () => getEstimatedFirstDueDate(paymentFrequency),
    [paymentFrequency]
  )

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-orange-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
              Plan sugerido
            </p>
            <h3 className="mt-1 text-xl font-black text-gray-900">
              Arma el plan sin salirte del checkout
            </h3>
            <p className="mt-2 max-w-2xl text-sm text-gray-600">
              {eligibility?.hasDelinquency
                ? 'Ya aplicamos las condiciones vigentes a tu simulacion para que arranques con un plan realista.'
                : 'Mostramos anticipo, cuota y total estimado primero. El resto queda disponible solo si quieres revisarlo.'}
            </p>
          </div>

          <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 lg:min-w-[220px] lg:text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">
              Anticipo minimo estimado
            </p>
            <p className="mt-1 text-2xl font-black text-orange-600">
              ${minimumDownPaymentAmount.toLocaleString('es-AR')}
            </p>
            <p className="text-xs text-orange-700">{minimumDownPaymentPercent}% del pedido</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-800">
            {installments} pagos {getPaymentFrequencyLabel(paymentFrequency).toLowerCase()}
          </span>
          {eligibility && (
            <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700">
              Tasa {eligibility.effectiveRatePercent.toLocaleString('es-AR')}% mensual fija
            </span>
          )}
          <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700">
            Primer vencimiento estimado {firstDueDate.toLocaleDateString('es-AR')}
          </span>
        </div>

        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-gray-100 bg-gray-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">Queres afinar el plan?</p>
            <p className="mt-1 text-sm text-gray-600">
              Podes cambiar frecuencia y cantidad de pagos. La tasa y el anticipo minimo quedan fijos.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced((current) => !current)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-sm font-semibold text-orange-700 transition-colors hover:border-orange-300 hover:bg-orange-50"
          >
            <SlidersHorizontal size={16} />
            {showAdvanced ? 'Ocultar personalizacion' : 'Personalizar mi plan'}
            {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {showAdvanced && (
          <div className="mt-5 space-y-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <Repeat size={15} className="text-orange-500" />
                  Frecuencia de pago
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {(['MONTHLY', 'WEEKLY', 'DAILY'] as PaymentFrequency[]).map((frequency) => {
                    const selected = paymentFrequency === frequency
                    return (
                      <button
                        key={frequency}
                        type="button"
                        onClick={() => setPaymentFrequency(frequency)}
                        className={`rounded-xl border px-3 py-3 text-sm font-semibold transition-colors ${
                          selected
                            ? 'border-orange-400 bg-orange-50 text-orange-700'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-orange-300'
                        }`}
                      >
                        {getPaymentFrequencyLabel(frequency)}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <CreditCard size={15} className="text-orange-500" />
                  Cantidad de pagos
                </div>

                <div className="mt-3 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-3xl font-black text-gray-900">{installments}</p>
                    <p className="text-xs text-gray-500">
                      Entre {installmentLimits.min} y {installmentLimits.max} pagos
                    </p>
                  </div>

                  <div className="w-28">
                    <label className="label">Ajuste manual</label>
                    <input
                      type="number"
                      min={installmentLimits.min}
                      max={installmentLimits.max}
                      step={1}
                      value={installments}
                      onChange={(event) =>
                        setInstallments(
                          clampInstallmentsForFrequency(
                            Number(event.target.value) || installmentLimits.min,
                            paymentFrequency
                          )
                        )
                      }
                      className="input text-center"
                    />
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {getSuggestedInstallments(paymentFrequency)
                    .filter(
                      (value) =>
                        value >= installmentLimits.min && value <= installmentLimits.max
                    )
                    .map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setInstallments(value)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                          installments === value
                            ? 'border-orange-400 bg-orange-50 text-orange-700'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-orange-300'
                        }`}
                      >
                        {value} pagos
                      </button>
                    ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-orange-100 bg-orange-50/70 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-orange-700">
                <Gauge size={15} />
                Regla simple
              </div>
              <p className="mt-2 text-sm text-orange-900">
                Personalizas cuotas y frecuencia. La tasa y el anticipo minimo no bajan al mover el
                plan.
              </p>
            </div>
          </div>
        )}
      </div>

      <ZapCreditSimulationCard
        totalAmount={totalAmount}
        items={items}
        eligibility={eligibility}
        isLoading={isLoading}
        compact
        installmentsOverride={installments}
        paymentFrequencyOverride={paymentFrequency}
        title="Asi quedaria tu plan"
        description="Primero ves anticipo, cuota y total estimado. El detalle tecnico queda desplegable."
      />
    </div>
  )
}
