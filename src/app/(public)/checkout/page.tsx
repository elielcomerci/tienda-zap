'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/lib/cart-store'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertTriangle, Banknote, CreditCard, Smartphone, Wallet } from 'lucide-react'
import OrderItemOptions from './OrderItemOptions'
import CheckoutZapCreditConfigurator from '@/components/public/CheckoutZapCreditConfigurator'
import {
  calculateWeightedDownPaymentPercent,
  clampCreditDownPaymentPercent,
  PaymentFrequency,
} from '@/lib/financing-calculator'
import { useCreditEligibility } from '@/lib/use-credit-eligibility'
import { orderCheckoutSchema, type OrderCheckoutData } from '@/lib/validations'

// Local schema removed, using orderCheckoutSchema from validations.ts

const paymentOptions = [
  {
    value: 'MERCADOPAGO',
    label: 'Tarjeta / MercadoPago',
    desc: 'Hasta 6 cuotas sin interes',
    icon: CreditCard,
  },
  {
    value: 'ZAP_CREDIT',
    label: 'Credito ZAP',
    desc: 'Anticipo y saldo en cuotas fijas',
    icon: Wallet,
  },
  {
    value: 'TRANSFER',
    label: 'Transferencia',
    desc: 'CBU/CVU - subi tu comprobante',
    icon: Smartphone,
  },
] as const

