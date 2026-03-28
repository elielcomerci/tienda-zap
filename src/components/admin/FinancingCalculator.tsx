'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Calculator, CheckCircle2, Save } from 'lucide-react'
import {
  PAYMENT_FREQUENCIES,
  PaymentFrequency,
  calculateFinancingPlan,
  clampCreditDownPaymentPercent,
  getPaymentFrequencyLabel,
} from '@/lib/financing-calculator'
import { saveOrderZapCreditPlan } from '@/lib/actions/financing'

type OrderContext = {
  orderId: string
  orderCode: string
  total: number
  downPaymentPercent: number
  existingPlan?: {
    ratePercent: number
    installments: number
    paymentFrequency: PaymentFrequency
    firstDueDate?: string | null
    notes?: string | null
  } | null
}

function toDateInputValue(date?: string | null) {
  if (!date) {
    return ''
  }

  const parsedDate = new Date(date)

  if (Number.isNaN(parsedDate.getTime())) {
    return ''
  }

  const year = parsedDate.getFullYear()
  const month = String(parsedDate.getMonth() + 1).padStart(2, '0')
  const day = String(parsedDate.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export default function FinancingCalculator({
  effectiveRatePercent,
  defaultInstallments,
  defaultPaymentFrequency,
  orderContext,
}: {
  effectiveRatePercent: number
  defaultInstallments: number
  defaultPaymentFrequency: PaymentFrequency
  orderContext?: OrderContext
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [amount, setAmount] = useState(orderContext?.total ?? 0)
  const [downPaymentPercent, setDownPaymentPercent] = useState(
    orderContext?.downPaymentPercent ?? 30
  )
  const [ratePercent, setRatePercent] = useState(
    orderContext?.existingPlan?.ratePercent ?? effectiveRatePercent
  )
  const [installments, setInstallments] = useState(
    orderContext?.existingPlan?.installments ?? defaultInstallments
  )
  const [paymentFrequency, setPaymentFrequency] = useState<PaymentFrequency>(
    orderContext?.existingPlan?.paymentFrequency ?? defaultPaymentFrequency
  )
  const [firstDueDate, setFirstDueDate] = useState(
    toDateInputValue(orderContext?.existingPlan?.firstDueDate)
  )
  const [notes, setNotes] = useState(orderContext?.existingPlan?.notes ?? '')

  const normalizedDownPaymentPercent = orderContext
    ? orderContext.downPaymentPercent
    : clampCreditDownPaymentPercent(downPaymentPercent)

  const summary = useMemo(() => {
    return calculateFinancingPlan({
      baseAmount: Number(amount) || 0,
      downPaymentPercent: normalizedDownPaymentPercent,
      ratePercent: Number(ratePercent) || 0,
      installments: Number(installments) || 1,
      paymentFrequency,
      firstDueDate: firstDueDate ? new Date(firstDueDate) : undefined,
    })
  }, [
    amount,
    firstDueDate,
    installments,
    normalizedDownPaymentPercent,
    paymentFrequency,
    ratePercent,
  ])

  const handleSaveToOrder = () => {
    if (!orderContext) {
      return
    }

    setError('')
    setMessage('')

    startTransition(async () => {
      try {
        await saveOrderZapCreditPlan({
          orderId: orderContext.orderId,
          ratePercent: Number(ratePercent) || 0,
          installments: Number(installments) || 1,
          paymentFrequency,
          firstDueDate: firstDueDate || undefined,
          notes,
        })
        setMessage('La propuesta quedo guardada en la orden.')
        router.refresh()
      } catch (saveError: any) {
        setError(saveError?.message || 'No pudimos guardar la propuesta.')
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <Calculator size={20} className="text-orange-500" />
              Calculadora de planes
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Calcula anticipo, saldo financiado y cronograma con tasa fija cerrada al momento de
              la venta.
            </p>
          </div>

          {orderContext && (
            <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
              Orden #{orderContext.orderCode}
            </span>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <label className="label">Monto total</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-gray-400">
                $
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(Number(event.target.value))}
                className="input !pl-8"
                disabled={Boolean(orderContext)}
              />
            </div>
          </div>

          <div>
            <label className="label">Anticipo</label>
            <div className="relative">
              <input
                type="number"
                min="30"
                max="50"
                step="1"
                value={normalizedDownPaymentPercent}
                onChange={(event) => setDownPaymentPercent(Number(event.target.value))}
                className="input !pr-10"
                disabled={Boolean(orderContext)}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 font-semibold text-gray-400">
                %
              </span>
            </div>
            {orderContext && (
              <p className="mt-1 text-xs text-gray-500">
                Este porcentaje se calcula automaticamente segun los productos de la orden.
              </p>
            )}
          </div>

          <div>
            <label className="label">Tasa mensual fija</label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="0.01"
                value={ratePercent}
                onChange={(event) => setRatePercent(Number(event.target.value))}
                className="input !pr-10"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 font-semibold text-gray-400">
                %
              </span>
            </div>
          </div>

          <div>
            <label className="label">Cantidad de cuotas</label>
            <input
              type="number"
              min="1"
              max="60"
              step="1"
              value={installments}
              onChange={(event) => setInstallments(Number(event.target.value))}
              className="input"
            />
          </div>

          <div>
            <label className="label">Frecuencia</label>
            <select
              value={paymentFrequency}
              onChange={(event) => setPaymentFrequency(event.target.value as PaymentFrequency)}
              className="input"
            >
              {PAYMENT_FREQUENCIES.map((frequency) => (
                <option key={frequency} value={frequency}>
                  {getPaymentFrequencyLabel(frequency)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Primera cuota</label>
            <input
              type="date"
              value={firstDueDate}
              onChange={(event) => setFirstDueDate(event.target.value)}
              className="input"
            />
          </div>
        </div>

        {orderContext && (
          <div className="mt-4">
            <label className="label">Notas de la propuesta</label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className="input resize-none"
              placeholder="Condiciones acordadas, observaciones o aclaraciones para el cliente."
            />
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="card p-5">
          <p className="text-sm font-medium text-gray-500">Anticipo</p>
          <p className="mt-2 text-2xl font-black text-gray-900">
            ${summary.downPaymentAmount.toLocaleString('es-AR')}
          </p>
          <p className="mt-1 text-xs text-gray-500">{summary.downPaymentPercent}% del total</p>
        </div>

        <div className="card p-5">
          <p className="text-sm font-medium text-gray-500">Saldo financiado</p>
          <p className="mt-2 text-2xl font-black text-gray-900">
            ${summary.financedAmount.toLocaleString('es-AR')}
          </p>
          <p className="mt-1 text-xs text-gray-500">Capital sobre el que corre la tasa</p>
        </div>

        <div className="card p-5">
          <p className="text-sm font-medium text-gray-500">
            {summary.installments} pagos · {getPaymentFrequencyLabel(summary.paymentFrequency)}
          </p>
          <p className="mt-2 text-2xl font-black text-orange-600">
            ${summary.installmentAmount.toLocaleString('es-AR')}
          </p>
          <p className="mt-1 text-xs text-gray-500">Monto por periodo</p>
        </div>

        <div className="card p-5">
          <p className="text-sm font-medium text-gray-500">Total proyectado</p>
          <p className="mt-2 text-2xl font-black text-gray-900">
            ${summary.totalRepayable.toLocaleString('es-AR')}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Interes total estimado: ${summary.totalInterest.toLocaleString('es-AR')}
          </p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-gray-100 px-6 py-4">
          <h3 className="font-bold text-gray-900">Cronograma estimado</h3>
        </div>

        {summary.schedule.length === 0 ? (
          <div className="px-6 py-8 text-sm text-gray-500">
            El anticipo cubre el total. No hace falta financiar saldo.
          </div>
        ) : (
          <div className="max-h-[28rem] overflow-auto">
            <table className="w-full whitespace-nowrap text-left text-sm">
              <thead className="sticky top-0 border-b border-gray-100 bg-gray-50 font-semibold text-gray-500">
                <tr>
                  <th className="px-6 py-3">Cuota</th>
                  <th className="px-6 py-3">Vencimiento</th>
                  <th className="px-6 py-3">Monto</th>
                  <th className="px-6 py-3">Capital</th>
                  <th className="px-6 py-3">Interes</th>
                  <th className="px-6 py-3">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {summary.schedule.map((item) => (
                  <tr key={item.installmentNumber}>
                    <td className="px-6 py-3 font-semibold text-gray-900">
                      #{item.installmentNumber}
                    </td>
                    <td className="px-6 py-3 text-gray-600">
                      {item.dueDate.toLocaleDateString('es-AR')}
                    </td>
                    <td className="px-6 py-3 font-semibold text-gray-900">
                      ${item.amount.toLocaleString('es-AR')}
                    </td>
                    <td className="px-6 py-3 text-gray-600">
                      ${item.principalAmount.toLocaleString('es-AR')}
                    </td>
                    <td className="px-6 py-3 text-gray-600">
                      ${item.interestAmount.toLocaleString('es-AR')}
                    </td>
                    <td className="px-6 py-3 text-gray-500">
                      ${item.balanceAfter.toLocaleString('es-AR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {orderContext && (
        <div className="card p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-bold text-gray-900">Guardar propuesta en la orden</h3>
              <p className="mt-1 text-sm text-gray-500">
                Al guardar, la orden conserva esta tasa fija aunque despues cambie el IPC.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSaveToOrder}
              disabled={isPending}
              className="btn-primary justify-center !py-3"
            >
              <Save size={16} />
              {isPending ? 'Guardando...' : 'Guardar propuesta'}
            </button>
          </div>

          {message && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              <CheckCircle2 size={16} />
              {message}
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
