import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  MessageSquare,
  Package,
  ReceiptText,
  Wallet,
} from 'lucide-react'
import { getPaymentFrequencyLabel } from '@/lib/financing-calculator'
import { getOrderForViewer } from '@/lib/orders'
import OrderFileUploader from '@/components/public/OrderFileUploader'
import OrderReceiptUploader from '@/components/public/OrderReceiptUploader'
import ResumePaymentButton from '@/components/public/ResumePaymentButton'
import { buildWhatsappUrl } from '@/lib/whatsapp'
import { getOrderDisplayCode } from '@/lib/orders-workflow'

export const dynamic = 'force-dynamic'

const paymentTypeLabels = {
  MERCADOPAGO: 'Tarjeta / MercadoPago',
  TRANSFER: 'Transferencia',
  CASH: 'Efectivo',
  ZAP_CREDIT: 'Credito ZAP',
} as const

const orderStatusLabels = {
  PENDING: 'Pendiente',
  PAID: 'Pagado',
  PROCESSING: 'En produccion',
  READY: 'Listo para entregar',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
} as const

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string; pending?: string; token?: string }>
}) {
  const { orderId, pending, token } = await searchParams

  if (!orderId) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="mb-4 text-2xl font-bold text-red-500">Error</h1>
        <p className="mb-8">No encontramos el numero de orden.</p>
        <Link href="/" className="btn-primary">
          Volver al inicio
        </Link>
      </div>
    )
  }

  const order = await getOrderForViewer(orderId, token)
  if (!order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="mb-4 text-2xl font-bold text-red-500">Acceso no disponible</h1>
        <p className="mb-8">
          Este enlace ya no es valido o la orden no pertenece a tu sesion actual.
        </p>
        <Link href="/" className="btn-primary">
          Volver al inicio
        </Link>
      </div>
    )
  }

  const orderCode = getOrderDisplayCode(order.id)
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
  const receiptWhatsappUrl = buildWhatsappUrl(
    whatsappNumber,
    `Hola! Te paso el comprobante de mi orden #${orderCode}.`
  )
  const filesWhatsappUrl = buildWhatsappUrl(
    whatsappNumber,
    `Hola! Te envio los archivos de mi orden #${orderCode}.`
  )
  const designWhatsappUrl = buildWhatsappUrl(
    whatsappNumber,
    `Hola! Acabo de confirmar la orden #${orderCode} y necesito coordinar el diseno.`
  )
  const needsDesign = order.items.some((item) => item.designRequested)
  const hasUploadableItems = order.items.some((item) => !item.isService && !item.designRequested)
  const emailLabel = order.guestEmail || order.user?.email
  const creditPlan = order.zapCreditPlan
  const isAutoApprovedCredit = creditPlan?.status === 'APPROVED'
  const isMpPending = order.paymentType === 'MERCADOPAGO' && order.status === 'PENDING'
  const paymentLabel = paymentTypeLabels[order.paymentType as keyof typeof paymentTypeLabels] ?? order.paymentType
  const statusLabel = orderStatusLabels[order.status as keyof typeof orderStatusLabels] ?? order.status
  const itemCount = order.items.length

  const heroTitle = isMpPending ? 'Pago pendiente' : 'Pedido confirmado'
  const heroDescription = isMpPending
    ? 'Tu orden ya fue registrada, pero el pago todavia no se completo.'
    : 'Tu pedido ya quedo en marcha.'

  return (
    <div className="bg-[linear-gradient(180deg,#ffffff_0%,#fff8f1_18%,#f8fafc_100%)]">
      <div className="mx-auto max-w-[1380px] px-4 pb-16 pt-8 sm:pt-10 xl:px-8">
        <section className="rounded-[32px] border border-gray-200 bg-white p-6 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.35)] sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)] lg:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                    isMpPending
                      ? 'bg-yellow-50 text-yellow-800'
                      : 'bg-emerald-50 text-emerald-700'
                  }`}
                >
                  {heroTitle}
                </span>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-600">
                  Orden #{orderCode}
                </span>
              </div>

              <h1 className="mt-4 text-4xl font-black tracking-tight text-gray-950 sm:text-5xl">
                {heroTitle}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-gray-600">
                {heroDescription}
                {emailLabel && !isMpPending ? (
                  <>
                    {' '}
                    Te enviamos el detalle a <strong>{emailLabel}</strong>.
                  </>
                ) : null}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                  Total
                </p>
                <p className="mt-2 text-2xl font-black text-gray-950">
                  ${order.total.toLocaleString('es-AR')}
                </p>
                <p className="mt-1 text-sm text-gray-600">importe visible del pedido</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                  Pago
                </p>
                <p className="mt-2 text-base font-bold text-gray-950">{paymentLabel}</p>
                <p className="mt-1 text-sm text-gray-600">medio elegido en checkout</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                  Estado
                </p>
                <p className="mt-2 text-base font-bold text-gray-950">{statusLabel}</p>
                <p className="mt-1 text-sm text-gray-600">{itemCount} linea{itemCount === 1 ? '' : 's'} activas</p>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
          <div className="space-y-6">
            <section className="rounded-[32px] border border-gray-200 bg-white p-6 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.35)] sm:p-8">
              <div className="mb-6 border-b border-gray-100 pb-6">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
                  Estado principal
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-gray-950">
                  Seguimiento inmediato de la orden.
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-gray-600">
                  Aca concentramos lo urgente: pago, anticipo, comprobantes y el siguiente paso
                  real para que no tengas que buscarlo.
                </p>
              </div>

              {isMpPending ? (
                <div className="rounded-[28px] border border-yellow-200 bg-yellow-50 p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-700">
                      <Clock size={22} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-black text-yellow-950">
                        El pago quedo a mitad de camino
                      </h3>
                      <p className="mt-2 text-sm leading-7 text-yellow-900">
                        Tu orden esta reservada. Puedes retomarlo desde aca cuando quieras, sin
                        generar una orden nueva.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 max-w-md">
                    <ResumePaymentButton orderId={order.id} accessToken={token} />
                  </div>
                </div>
              ) : order.paymentType === 'ZAP_CREDIT' && order.status === 'PENDING' ? (
                <div className="rounded-[28px] border border-orange-200 bg-orange-50 p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
                      <Wallet size={22} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-black text-orange-950">
                        {isAutoApprovedCredit
                          ? 'Credito ZAP aprobado automaticamente'
                          : 'Solicitud de Credito ZAP en revision'}
                      </h3>
                      <p className="mt-2 text-sm leading-7 text-orange-900">
                        {isAutoApprovedCredit
                          ? 'Tu plan ya quedo aprobado. Solo falta acreditar el anticipo para activar la orden y poner el trabajo en marcha.'
                          : 'Tu solicitud ya quedo cargada. Ahora revisamos las condiciones para confirmarte el siguiente paso.'}
                      </p>
                    </div>
                  </div>

                  {creditPlan && (
                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                      <div className="rounded-2xl border border-orange-200 bg-white/80 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700">
                          Anticipo
                        </p>
                        <p className="mt-2 text-lg font-black text-orange-950">
                          ${creditPlan.downPaymentAmount.toLocaleString('es-AR')}
                        </p>
                        <p className="mt-1 text-xs text-orange-800">
                          {creditPlan.downPaymentPercent.toLocaleString('es-AR')}% del pedido
                        </p>
                      </div>
                      <div className="rounded-2xl border border-orange-200 bg-white/80 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700">
                          Plan
                        </p>
                        <p className="mt-2 text-lg font-black text-orange-950">
                          {creditPlan.installments} pagos
                        </p>
                        <p className="mt-1 text-xs text-orange-800">
                          {getPaymentFrequencyLabel(creditPlan.paymentFrequency)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-orange-200 bg-white/80 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700">
                          Estado del plan
                        </p>
                        <p className="mt-2 text-lg font-black text-orange-950">{creditPlan.status}</p>
                        <p className="mt-1 text-xs text-orange-800">seguimiento centralizado</p>
                      </div>
                    </div>
                  )}

                  <div className="mt-5 space-y-3">
                    <div className="max-w-md">
                      <ResumePaymentButton
                        orderId={order.id}
                        accessToken={token}
                        label="Pagar anticipo con MercadoPago"
                      />
                    </div>
                    {receiptWhatsappUrl && (
                      <div className="flex flex-wrap gap-3">
                        <a
                          href={receiptWhatsappUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-primary bg-[#25D366] shadow-[#25D366]/30 hover:bg-[#1ebc5a]"
                        >
                          Enviar por WhatsApp
                        </a>
                      </div>
                    )}
                    {!order.receiptUrl ? (
                      <OrderReceiptUploader orderId={order.id} accessToken={token} />
                    ) : (
                      <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700">
                        Ya recibimos tu comprobante.
                      </div>
                    )}
                  </div>
                </div>
              ) : order.paymentType === 'TRANSFER' && order.status === 'PENDING' ? (
                <div className="rounded-[28px] border border-orange-200 bg-orange-50 p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
                      <ReceiptText size={22} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-black text-orange-950">
                        Falta el comprobante de pago
                      </h3>
                      <p className="mt-2 text-sm leading-7 text-orange-900">
                        Haz la transferencia y envianos el comprobante con tu numero de orden:
                        <strong> #{orderCode}</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {receiptWhatsappUrl && (
                      <a
                        href={receiptWhatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-primary bg-[#25D366] shadow-[#25D366]/30 hover:bg-[#1ebc5a]"
                      >
                        Enviar comprobante por WhatsApp
                      </a>
                    )}

                    {!order.receiptUrl ? (
                      <OrderReceiptUploader orderId={order.id} accessToken={token} />
                    ) : (
                      <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700">
                        Ya recibimos tu comprobante y lo estamos revisando.
                      </div>
                    )}
                  </div>
                </div>
              ) : order.paymentType === 'CASH' ? (
                <div className="rounded-[28px] border border-gray-200 bg-gray-50 p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-gray-700 shadow-sm">
                      <Wallet size={22} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-gray-950">Pago en efectivo</h3>
                      <p className="mt-2 text-sm leading-7 text-gray-600">
                        Te esperamos en el local para abonar y retirar tu pedido cuando este listo.
                      </p>
                    </div>
                  </div>
                </div>
              ) : order.status === 'PAID' ? (
                <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                      <CheckCircle2 size={22} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-emerald-950">Pago acreditado</h3>
                      <p className="mt-2 text-sm leading-7 text-emerald-900">
                        Ya podemos seguir con el trabajo.
                      </p>
                    </div>
                  </div>
                </div>
              ) : order.status === 'PROCESSING' ? (
                <div className="rounded-[28px] border border-blue-200 bg-blue-50 p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                      <Package size={22} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-blue-950">Pedido en produccion</h3>
                      <p className="mt-2 text-sm leading-7 text-blue-900">
                        Ya tenemos todo lo necesario. Tu pedido paso a produccion.
                      </p>
                    </div>
                  </div>
                </div>
              ) : pending ? (
                <div className="rounded-[28px] border border-yellow-200 bg-yellow-50 p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-700">
                      <Clock size={22} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-yellow-950">Pago en proceso</h3>
                      <p className="mt-2 text-sm leading-7 text-yellow-900">
                        MercadoPago esta procesando tu pago. Te avisamos apenas se acredite.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="mt-6 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                    Pedido recibido
                  </p>
                  <p className="mt-2 text-sm font-semibold text-gray-900">
                    La orden ya quedo generada con codigo #{orderCode}.
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                    Pago y validacion
                  </p>
                  <p className="mt-2 text-sm font-semibold text-gray-900">
                    El siguiente paso depende del medio de pago elegido y su acreditacion.
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                    Produccion
                  </p>
                  <p className="mt-2 text-sm font-semibold text-gray-900">
                    {hasUploadableItems || needsDesign
                      ? 'Si faltan archivos o diseno, lo resolvemos en esta misma pantalla.'
                      : 'Todo esta encaminado para pasar a produccion sin pasos extra.'}
                  </p>
                </div>
              </div>
            </section>

            {order.paymentType === 'ZAP_CREDIT' && creditPlan && order.status !== 'PENDING' && (
              <section className="rounded-[32px] border border-orange-200 bg-gradient-to-br from-orange-50 via-white to-amber-50 p-6 shadow-[0_18px_50px_-42px_rgba(249,115,22,0.35)] sm:p-8">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
                  Credito ZAP
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-gray-950">
                  Plan activo
                </h2>
                <p className="mt-3 text-sm leading-7 text-gray-600">
                  ${creditPlan.downPaymentAmount.toLocaleString('es-AR')} de anticipo y{' '}
                  {creditPlan.installments} pagos de $
                  {creditPlan.installmentAmount.toLocaleString('es-AR')}.
                </p>
              </section>
            )}

            {hasUploadableItems && (
              <OrderFileUploader
                orderId={order.id}
                accessToken={token}
                whatsappUrl={filesWhatsappUrl}
                items={order.items as any}
              />
            )}

            {needsDesign && designWhatsappUrl && (
              <section className="rounded-[32px] border border-orange-200 bg-white p-6 shadow-[0_18px_50px_-42px_rgba(249,115,22,0.28)] sm:p-8">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                    <MessageSquare size={22} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
                      Diseno solicitado
                    </p>
                    <h2 className="mt-2 text-3xl font-black tracking-tight text-gray-950">
                      Coordinamos referencias y detalles.
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-gray-600">
                      Abrinos por WhatsApp y coordinamos referencias, textos y detalles del trabajo.
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <a
                    href={designWhatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-primary bg-[#25D366] shadow-[#25D366]/30 hover:bg-[#1ebc5a]"
                  >
                    Coordinar diseno por WhatsApp
                  </a>
                </div>
              </section>
            )}

            {order.invoiceUrl && (
              <section className="rounded-[32px] border border-blue-200 bg-white p-6 shadow-[0_18px_50px_-42px_rgba(59,130,246,0.2)] sm:p-8">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <FileText size={22} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
                      Factura disponible
                    </p>
                    <h2 className="mt-2 text-3xl font-black tracking-tight text-gray-950">
                      Documento listo para consultar.
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-gray-600">
                      Ya dejamos la factura vinculada a esta orden para que la tengas siempre a mano.
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <a
                    href={order.invoiceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary"
                  >
                    Ver factura
                  </a>
                </div>
              </section>
            )}
          </div>

          <aside className="xl:sticky xl:top-24">
            <div className="rounded-[32px] bg-gray-950 p-6 text-white shadow-[0_28px_80px_-42px_rgba(15,23,42,0.7)]">
              <div className="border-b border-white/10 pb-5">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-400">
                  Resumen de la orden
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
                  {heroTitle}
                </h2>
                <p className="mt-2 text-sm leading-7 text-gray-300">
                  Codigo, importe, estado y composicion del pedido en una sola lectura.
                </p>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                    Numero de orden
                  </p>
                  <p className="mt-2 font-mono text-2xl font-black text-white">#{orderCode}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                    Total
                  </p>
                  <p className="mt-2 text-3xl font-black text-white">
                    ${order.total.toLocaleString('es-AR')}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Pago</span>
                  <span className="font-semibold text-white">{paymentLabel}</span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-sm">
                  <span className="text-gray-400">Estado</span>
                  <span className="font-semibold text-white">{statusLabel}</span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-sm">
                  <span className="text-gray-400">Lineas</span>
                  <span className="font-semibold text-white">{itemCount}</span>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white">
                          {item.product.name} x{item.quantity}
                        </p>
                        {item.selectedOptions.length > 0 && (
                          <p className="mt-1 text-xs text-gray-400">
                            {item.selectedOptions.map((option) => option.value).join(' - ')}
                          </p>
                        )}
                        <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-gray-500">
                          {item.isService
                            ? 'Servicio'
                            : item.designRequested
                              ? 'Diseno solicitado'
                              : item.fileUrl || item.fileObjectKey
                                ? 'Archivo cargado'
                                : 'Archivo pendiente'}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-orange-300">
                        ${(item.unitPrice * item.quantity).toLocaleString('es-AR')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 space-y-3">
                {order.userId ? (
                  <Link
                    href={`/perfil/ordenes/${order.id}`}
                    className="flex w-full items-center justify-center gap-2 rounded-[24px] bg-orange-500 px-6 py-4 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 transition-all hover:-translate-y-0.5 hover:bg-orange-400"
                  >
                    Ver detalle de la compra <ArrowRight size={18} />
                  </Link>
                ) : (
                  <Link
                    href="/"
                    className="flex w-full items-center justify-center gap-2 rounded-[24px] bg-orange-500 px-6 py-4 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 transition-all hover:-translate-y-0.5 hover:bg-orange-400"
                  >
                    Volver a la tienda <ArrowRight size={18} />
                  </Link>
                )}

                <Link href="/productos" className="btn-secondary w-full justify-center">
                  Seguir explorando productos
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
