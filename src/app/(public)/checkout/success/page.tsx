import Link from 'next/link'
import { CheckCircle2, Clock, MessageSquare } from 'lucide-react'
import { getPaymentFrequencyLabel } from '@/lib/financing-calculator'
import { getOrderForViewer } from '@/lib/orders'
import OrderFileUploader from '@/components/public/OrderFileUploader'
import ResumePaymentButton from '@/components/public/ResumePaymentButton'
import { buildWhatsappUrl } from '@/lib/whatsapp'
import { getOrderDisplayCode } from '@/lib/orders-workflow'

export const dynamic = 'force-dynamic'

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

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-20">
      <div className="text-center">
        <div
          className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full ${
            isMpPending ? 'bg-yellow-100' : 'bg-green-100'
          }`}
        >
          {isMpPending ? (
            <Clock size={40} className="text-yellow-500" />
          ) : (
            <CheckCircle2 size={40} className="text-green-500" />
          )}
        </div>

        <h1 className="mb-2 text-3xl font-black text-gray-900">
          {isMpPending ? 'Pago pendiente' : 'Pedido confirmado'}
        </h1>
        <p className="text-gray-500">
          {isMpPending
            ? 'Tu orden ya fue registrada pero el pago no fue completado aún.'
            : 'Tu orden ya quedo registrada.'}
          {emailLabel && !isMpPending ? (
            <>
              <br />
              Te enviamos una copia del detalle a <strong>{emailLabel}</strong>.
            </>
          ) : null}
        </p>
      </div>

      <div className="card p-6 text-left">
        <div className="mb-6 flex items-center justify-between border-b border-gray-100 pb-6">
          <div>
            <p className="mb-1 text-sm text-gray-500">Numero de orden</p>
            <p className="font-mono text-lg font-bold text-gray-900">#{orderCode}</p>
          </div>
          <div className="text-right">
            <p className="mb-1 text-sm text-gray-500">Total</p>
            <p className="text-xl font-bold text-orange-500">
              ${order.total.toLocaleString('es-AR')}
            </p>
          </div>
        </div>

        {isMpPending ? (
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-5 space-y-4">
            <div>
              <h3 className="font-bold text-yellow-900 mb-1">El pago no fue completado</h3>
              <p className="text-sm text-yellow-800">
                Tu orden está reservada. Podés retomar el pago en cualquier momento desde este
                enlace — no se creará una nueva orden.
              </p>
            </div>
            <ResumePaymentButton orderId={order.id} accessToken={token} />
          </div>
        ) : order.paymentType === 'ZAP_CREDIT' && order.status === 'PENDING' ? (
          <div className="rounded-xl border border-orange-100 bg-orange-50 p-5">
            <h3 className="mb-2 font-bold text-orange-900">
              {isAutoApprovedCredit
                ? 'Credito ZAP aprobado automaticamente'
                : 'Solicitud de Credito ZAP en revision'}
            </h3>
            <p className="text-sm text-orange-800">
              {isAutoApprovedCredit
                ? 'Tu financiacion ya quedo aprobada. Solo falta acreditar el anticipo para activar la orden y avanzar con la produccion.'
                : 'Detectamos antecedentes de pago a revisar, asi que la solicitud queda cargada con el recargo correspondiente y pendiente de validacion manual.'}
            </p>

            {creditPlan && (
              <div className="mt-4 rounded-xl border border-orange-200 bg-white/70 p-4 text-sm text-orange-900">
                <p>
                  Anticipo estimado:{' '}
                  <strong>
                    ${creditPlan.downPaymentAmount.toLocaleString('es-AR')} ({creditPlan.downPaymentPercent.toLocaleString('es-AR')}%)
                  </strong>
                </p>
                <p className="mt-1">
                  Plan actual:{' '}
                  <strong>
                    {creditPlan.installments} pagos · frecuencia{' '}
                    {getPaymentFrequencyLabel(creditPlan.paymentFrequency).toLowerCase()}
                  </strong>
                </p>
                <p className="mt-1">
                  Estado de credito: <strong>{creditPlan.status}</strong>
                </p>
              </div>
            )}
          </div>
        ) : order.paymentType === 'TRANSFER' && order.status === 'PENDING' && !order.receiptUrl ? (
          <div className="rounded-xl border border-orange-100 bg-orange-50 p-5">
            <h3 className="mb-2 font-bold text-orange-900">Falta el comprobante de pago</h3>
            <p className="mb-4 text-sm text-orange-800">
              Realiza la transferencia y envia el comprobante indicando tu numero de orden:
              <strong> #{orderCode}</strong>.
            </p>
            {receiptWhatsappUrl && (
              <a
                href={receiptWhatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-primary w-full justify-center bg-[#25D366] shadow-[#25D366]/30 hover:bg-[#1ebc5a]"
              >
                Enviar comprobante por WhatsApp
              </a>
            )}
          </div>
        ) : order.paymentType === 'CASH' ? (
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-5">
            <h3 className="mb-2 font-bold text-gray-900">Pago en efectivo</h3>
            <p className="text-sm text-gray-600">
              Te esperamos en el local para abonar y retirar tu pedido cuando este listo.
            </p>
          </div>
        ) : order.status === 'PAID' ? (
          <div className="rounded-xl bg-green-50 p-4 text-sm font-medium text-green-800">
            Pago acreditado con exito.
          </div>
        ) : order.status === 'PROCESSING' ? (
          <div className="rounded-xl bg-blue-50 p-4 text-sm font-medium text-blue-800">
            Ya tenemos todo lo necesario y tu orden paso a produccion.
          </div>
        ) : pending ? (
          <div className="rounded-xl bg-yellow-50 p-4 text-sm font-medium text-yellow-800">
            Tu pago esta siendo procesado por MercadoPago. Te avisaremos cuando se acredite.
          </div>
        ) : null}

        {order.paymentType === 'ZAP_CREDIT' && creditPlan && order.status !== 'PENDING' && (
          <div className="mt-4 rounded-xl border border-orange-100 bg-orange-50 p-4 text-sm text-orange-900">
            <p>
              Propuesta activa:{' '}
              <strong>
                ${creditPlan.downPaymentAmount.toLocaleString('es-AR')} de anticipo y{' '}
                {creditPlan.installments} pagos de $
                {creditPlan.installmentAmount.toLocaleString('es-AR')}
              </strong>
              .
            </p>
          </div>
        )}
      </div>

      {hasUploadableItems && (
        <OrderFileUploader
          orderId={order.id}
          accessToken={token}
          whatsappUrl={filesWhatsappUrl}
          items={order.items as any}
        />
      )}

      {needsDesign && designWhatsappUrl && (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-6 text-center shadow-sm">
          <MessageSquare size={32} className="mx-auto mb-3 text-orange-500" />
          <h3 className="mb-2 font-bold text-gray-900">Solicitaste diseno</h3>
          <p className="mb-4 text-sm text-gray-600">
            Abrinos por WhatsApp para coordinar referencias, textos y detalles del trabajo.
          </p>
          <a
            href={designWhatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-primary w-full justify-center bg-[#25D366] shadow-[#25D366]/30 hover:bg-[#1ebc5a]"
          >
            Coordinar diseno por WhatsApp
          </a>
        </div>
      )}

      <Link href="/" className="btn-secondary w-full justify-center">
        Volver a la tienda
      </Link>
    </div>
  )
}
