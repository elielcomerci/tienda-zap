'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/lib/cart-store'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertTriangle, CreditCard, Banknote, Smartphone, Wallet } from 'lucide-react'
import OrderItemOptions from './OrderItemOptions'
import {
  calculateWeightedDownPaymentPercent,
  clampCreditDownPaymentPercent,
} from '@/lib/financing-calculator'

const schema = z.object({
  name: z.string().min(2, 'Nombre requerido'),
  email: z.string().email('Email invalido'),
  phone: z.string().min(8, 'Telefono invalido'),
  paymentType: z.enum(['MERCADOPAGO', 'TRANSFER', 'CASH', 'ZAP_CREDIT']),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

type CreditEligibility = {
  authenticated: boolean
  canRequestCredit: boolean
  activeCreditsCount: number
  overdueInstallmentsCount: number
  hasDelinquency: boolean
  effectiveRatePercent: number
  baseRatePercent: number
  ratePenaltyPercent: number
  downPaymentPenaltyPercent: number
}

const paymentOptions = [
  { value: 'MERCADOPAGO', label: 'Tarjeta / MercadoPago', desc: 'Hasta 6 cuotas sin interes', icon: CreditCard },
  { value: 'ZAP_CREDIT', label: 'Credito ZAP', desc: 'Anticipo y saldo en cuotas fijas', icon: Wallet },
  { value: 'TRANSFER', label: 'Transferencia', desc: 'CBU/CVU - subi tu comprobante', icon: Smartphone },
  { value: 'CASH', label: 'Efectivo', desc: 'Retiro y pago en local', icon: Banknote },
] as const

export default function CheckoutPage() {
  const { items, total, clearCart } = useCartStore()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [creditEligibility, setCreditEligibility] = useState<CreditEligibility | null>(null)
  const hasUnavailableItems = items.some((item) => item.price <= 0)
  const hasItemsRequiringArtwork = items.some((item) => !item.isService)
  const baseDownPaymentPercent = calculateWeightedDownPaymentPercent(
    items.map((item) => ({
      unitPrice: item.price,
      quantity: item.quantity,
      creditDownPaymentPercent: item.creditDownPaymentPercent ?? 30,
    }))
  )
  const estimatedDownPaymentPercent = clampCreditDownPaymentPercent(
    baseDownPaymentPercent + (creditEligibility?.downPaymentPenaltyPercent ?? 0)
  )
  const estimatedDownPaymentAmount = total() * (estimatedDownPaymentPercent / 100)
  const zapCreditDisabled = Boolean(creditEligibility && !creditEligibility.canRequestCredit)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { paymentType: 'MERCADOPAGO' },
  })

  const paymentType = watch('paymentType')

  useEffect(() => {
    if (items.length === 0) router.replace('/carrito')
  }, [items.length, router])

  useEffect(() => {
    let active = true

    fetch('/api/creditos/eligibility')
      .then(async (response) => {
        const payload = await response.json()
        if (!response.ok) {
          throw new Error(payload.error || 'No pudimos validar Credito ZAP.')
        }

        if (active) {
          setCreditEligibility(payload)
          if (!payload.canRequestCredit) {
            setValue('paymentType', 'MERCADOPAGO')
          }
        }
      })
      .catch(() => {
        if (active) {
          setCreditEligibility(null)
        }
      })

    return () => {
      active = false
    }
  }, [setValue])

  if (items.length === 0) return null

  const onSubmit = async (data: FormData) => {
    if (hasUnavailableItems) {
      setError('Hay productos con precio 0 marcados como no disponibles. Revisá el carrito antes de continuar.')
      return
    }

    if (data.paymentType === 'ZAP_CREDIT' && creditEligibility && !creditEligibility.canRequestCredit) {
      setError('Inicia sesion para solicitar Credito ZAP y seguir tus cuotas desde el panel.')
      return
    }

    setLoading(true)
    setError('')

    const payload = {
      ...data,
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.price,
        name: item.name,
        notes: item.notes,
        designRequested: item.designRequested,
        selectedOptions: item.selectedOptions,
      })),
    }

    try {
      if (data.paymentType === 'MERCADOPAGO') {
        const res = await fetch('/api/checkout/mercadopago', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const result = await res.json()
        if (!res.ok) throw new Error(result.error)
        clearCart()
        router.push(result.initPoint)
      } else {
        const res = await fetch('/api/ordenes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const result = await res.json()
        if (!res.ok) throw new Error(result.error)
        clearCart()
        router.push(`/checkout/success?${result.successQuery || `orderId=${result.orderId}`}`)
      }
    } catch (e: any) {
      setError(e.message || 'Ocurrio un error, intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Finalizar pedido</h1>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6">
              <h2 className="font-bold text-gray-900 mb-4">Tus datos</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Nombre completo</label>
                  <input {...register('name')} className="input" placeholder="Juan Garcia" />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="label">Telefono / WhatsApp</label>
                  <input {...register('phone')} className="input" placeholder="1134567890" />
                  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Email</label>
                  <input {...register('email')} type="email" className="input" placeholder="juan@email.com" />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Notas adicionales (opcional)</label>
                  <textarea
                    {...register('notes')}
                    className="input resize-none"
                    rows={2}
                    placeholder="Instrucciones especiales, tipo de papel, etc."
                  />
                </div>
              </div>
            </div>

            <div className="card p-6">
              <h2 className="font-bold text-gray-900 mb-4">Metodo de pago</h2>
              <div className="space-y-3">
                {paymentOptions.map((option) => {
                  const optionDisabled = option.value === 'ZAP_CREDIT' && zapCreditDisabled

                  return (
                    <label
                      key={option.value}
                      className={`flex items-center gap-4 rounded-xl border-2 p-4 transition-all ${
                        optionDisabled
                          ? 'cursor-not-allowed border-gray-100 bg-gray-50 opacity-60'
                          : paymentType === option.value
                            ? 'cursor-pointer border-orange-400 bg-orange-50'
                            : 'cursor-pointer border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <input
                        type="radio"
                        value={option.value}
                        {...register('paymentType')}
                        className="sr-only"
                        disabled={optionDisabled}
                      />
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                          paymentType === option.value && !optionDisabled
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        <option.icon size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{option.label}</p>
                        <p className="text-xs text-gray-500">
                          {optionDisabled
                            ? 'Disponible solo para clientes con sesion iniciada'
                            : option.desc}
                        </p>
                      </div>
                    </label>
                  )
                })}
              </div>

              {zapCreditDisabled && (
                <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                  <p className="font-semibold">Credito ZAP para usuarios registrados</p>
                  <p className="mt-1 text-blue-800">
                    Inicia sesion para solicitar credito, seguir cuotas, cargar comprobantes y ver
                    tu estado financiero desde el panel.
                  </p>
                </div>
              )}

              {paymentType === 'ZAP_CREDIT' && (
                <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
                  <p className="font-semibold">Solicitud de Credito ZAP</p>
                  <p className="mt-1 text-orange-800">
                    Registramos tu pedido ahora y el equipo de ZAP te contacta para definir el
                    plan final. El anticipo minimo estimado para este carrito es de{' '}
                    <strong>
                      ${estimatedDownPaymentAmount.toLocaleString('es-AR')} ({estimatedDownPaymentPercent}%)
                    </strong>
                    .
                  </p>
                </div>
              )}

              {paymentType === 'ZAP_CREDIT' && creditEligibility?.hasDelinquency && (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-700" />
                    <div>
                      <p className="font-semibold">Tenes cuotas vencidas en otros creditos</p>
                      <p className="mt-1 text-amber-800">
                        Para esta nueva solicitud se aplica un recargo de{' '}
                        <strong>+{creditEligibility.ratePenaltyPercent}%</strong> en la tasa de
                        referencia y <strong>+{creditEligibility.downPaymentPenaltyPercent}</strong>{' '}
                        puntos sobre el anticipo.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {error && <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm">{error}</div>}
          </div>

          <div>
            <div className="card p-5 sticky top-24">
              <h2 className="font-bold text-gray-900 mb-4">
                {hasItemsRequiringArtwork ? 'Resumen y archivos' : 'Resumen del pedido'}
              </h2>
              {hasUnavailableItems && (
                <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                  Hay productos con precio 0 en tu carrito. Quitalos o elegí una variante disponible antes de confirmar.
                </div>
              )}
              <div className="space-y-4 mb-4 max-h-[60vh] overflow-y-auto pr-2">
                {items.map((item) => (
                  <div
                    key={item.cartItemId || item.productId}
                    className="flex flex-col border-b border-gray-100 pb-4 last:border-0 last:pb-0"
                  >
                    <div className="flex flex-col mb-2">
                      <div className="flex justify-between text-sm font-medium">
                        <span className="text-gray-800 mr-2">
                          {item.name} x{item.quantity}
                        </span>
                        <span className="shrink-0 text-orange-600">
                          ${(item.price * item.quantity).toLocaleString('es-AR')}
                        </span>
                      </div>
                      {item.selectedOptions && item.selectedOptions.length > 0 && (
                        <span className="text-xs text-gray-500 mt-0.5">
                          {item.selectedOptions.map((option) => option.value).join(' • ')}
                        </span>
                      )}
                    </div>

                    <OrderItemOptions item={item} />
                  </div>
                ))}
              </div>
              <div className="border-t pt-4 flex justify-between font-bold text-lg mb-5">
                <span>Total</span>
                <span className="text-orange-500">${total().toLocaleString('es-AR')}</span>
              </div>
              <button
                type="submit"
                disabled={loading || hasUnavailableItems || (paymentType === 'ZAP_CREDIT' && zapCreditDisabled)}
                className={`w-full justify-center !py-3.5 ${
                  loading || hasUnavailableItems || (paymentType === 'ZAP_CREDIT' && zapCreditDisabled)
                    ? 'btn-secondary !cursor-not-allowed !border-gray-200 !bg-gray-200 !text-gray-500 hover:!bg-gray-200'
                    : 'btn-primary'
                }`}
              >
                {loading
                  ? 'Procesando...'
                  : hasUnavailableItems
                    ? 'Revisá el carrito'
                  : paymentType === 'ZAP_CREDIT' && zapCreditDisabled
                    ? 'Inicia sesion para solicitar credito'
                    : paymentType === 'MERCADOPAGO'
                    ? 'Pagar con MercadoPago'
                    : paymentType === 'ZAP_CREDIT'
                      ? 'Solicitar Credito ZAP'
                      : 'Confirmar pedido'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
