'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  CalendarClock,
  CreditCard,
  Gauge,
  PlusCircle,
  Repeat,
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
  onChange,
}: {
  totalAmount: number
  items: CreditSimulationItem[]
  eligibility: CreditEligibilitySnapshot | null
  isLoading?: boolean
  onChange: (selection: ZapCreditSelection | null) => void
}) {
  const [paymentFrequency, setPaymentFrequency] = useState<PaymentFrequency>('MONTHLY')
  const [installments, setInstallments] = useState(6)

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
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
              Personaliza tu plan
            </p>
            <h3 className="mt-1 text-xl font-black text-gray-900">
              Elegi la frecuencia y el tiempo de pago
            </h3>
            <p className="mt-2 max-w-2xl text-sm text-gray-600">
              La tasa y cualquier penalizacion por mora se mantienen definidas por ZAP. Vos
              elegis en cuantos pagos queres distribuir el saldo financiado.
            </p>
          </div>

          {eligibility && (
            <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">
                Tasa aplicada
              </p>
              <p className="mt-1 text-2xl font-black text-orange-600">
                {eligibility.effectiveRatePercent.toLocaleString('es-AR')}%
              </p>
              <p className="text-xs text-orange-700">mensual fija</p>
            </div>
          )}
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
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

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-orange-100 bg-orange-50/70 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-orange-700">
              <Gauge size={15} />
              Regla de tasa
            </div>
            <p className="mt-2 text-sm text-orange-900">
              La tasa no se edita: siempre usamos la tasa vigente de ZAP y, si corresponde, la
              penalizacion por mora.
            </p>
          </div>

          <div className="rounded-2xl border border-orange-100 bg-orange-50/70 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-orange-700">
              <PlusCircle size={15} />
              Anticipo minimo
            </div>
            <p className="mt-2 text-sm text-orange-900">
              El anticipo sigue definido por el mix de productos del carrito y no baja al
              personalizar el plan.
            </p>
          </div>

          <div className="rounded-2xl border border-orange-100 bg-orange-50/70 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-orange-700">
              <CalendarClock size={15} />
              Primer vencimiento estimado
            </div>
            <p className="mt-2 text-sm text-orange-900">
              {firstDueDate.toLocaleDateString('es-AR')} segun la frecuencia elegida.
            </p>
          </div>
        </div>
      </div>

      <ZapCreditSimulationCard
        totalAmount={totalAmount}
        items={items}
        eligibility={eligibility}
        isLoading={isLoading}
        compact
        installmentsOverride={installments}
        paymentFrequencyOverride={paymentFrequency}
        title="Resumen del plan que estas armando"
        description="La simulacion se recalcula en tiempo real con tus pagos elegidos, manteniendo la tasa y penalizaciones del sistema."
      />
    </div>
  )
}