export default function CheckoutPage() {
  const { items, total, clearCart } = useCartStore()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [orderCreated, setOrderCreated] = useState(false)
  const [zapCreditSelection, setZapCreditSelection] = useState<{
    installments: number
    paymentFrequency: PaymentFrequency
  } | null>(null)
  const {
    eligibility: creditEligibility,
    isLoading: isLoadingCreditEligibility,
  } = useCreditEligibility()

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
  } = useForm<OrderCheckoutData>({
    resolver: zodResolver(orderCheckoutSchema),
    defaultValues: { paymentType: 'MERCADOPAGO' },
  })

  const paymentType = watch('paymentType')
  const submitLabel = loading
    ? 'Procesando...'
    : hasUnavailableItems
      ? 'Revisa el carrito'
      : paymentType === 'ZAP_CREDIT' && isLoadingCreditEligibility
        ? 'Cargando condiciones...'
        : paymentType === 'ZAP_CREDIT' && zapCreditDisabled
          ? 'Inicia sesion para solicitar credito'
          : paymentType === 'ZAP_CREDIT' && !zapCreditSelection
            ? 'Configura tu plan'
            : paymentType === 'MERCADOPAGO'
              ? 'Pagar con MercadoPago'
              : paymentType === 'ZAP_CREDIT'
                ? 'Solicitar Credito ZAP'
                : 'Confirmar pedido'

  useEffect(() => {
    if (items.length === 0 && !orderCreated) {
      router.replace('/carrito')
    }
  }, [items.length, router, orderCreated])

  useEffect(() => {
    if (creditEligibility && !creditEligibility.canRequestCredit) {
      setValue('paymentType', 'MERCADOPAGO')
    }
    
    // Auto-fill profile data if available
    if (creditEligibility?.userProfile) {
      const profile = creditEligibility.userProfile
      if (profile.name) setValue('name', profile.name)
      if (profile.email) setValue('email', profile.email)
      if (profile.phone) setValue('phone', profile.phone)
      if (profile.documentId) setValue('documentId', profile.documentId)
      if (profile.billingAddress) setValue('billingAddress', profile.billingAddress)
      if (profile.billingCity) setValue('billingCity', profile.billingCity)
      if (profile.billingProvince) setValue('billingProvince', profile.billingProvince)
      if (profile.shippingAddress) setValue('shippingAddress', profile.shippingAddress)
      if (profile.shippingCity) setValue('shippingCity', profile.shippingCity)
      if (profile.shippingProvince) setValue('shippingProvince', profile.shippingProvince)
      if (profile.shippingPostalCode) setValue('shippingPostalCode', profile.shippingPostalCode)
    }
  }, [creditEligibility, setValue])

  useEffect(() => {
    if (zapCreditSelection) {
      setValue('zapCreditConfig', zapCreditSelection)
    } else {
      setValue('zapCreditConfig', undefined)
    }
  }, [zapCreditSelection, setValue])

  useEffect(() => {
    // Fill items in form state to satisfy Zod validation .min(1)
    setValue('items', items.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.price,
      notes: item.notes,
      designRequested: item.designRequested,
      selectedOptions: item.selectedOptions
    })))
  }, [items, setValue])

  if (items.length === 0) return null

  const onSubmit = async (data: OrderCheckoutData) => {
    if (hasUnavailableItems) {
      setError(
        'Hay productos con precio 0 marcados como no disponibles. Revisa el carrito antes de continuar.'
      )
      return
    }

    if (
      data.paymentType === 'ZAP_CREDIT' &&
      creditEligibility &&
      !creditEligibility.canRequestCredit
    ) {
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
      zapCreditConfig: data.paymentType === 'ZAP_CREDIT' ? zapCreditSelection : undefined,
    }

    try {
      if (data.paymentType === 'MERCADOPAGO') {
        const response = await fetch('/api/checkout/mercadopago', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error)
        setOrderCreated(true)
        clearCart()
        router.push(result.initPoint)
      } else {
        const response = await fetch('/api/ordenes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error)
        setOrderCreated(true)
        clearCart()
        router.push(`/checkout/success?${result.successQuery || `orderId=${result.orderId}`}`)
      }
    } catch (submitError: any) {
      setError(submitError.message || 'Ocurrio un error, intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-8 text-2xl font-bold text-gray-900">Finalizar pedido</h1>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-start">
          <div className="space-y-6">
            <div className="card p-6">
              <h2 className="mb-4 font-bold text-gray-900">Tus datos</h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Nombre completo</label>
                  <input {...register('name')} className="input" placeholder="Juan Garcia" />
                  {errors.name && (
                    <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="label">Telefono / WhatsApp</label>
                  <input {...register('phone')} className="input" placeholder="1134567890" />
                  {errors.phone && (
                    <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="label">Email</label>
                  <input
                    {...register('email')}
                    type="email"
                    className="input"
                    placeholder="juan@email.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="label">Documento (CUIT / CUIL / DNI)</label>
                  <input {...register('documentId')} className="input" placeholder="20-12345678-9" />
                  {errors.documentId && (
                    <p className="mt-1 text-xs text-red-500">{errors.documentId.message}</p>
                  )}
                </div>

                <div className="sm:col-span-2 mt-2">
                  <h3 className="text-sm font-bold text-gray-900 border-b pb-1 mb-3">Datos de facturacion</h3>
                </div>

                <div className="sm:col-span-2">
                  <label className="label">Direccion de facturacion</label>
                  <input {...register('billingAddress')} className="input" placeholder="Calle Falsa 123" />
                  {errors.billingAddress && (
                    <p className="mt-1 text-xs text-red-500">{errors.billingAddress.message}</p>
                  )}
                </div>

                <div>
                  <label className="label">Ciudad</label>
                  <input {...register('billingCity')} className="input" placeholder="Rosario" />
                  {errors.billingCity && (
                    <p className="mt-1 text-xs text-red-500">{errors.billingCity.message}</p>
                  )}
                </div>

                <div>
                  <label className="label">Provincia</label>
                  <input {...register('billingProvince')} className="input" placeholder="Santa Fe" />
                  {errors.billingProvince && (
                    <p className="mt-1 text-xs text-red-500">{errors.billingProvince.message}</p>
                  )}
                </div>

                <div className="sm:col-span-2 mt-2">
                  <h3 className="text-sm font-bold text-gray-900 border-b pb-1 mb-3">Datos de envio</h3>
                </div>

                <div className="sm:col-span-2">
                  <label className="label">Direccion de envio</label>
                  <input {...register('shippingAddress')} className="input" placeholder="Av. Pellegrini 1500" />
                  {errors.shippingAddress && (
                    <p className="mt-1 text-xs text-red-500">{errors.shippingAddress.message}</p>
                  )}
                </div>

                <div>
                  <label className="label">Ciudad</label>
                  <input {...register('shippingCity')} className="input" placeholder="Rosario" />
                  {errors.shippingCity && (
                    <p className="mt-1 text-xs text-red-500">{errors.shippingCity.message}</p>
                  )}
                </div>

                <div>
                  <label className="label">Provincia</label>
                  <input {...register('shippingProvince')} className="input" placeholder="Santa Fe" />
                  {errors.shippingProvince && (
                    <p className="mt-1 text-xs text-red-500">{errors.shippingProvince.message}</p>
                  )}
                </div>

                <div>
                  <label className="label">Codigo Postal</label>
                  <input {...register('shippingPostalCode')} className="input" placeholder="2000" />
                  {errors.shippingPostalCode && (
                    <p className="mt-1 text-xs text-red-500">{errors.shippingPostalCode.message}</p>
                  )}
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
              <h2 className="mb-4 font-bold text-gray-900">Metodo de pago</h2>

              <div className="grid gap-3 md:grid-cols-2">
                {paymentOptions.map((option) => {
                  const optionDisabled = option.value === 'ZAP_CREDIT' && zapCreditDisabled

                  return (
                    <label
                      key={option.value}
                      className={`flex min-h-23 items-center gap-4 rounded-xl border-2 p-4 transition-all ${
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

              {paymentType === 'ZAP_CREDIT' && creditEligibility?.hasDelinquency && (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-700" />
                    <div>
                      <p className="font-semibold">Tenes cuotas vencidas en otros creditos</p>
                      <p className="mt-1 text-amber-800">
                        La simulacion ya incluye el recargo vigente: <strong>+{creditEligibility.ratePenaltyPercent}%</strong>{' '}
                        sobre la tasa y <strong>+{creditEligibility.downPaymentPenaltyPercent}</strong>{' '}
                        puntos sobre el anticipo.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {paymentType === 'ZAP_CREDIT' && (
                <div className="mt-4">
                  <CheckoutZapCreditConfigurator
                    totalAmount={total()}
                    items={items.map((item) => ({
                      unitPrice: item.price,
                      quantity: item.quantity,
                      creditDownPaymentPercent: item.creditDownPaymentPercent ?? 30,
                    }))}
                    eligibility={creditEligibility}
                    isLoading={isLoadingCreditEligibility}
                    minimumDownPaymentAmount={estimatedDownPaymentAmount}
                    minimumDownPaymentPercent={estimatedDownPaymentPercent}
                    onChange={setZapCreditSelection}
                  />
                </div>
              )}
            </div>

            {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
            
            {Object.keys(errors).length > 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <p className="font-bold mb-1">Por favor, revisa los siguientes campos:</p>
                <ul className="list-disc list-inside space-y-0.5 opacity-80">
                  {Object.entries(errors).map(([key, err]) => (
                    <li key={key}>{(err as any)?.message}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div>
            <div className="card p-5 xl:sticky xl:top-24">
              <h2 className="mb-4 font-bold text-gray-900">
                {hasItemsRequiringArtwork ? 'Resumen y archivos' : 'Resumen del pedido'}
              </h2>

              {hasUnavailableItems && (
                <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                  Hay productos con precio 0 en tu carrito. Quitalos o elegi una variante
                  disponible antes de confirmar.
                </div>
              )}

              <div className="mb-4 space-y-4 pr-1 xl:max-h-[calc(100vh-20rem)] xl:overflow-y-auto xl:pr-2">
                {items.map((item) => (
                  <div
                    key={item.cartItemId || item.productId}
                    className="flex flex-col border-b border-gray-100 pb-4 last:border-0 last:pb-0"
                  >
                    <div className="mb-2 flex flex-col">
                      <div className="flex justify-between text-sm font-medium">
                        <span className="mr-2 text-gray-800">
                          {item.name} x{item.quantity}
                        </span>
                        <span className="shrink-0 text-orange-600">
                          ${(item.price * item.quantity).toLocaleString('es-AR')}
                        </span>
                      </div>

                      {item.selectedOptions && item.selectedOptions.length > 0 && (
                        <span className="mt-0.5 text-xs text-gray-500">
                          {item.selectedOptions.map((option) => option.value).join(' - ')}
                        </span>
                      )}
                    </div>

                    <OrderItemOptions item={item} compact />
                  </div>
                ))}
              </div>

              <div className="mb-5 flex justify-between border-t pt-4 text-lg font-bold">
                <span>Total</span>
                <span className="text-orange-500">${total().toLocaleString('es-AR')}</span>
              </div>

              <button
                type="submit"
                disabled={
                  loading ||
                  hasUnavailableItems ||
                  (paymentType === 'ZAP_CREDIT' &&
                    (zapCreditDisabled || !zapCreditSelection || isLoadingCreditEligibility))
                }
                className={`w-full justify-center py-3.5 ${
                  loading ||
                  hasUnavailableItems ||
                  (paymentType === 'ZAP_CREDIT' &&
                    (zapCreditDisabled || !zapCreditSelection || isLoadingCreditEligibility))
                    ? 'btn-secondary cursor-not-allowed border-gray-200 bg-gray-200 text-gray-500 hover:bg-gray-200'
                    : 'btn-primary'
                }`}
              >
                {submitLabel}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
