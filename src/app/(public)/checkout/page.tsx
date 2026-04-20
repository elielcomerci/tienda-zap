'use client'

import { Fragment, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/lib/cart-store'
import { type Resolver, useForm } from 'react-hook-form'
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
    desc: 'Pagalo en el momento y deja la orden en marcha',
    icon: CreditCard,
  },
  {
    value: 'ZAP_CREDIT',
    label: 'Credito ZAP',
    desc: 'Anticipo hoy y resto en pagos fijos',
    icon: Wallet,
  },
  {
    value: 'TRANSFER',
    label: 'Transferencia',
    desc: 'Nos envias el comprobante y seguimos',
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

const basicFieldNames = new Set<CustomerFieldConfig['name']>(['name', 'phone', 'email'])
const creditExtraFieldNames = new Set<CustomerFieldConfig['name']>([
  'documentId',
  'billingAddress',
  'billingCity',
  'billingProvince',
  'shippingAddress',
  'shippingCity',
  'shippingProvince',
  'shippingPostalCode',
])

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
    resolver: zodResolver(orderCheckoutSchema) as Resolver<OrderCheckoutData>,
    defaultValues: { paymentType: 'MERCADOPAGO' },
  })

  const formValues = watch()
  const paymentType = formValues.paymentType
  const authenticatedUser = Boolean(creditEligibility?.authenticated)
  const isFieldRequired = (fieldName: CustomerFieldConfig['name']) =>
    basicFieldNames.has(fieldName) ||
    (paymentType === 'ZAP_CREDIT' && creditExtraFieldNames.has(fieldName))
  const missingRequiredFields = customerSections.flatMap((section) =>
    section.fields.filter(
      (field) => isFieldRequired(field.name) && !hasTextValue(formValues[field.name])
    )
  )
  const hasMissingRequiredFields = missingRequiredFields.length > 0
  const selectedPaymentOption =
    paymentOptions.find((option) => option.value === paymentType) ?? paymentOptions[0]
  const SelectedPaymentIcon = selectedPaymentOption.icon

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
    if (authenticatedUser && hasMissingRequiredFields) {
      setShowProfileEditor(true)
    }
  }, [authenticatedUser, hasMissingRequiredFields])

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
        isService: item.isService,
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

  const renderCustomerSections = (mode: 'all' | 'required' | 'optional') =>
    customerSections.map((section) => {
      const fields = section.fields.filter((field) => {
        if (mode === 'all') return true
        if (mode === 'required') return isFieldRequired(field.name)
        return !isFieldRequired(field.name)
      })

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
    <div className="bg-[linear-gradient(180deg,#ffffff_0%,#fff8f1_18%,#f8fafc_100%)]">
      <div className="mx-auto max-w-[1380px] px-4 pb-16 pt-8 sm:pt-10 xl:px-8">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
            <div className="space-y-6">
              <section className="rounded-[32px] border border-gray-200 bg-white p-6 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.35)] sm:p-8">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-orange-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700">
                    Checkout ZAP
                  </span>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-600">
                    {items.length} piezas en el pedido
                  </span>
                </div>

                <h1 className="mt-4 text-4xl font-black tracking-tight text-gray-950 sm:text-5xl">
                  Cierra tu pedido con una vista mas clara y mas profesional.
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-8 text-gray-600">
                  Ordenamos datos, medios de pago y resumen final para que la experiencia se sienta
                  estable en desktop, con menos ruido y mejores decisiones visibles.
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                      Paso 1
                    </p>
                    <p className="mt-2 text-sm font-semibold text-gray-900">
                      Confirmas tus datos y dejas notas si hacen falta.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                      Paso 2
                    </p>
                    <p className="mt-2 text-sm font-semibold text-gray-900">
                      Eliges el medio de pago con contexto claro.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                      Paso 3
                    </p>
                    <p className="mt-2 text-sm font-semibold text-gray-900">
                      {hasItemsRequiringArtwork
                        ? 'Dejas archivos o pides diseno despues de confirmar.'
                        : 'El pedido queda listo para seguir sin pasos extra.'}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-[32px] border border-gray-200 bg-white p-6 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.35)] sm:p-8">
                <div className="mb-6 border-b border-gray-100 pb-6">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
                    Paso 1
                  </p>
                  <h2 className="mt-2 text-3xl font-black tracking-tight text-gray-950">
                    Tus datos
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-gray-600">
                    Pedimos solo lo necesario para que la compra arranque prolija. Si tienes cuenta,
                    usamos lo que ya sabemos para evitar friccion.
                  </p>
                </div>

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
                          <p className="font-semibold">Ya tenemos buena parte de tus datos para este pedido.</p>
                          <p className="mt-1 text-emerald-800">
                            Asi comprar se siente mas simple y mas rapido.
                          </p>
                        </div>
                      </div>
                    </div>

                    {!hasMissingRequiredFields && (
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

                        {hasTextValue(formValues.billingAddress) && (
                          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              Facturacion
                            </p>
                            <p className="mt-2 text-sm text-gray-600">{formValues.billingAddress}</p>
                            <p className="mt-1 text-sm text-gray-600">
                              {formValues.billingCity} - {formValues.billingProvince}
                            </p>
                          </div>
                        )}

                        {hasTextValue(formValues.shippingAddress) && (
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
                        )}
                      </div>
                    )}

                    {hasMissingRequiredFields ? (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                        <p className="text-sm font-semibold text-amber-900">
                          Faltan algunos datos para cerrar este pedido.
                        </p>
                        <p className="mt-1 text-sm text-amber-800">
                          {paymentType === 'ZAP_CREDIT'
                            ? 'Para moverlo con Credito ZAP necesitamos completar documento, facturacion y envio.'
                            : 'Solo te pedimos lo minimo que falta para dejarlo bien cargado.'}
                        </p>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowProfileEditor((current) => !current)}
                        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:border-orange-300 hover:text-orange-700"
                      >
                        <PencilLine size={16} />
                        {showProfileEditor ? 'Ocultar edicion manual' : 'Editar datos de este pedido'}
                      </button>
                    )}

                    {(showProfileEditor || hasMissingRequiredFields) && (
                      <div className="grid gap-4 sm:grid-cols-2">
                        {renderCustomerSections(hasMissingRequiredFields ? 'required' : 'all')}
                      </div>
                    )}

                    {!hasMissingRequiredFields && paymentType !== 'ZAP_CREDIT' && (
                      <details className="rounded-2xl border border-gray-200 bg-gray-50">
                        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-gray-700 marker:hidden">
                          Agregar datos de facturacion o entrega
                        </summary>
                        <div className="border-t border-gray-200 px-4 py-4">
                          <p className="mb-4 text-sm text-gray-600">
                            Si quieres dejar todo listo desde ahora, cargalos aca. Si no, lo vemos
                            contigo despues de la compra.
                          </p>
                          <div className="grid gap-4 sm:grid-cols-2">
                            {renderCustomerSections('optional')}
                          </div>
                        </div>
                      </details>
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
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      {renderCustomerSections(paymentType === 'ZAP_CREDIT' ? 'all' : 'required')}
                    </div>

                    {paymentType !== 'ZAP_CREDIT' && (
                      <details className="rounded-2xl border border-gray-200 bg-gray-50">
                        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-gray-700 marker:hidden">
                          Agregar datos de facturacion o entrega
                        </summary>
                        <div className="border-t border-gray-200 px-4 py-4">
                          <p className="mb-4 text-sm text-gray-600">
                            Estos datos no frenan la compra comun. Puedes dejarlos ahora o resolverlos
                            despues con nosotros.
                          </p>
                          <div className="grid gap-4 sm:grid-cols-2">
                            {renderCustomerSections('optional')}
                          </div>
                        </div>
                      </details>
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
                )}
              </section>

              <section className="rounded-[32px] border border-gray-200 bg-white p-6 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.35)] sm:p-8">
                <div className="mb-6 border-b border-gray-100 pb-6">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
                    Paso 2
                  </p>
                  <h2 className="mt-2 text-3xl font-black tracking-tight text-gray-950">
                    Metodo de pago
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-gray-600">
                    Mostramos cada opcion con el contexto justo para que no tengas que interpretar
                    demasiado antes de decidir.
                  </p>
                </div>

                <div className="grid gap-3 lg:grid-cols-3">
                  {paymentOptions.map((option) => {
                    const optionDisabled = option.value === 'ZAP_CREDIT' && zapCreditDisabled

                    return (
                      <label
                        key={option.value}
                        className={`flex min-h-[132px] items-start gap-4 rounded-[24px] border-2 p-5 transition-all ${
                          optionDisabled
                            ? 'cursor-not-allowed border-gray-100 bg-gray-50 opacity-60'
                            : paymentType === option.value
                              ? 'cursor-pointer border-orange-400 bg-orange-50 shadow-sm shadow-orange-100'
                              : 'cursor-pointer border-gray-200 bg-white hover:border-orange-200 hover:bg-orange-50/40'
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
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                            paymentType === option.value && !optionDisabled
                              ? 'bg-orange-500 text-white'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          <option.icon size={20} />
                        </div>

                        <div>
                          <p className="text-base font-bold text-gray-900">{option.label}</p>
                          <p className="mt-2 text-sm leading-7 text-gray-600">
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
                      Inicia sesion para pedir tu plan, seguir cuotas y tener todo ordenado desde tu
                      cuenta.
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
                          Confirmas hoy con anticipo y el resto queda acomodado en pagos fijos.
                        </p>
                        <p className="mt-1 text-sm text-gray-600">
                          Aca te mostramos solo lo importante para decidir. El detalle completo queda
                          aparte, siempre a mano.
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
                        Disponible para clientes con cuenta. Simulas el plan, confirmas el pedido y
                        despues sigues cuotas, comprobantes y estados desde tu panel.
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
              </section>

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

            <aside className="xl:sticky xl:top-24">
              <div className="rounded-[32px] bg-gray-950 p-6 text-white shadow-[0_28px_80px_-42px_rgba(15,23,42,0.7)]">
                <div className="border-b border-white/10 pb-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-400">
                    Resumen final
                  </p>
                  <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
                    {hasItemsRequiringArtwork ? 'Pedido y produccion' : 'Pedido listo para confirmar'}
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-gray-300">
                    Todo lo importante queda visible antes de enviar la orden.
                  </p>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                      Medio elegido
                    </p>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-orange-300">
                        <SelectedPaymentIcon size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{selectedPaymentOption.label}</p>
                        <p className="text-xs text-gray-400">{selectedPaymentOption.desc}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                      Total visible
                    </p>
                    <p className="mt-2 text-3xl font-black text-white">
                      ${total().toLocaleString('es-AR')}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {items.length} linea{items.length === 1 ? '' : 's'} en este pedido
                    </p>
                  </div>
                </div>

                {hasUnavailableItems && (
                  <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
                    Hay productos con precio 0 en tu carrito. Quita esas piezas o elige una
                    variante disponible antes de confirmar.
                  </div>
                )}

                <div className="mt-5 space-y-3 pr-1 xl:max-h-[calc(100vh-26rem)] xl:overflow-y-auto xl:pr-2">
                  {items.map((item) => (
                    <div
                      key={item.cartItemId || item.productId}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white">
                            {item.name} x{item.quantity}
                          </p>
                          {item.selectedOptions && item.selectedOptions.length > 0 && (
                            <p className="mt-1 text-xs text-gray-400">
                              {item.selectedOptions.map((option) => option.value).join(' - ')}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 text-sm font-semibold text-orange-300">
                          ${(item.price * item.quantity).toLocaleString('es-AR')}
                        </span>
                      </div>

                      <OrderItemOptions item={item} compact />
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between text-sm text-gray-300">
                    <span>Subtotal</span>
                    <span>${total().toLocaleString('es-AR')}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-xl font-black text-white">
                    <span>Total</span>
                    <span>${total().toLocaleString('es-AR')}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={
                    loading ||
                    hasUnavailableItems ||
                    (paymentType === 'ZAP_CREDIT' &&
                      (zapCreditDisabled || !zapCreditSelection || isLoadingCreditEligibility))
                  }
                  className={`mt-5 flex w-full items-center justify-center rounded-[24px] px-6 py-4 text-sm font-semibold transition-all ${
                    loading ||
                    hasUnavailableItems ||
                    (paymentType === 'ZAP_CREDIT' &&
                      (zapCreditDisabled || !zapCreditSelection || isLoadingCreditEligibility))
                      ? 'cursor-not-allowed bg-white/10 text-gray-400'
                      : 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 hover:-translate-y-0.5 hover:bg-orange-400'
                  }`}
                >
                  {submitLabel}
                </button>
              </div>
            </aside>
          </div>
        </form>
      </div>
    </div>
  )
}
