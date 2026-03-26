export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { getOrder } from '@/lib/actions/orders'
import { CheckCircle2, Copy } from 'lucide-react'

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string; pending?: string }>
}) {
  const { orderId, pending } = await searchParams

  if (!orderId) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <h1 className="text-2xl font-bold mb-4 text-red-500">Error</h1>
        <p className="mb-8">No se encontrÃ³ el nÃºmero de orden.</p>
        <Link href="/" className="btn-primary">Volver al inicio</Link>
      </div>
    )
  }

  const order = await getOrder(orderId)

  return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center">
      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
        <CheckCircle2 size={40} className="text-green-500" />
      </div>

      <h1 className="text-3xl font-black text-gray-900 mb-2">Â¡Pedido confirmado!</h1>
      <p className="text-gray-500 mb-8">
        Tu orden ha sido registrada correctamente.
        <br />
        Te enviamos una copia del detalle a <strong>{order?.guestEmail}</strong>.
      </p>

      <div className="card p-6 text-left mb-8">
        <div className="flex justify-between items-center mb-6 pb-6 border-b border-gray-100">
          <div>
            <p className="text-sm text-gray-500 mb-1">NÃºmero de orden</p>
            <p className="font-mono font-bold text-lg text-gray-900 flex items-center gap-2">
              #{orderId.slice(-8).toUpperCase()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500 mb-1">Total</p>
            <p className="font-bold text-xl text-orange-500">${order?.total.toLocaleString('es-AR')}</p>
          </div>
        </div>

        {order?.paymentType === 'TRANSFER' && order.status === 'PENDING' && !order.receiptUrl ? (
          <div className="bg-orange-50 p-5 rounded-xl border border-orange-100">
            <h3 className="font-bold text-orange-900 mb-2 flex items-center gap-2">
              âš ï¸ Falta el comprobante de pago
            </h3>
            <p className="text-sm text-orange-800 mb-4">
              RealizÃ¡ la transferencia al CVU <strong>00000031000123456789</strong> y envianos el comprobante por WhatsApp
              indicando tu nÃºmero de orden: <strong>#{orderId.slice(-8).toUpperCase()}</strong>.
            </p>
            <a href={`https://wa.me/5491100000000?text=Hola! Te paso el comprobante de mi orden #${orderId.slice(-8).toUpperCase()}`}
              target="_blank" rel="noreferrer"
              className="btn-primary w-full justify-center !bg-[#25D366] !shadow-[#25D366]/30 hover:!bg-[#1ebc5a]">
              Enviar por WhatsApp
            </a>
          </div>
        ) : order?.paymentType === 'CASH' ? (
          <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-2">Pago en efectivo</h3>
            <p className="text-sm text-gray-600 mb-4">
              Te esperamos en nuestro local (Av. Siempreviva 742) para que puedas abonar y retirar tu pedido.
            </p>
          </div>
        ) : order?.status === 'PAID' ? (
          <div className="bg-green-50 text-green-800 p-4 rounded-xl text-sm font-medium flex items-center justify-center gap-2">
            <CheckCircle2 size={18} /> Pago acreditado con Ã©xito
          </div>
        ) : pending ? (
          <div className="bg-yellow-50 text-yellow-800 p-4 rounded-xl text-sm font-medium">
            â³ Tu pago estÃ¡ siendo procesado por MercadoPago. Te avisaremos cuando se acredite.
          </div>
        ) : null}
      </div>

      <Link href="/" className="btn-secondary !w-full justify-center">
        Volver a la tienda
      </Link>
    </div>
  )
}
