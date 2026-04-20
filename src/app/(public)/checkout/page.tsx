'use client'

import { Fragment, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/lib/cart-store'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle, CheckCircle2, CircleHelp, CreditCard, PencilLine, Smartphone, Wallet } from 'lucide-react'
import OrderItemOptions from './OrderItemOptions'
import CheckoutZapCreditConfigurator from '@/components/public/CheckoutZapCreditConfigurator'
import {
  calculateWeightedDownPaymentPercent,
  clampCreditDownPaymentPercent,
  PaymentFrequency,
} from '@/lib/financing-calculator'
import { useCreditEligibility } from '@/lib/use-credit-eligibility'
import { orderCheckoutSchema, type OrderCheckoutData } from '@/lib/validations'

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

type CustomerFieldConfig = {
  name:
    | 'name'
    | 'phone'
    | 'email'
    | 'documentId'
    | 'billingAddress'
    | 'billingCity'
    | 'billingProvince'
    | 'shippingAddress'
    | 'shippingCity'
    | 'shippingProvince'
    | 'shippingPostalCode'
  label: string
  placeholder: string
  type?: 'email'
  fullWidth?: boolean
}

const customerSections: readonly { title: string; fields: readonly CustomerFieldConfig[] }[] = [
  {
    title: 'Datos principales',
    fields: [
      { name: 'name', label: 'Nombre completo', placeholder: 'Juan Garcia' },
      { name: 'phone', label: 'Telefono / WhatsApp', placeholder: '1134567890' },
      {
        name: 'email',
        label: 'Email',
        placeholder: 'juan@email.com',
        type: 'email',
        fullWidth: true,
      },
      {
        name: 'documentId',
        label: 'Documento (CUIT / CUIL / DNI)',
        placeholder: '20-12345678-9',
        fullWidth: true,
      },
    ],
  },
  {
    title: 'Datos de facturacion',
    fields: [
      {
        name: 'billingAddress',
        label: 'Direccion de facturacion',
        placeholder: 'Calle Falsa 123',
        fullWidth: true,
      },
      { name: 'billingCity', label: 'Ciudad', placeholder: 'Rosario' },
      { name: 'billingProvince', label: 'Provincia', placeholder: 'Santa Fe' },
    ],
  },
  {
    title: 'Datos de envio',
    fields: [
      {
        name: 'shippingAddress',
        label: 'Direccion de envio',
        placeholder: 'Av. Pellegrini 1500',
        fullWidth: true,
      },
      { name: 'shippingCity', label: 'Ciudad', placeholder: 'Rosario' },
      { name: 'shippingProvince', label: 'Provincia', placeholder: 'Santa Fe' },
      { name: 'shippingPostalCode', label: 'Codigo Postal', placeholder: '2000' },
    ],
  },
]

function hasTextValue(value: unknown) {
  return typeof value === 'string' ? value.trim().length > 0 : Boolean(value)
}

export default function CheckoutPage() {
  const { items, total, clearCart } = useCartStore()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [orderCreated, setOrderCreated] = useState(false)
  const [showProfileEditor, setShowProfileEditor] = useState(false)
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

  const formValues = watch()
  const paymentType = formValues.paymentType
  const authenticatedUser = Boolean(creditEligibility?.authenticated)
  const missingProfileFields = customerSections.flatMap((section) =>
    section.fields.filter((field) => !hasTextValue(formValues[field.name]))
  )
  const hasMissingProfileFields = missingProfileFields.length > 0

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
    if (authenticatedUser && hasMissingProfileFields) {
      setShowProfileEditor(true)
    }
  }, [authenticatedUser, hasMissingProfileFields])

  useEffect(() => {
    if (zapCreditSelection) {
      setValue('zapCreditConfig', zapCreditSelection)
    } else {
      setValue('zapCreditConfig', undefined)
    }
  }, [zapCreditSelection, setValue])

  useEffect(() => {
    setValue(
      'items',
      items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.price,
        notes: item.notes,
        designRequested: item.designRequested,
        selectedOptions: item.selectedOptions,
      }))
    )
  }, [items, setValue])

  if (items.length === 0) return null

  const renderCustomerField = (field: CustomerFieldConfig) => (
    <div key={field.name} className={field.fullWidth ? 'sm:col-span-2' : undefined}>
      <label className="label">{field.label}</label>
      <input
        {...register(field.name)}
        type={field.type}
        className="input"
        placeholder={field.placeholder}
      />
      {errors[field.name] && (
        <p className="mt-1 text-xs text-red-500">{errors[field.name]?.message as string}</p>
      )}
    </div>
  )

  const renderCustomerSections = (mode: 'all' | 'missing') =>
    customerSections.map((section) => {
      const fields =
        mode === 'missing'
          ? section.fields.filter((field) => !hasTextValue(formValues[field.name]))
          : section.fields

      if (fields.length === 0) return null

      return (
        <Fragment key={section.title}>
          <div className="sm:col-span-2 mt-2">
            <h3 className="mb-3 border-b pb-1 text-sm font-bold text-gray-900">{section.title}</h3>
          </div>
          {fields.map(renderCustomerField)}
        </Fragment>
      )
    })

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

              {isLoadingCreditEligibility ? (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                  Cargando tus datos y condiciones de compra...
                </div>
              ) : authenticatedUser ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />
                      <div>
                        <p className="font-semibold">Usaremos los datos de tu cuenta para este pedido.</p>
                        <p className="mt-1 text-emerald-800">
                          No hace falta volver a cargar nombre y contacto si ya los tenemos.
                        </p>
                      </div>
                    </div>
                  </div>

                  {!hasMissingProfileFields && (
                    <div className="grid gap-4 lg:grid-cols-3">
                      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Contacto
                        </p>
                        <p className="mt-2 text-sm font-semibold text-gray-900">{formValues.name}</p>
                        <p className="mt-1 text-sm text-gray-600">{formValues.email}</p>
                        <p className="mt-1 text-sm text-gray-600">{formValues.phone}</p>
                        <p className="mt-1 text-sm text-gray-600">{formValues.documentId}</p>
                      </div>

                      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Facturacion
                        </p>
                        <p className="mt-2 text-sm text-gray-600">{formValues.billingAddress}</p>
                        <p className="mt-1 text-sm text-gray-600">
                          {formValues.billingCity} - {formValues.billingProvince}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Envio
                        </p>
                        <p className="mt-2 text-sm text-gray-600">{formValues.shippingAddress}</p>
                        <p className="mt-1 text-sm text-gray-600">
                          {formValues.shippingCity} - {formValues.shippingProvince}
                        </p>
                        <p className="mt-1 text-sm text-gray-600">CP {formValues.shippingPostalCode}</p>
                      </div>
                    </div>
                  )}

                  {hasMissingProfileFields ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      <p className="text-sm font-semibold text-amber-900">
                        Faltan algunos datos para cerrar este pedido.
                      </p>
                      <p className="mt-1 text-sm text-amber-800">
                        Solo te pedimos completar lo que todavia no esta cargado.
                      </p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowProfileEditor((current) => !current)}
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:border-orange-300 hover:text-orange-700"
                    >
                      <PencilLine size={16} />
                      {showProfileEditor ? 'Ocultar edicion manual' : 'Editar datos para este pedido'}
                    </button>
                  )}

                  {(showProfileEditor || hasMissingProfileFields) && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {renderCustomerSections(hasMissingProfileFields ? 'missing' : 'all')}
                    </div>
                  )}

                  <div>
                    <label className="label">Notas adicionales (opcional)</label>
                    <textarea
                      {...register('notes')}
                      className="input resize-none"
                      rows={2}
                      placeholder="Instrucciones especiales, tipo de papel, etc."
                    />
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {renderCustomerSections('all')}

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
              )}
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
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href="/login" className="btn-secondary !px-4 !py-2 !text-sm">
                      Iniciar sesion
                    </Link>
                    <Link href="/credito-zap" className="btn-secondary !px-4 !py-2 !text-sm">
                      Ver mas informacion
                    </Link>
                  </div>
                </div>
              )}

              {paymentType === 'ZAP_CREDIT' && !zapCreditDisabled && (
                <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50/60 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        Confirmas con anticipo y el resto queda en pagos fijos.
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        Dejamos aqui solo el resumen rapido. El detalle completo de funcionamiento y
                        privacidad esta en una pagina aparte.
                      </p>
                    </div>

                    <Link href="/credito-zap" className="btn-secondary !px-4 !py-2 !text-sm">
                      Ver mas informacion
                    </Link>
                  </div>

                  <details className="mt-3 rounded-2xl border border-orange-100 bg-white/80">
                    <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold text-gray-900 marker:hidden">
                      <CircleHelp size={16} className="text-orange-500" />
                      Resumen rapido de Credito ZAP
                    </summary>
                    <div className="border-t border-orange-100 px-4 py-3 text-sm text-gray-600">
                      Disponible para clientes con cuenta. Puedes simular el plan, confirmar el
                      pedido y despues seguir cuotas, comprobantes y estados desde tu panel.
                    </div>
                  </details>
                </div>
              )}

              {paymentType === 'ZAP_CREDIT' && creditEligibility?.hasDelinquency && (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-700" />
                    <div>
                      <p className="font-semibold">Tenes cuotas vencidas en otros creditos</p>
                      <p className="mt-1 text-amber-800">
                        La simulacion ya incluye el recargo vigente:{' '}
                        <strong>+{creditEligibility.ratePenaltyPercent}%</strong> sobre la tasa y{' '}
                        <strong>+{creditEligibility.downPaymentPenaltyPercent}</strong> puntos sobre
                        el anticipo.
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
                <p className="mb-1 font-bold">Por favor, revisa los siguientes campos:</p>
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
