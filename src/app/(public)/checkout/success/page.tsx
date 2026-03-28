import Link from 'next/link'
import { CheckCircle2, MessageSquare } from 'lucide-react'
import { getPaymentFrequencyLabel } from '@/lib/financing-calculator'
import { getOrderForViewer } from '@/lib/orders'
import OrderFileUploader from '@/components/public/OrderFileUploader'
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
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <h1 className="text-2xl font-bold mb-4 text-red-500">Error</h1>
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
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <h1 className="text-2xl font-bold mb-4 text-red-500">Acceso no disponible</h1>
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

  return (
    <div className="max-w-3xl mx-auto px-4 py-20 space-y-6">
      <div className="text-center">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={40} className="text-green-500" />
        </div>

        <h1 className="text-3xl font-black text-gray-900 mb-2">Pedido confirmado</h1>
        <p className="text-gray-500">
          Tu orden ya quedo registrada.
          {emailLabel ? (
            <>
              <br />
              Te enviamos una copia del detalle a <strong>{emailLabel}</strong>.
            </>
          ) : null}
        </p>
      </div>

      <div className="card p-6 text-left">
        <div className="flex justify-between items-center mb-6 pb-6 border-b border-gray-100">
          <div>
            <p className="text-sm text-gray-500 mb-1">Numero de orden</p>
            <p className="font-mono font-bold text-lg text-gray-900">#{orderCode}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500 mb-1">Total</p>
            <p className="font-bold text-xl text-orange-500">
              ${order.total.toLocaleString('es-AR')}
            </p>
          </div>
        </div>

        {order.paymentType === 'ZAP_CREDIT' && order.status === 'PENDING' ? (
          <div className="bg-orange-50 p-5 rounded-xl border border-orange-100">
            <h3 className="font-bold text-orange-900 mb-2">Solicitud de Credito ZAP recibida</h3>
            <p className="text-sm text-orange-800">
              Ya registramos tu pedido. El equipo de ZAP te va a contactar para cerrar el plan,
              confirmar el anticipo y definir el cronograma fijo.
            </p>
            {order.zapCreditPlan && (
              <div className="mt-4 rounded-xl border border-orange-200 bg-white/70 p-4 text-sm text-orange-900">
                <p>
                  Anticipo estimado:{' '}
                  <strong>
                    ${order.zapCreditPlan.downPaymentAmount.toLocaleString('es-AR')} ({order.zapCreditPlan.downPaymentPercent.toLocaleString('es-AR')}%)
                  </strong>
                </p>
                <p className="mt-1">
                  Borrador actual:{' '}
                  <strong>
                    {order.zapCreditPlan.installments} pagos · frecuencia {getPaymentFrequencyLabel(order.zapCreditPlan.paymentFrequency).toLowerCase()}
                  </strong>
                </p>
              </div>
            )}
          </div>
        ) : order.paymentType === 'TRANSFER' && order.status === 'PENDING' && !order.receiptUrl ? (
          <div className="bg-orange-50 p-5 rounded-xl border border-orange-100">
            <h3 className="font-bold text-orange-900 mb-2">Falta el comprobante de pago</h3>
            <p className="text-sm text-orange-800 mb-4">
              Realiza la transferencia y envia el comprobante indicando tu numero de orden:
              <strong> #{orderCode}</strong>.
            </p>
            {receiptWhatsappUrl && (
              <a
                href={receiptWhatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-primary w-full justify-center !bg-[#25D366] !shadow-[#25D366]/30 hover:!bg-[#1ebc5a]"
              >
                Enviar comprobante por WhatsApp
              </a>
            )}
          </div>
        ) : order.paymentType === 'CASH' ? (
          <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-2">Pago en efectivo</h3>
            <p className="text-sm text-gray-600">
              Te esperamos en el local para abonar y retirar tu pedido cuando este listo.
            </p>
          </div>
        ) : order.status === 'PAID' ? (
          <div className="bg-green-50 text-green-800 p-4 rounded-xl text-sm font-medium">
            Pago acreditado con exito.
          </div>
        ) : order.status === 'PROCESSING' ? (
          <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm font-medium">
            Ya tenemos todo lo necesario y tu orden paso a produccion.
          </div>
        ) : pending ? (
          <div className="bg-yellow-50 text-yellow-800 p-4 rounded-xl text-sm font-medium">
            Tu pago esta siendo procesado por MercadoPago. Te avisaremos cuando se acredite.
          </div>
        ) : null}

        {order.paymentType === 'ZAP_CREDIT' && order.zapCreditPlan && order.status !== 'PENDING' && (
          <div className="mt-4 rounded-xl border border-orange-100 bg-orange-50 p-4 text-sm text-orange-900">
            <p>
              Propuesta activa:{' '}
              <strong>
                ${order.zapCreditPlan.downPaymentAmount.toLocaleString('es-AR')} de anticipo y{' '}
                {order.zapCreditPlan.installments} pagos de $
                {order.zapCreditPlan.installmentAmount.toLocaleString('es-AR')}
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
        <div className="bg-orange-50 rounded-2xl shadow-sm p-6 border border-orange-200 text-center">
          <MessageSquare size={32} className="mx-auto text-orange-500 mb-3" />
          <h3 className="font-bold text-gray-900 mb-2">Solicitaste diseno</h3>
          <p className="text-sm text-gray-600 mb-4">
            Abrinos por WhatsApp para coordinar referencias, textos y detalles del trabajo.
          </p>
          <a
            href={designWhatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-primary w-full justify-center !bg-[#25D366] !shadow-[#25D366]/30 hover:!bg-[#1ebc5a]"
          >
            Coordinar diseno por WhatsApp
          </a>
        </div>
      )}

      <Link href="/" className="btn-secondary !w-full justify-center">
        Volver a la tienda
      </Link>
    </div>
  )
}
