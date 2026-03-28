import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Download, MessageSquare, Package, Palette } from 'lucide-react'
import { auth } from '@/auth'
import { getCustomerOrder } from '@/lib/orders'
import OrderFileUploader from '@/components/public/OrderFileUploader'
import { buildWhatsappUrl } from '@/lib/whatsapp'
import { getOrderDisplayCode } from '@/lib/orders-workflow'

export const dynamic = 'force-dynamic'

const statusLabel: Record<string, string> = {
  PENDING: 'Pendiente',
  PAID: 'Pagado',
  PROCESSING: 'En produccion',
  READY: 'Listo para retirar',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
}

const statusColor: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  PAID: 'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-purple-100 text-purple-700',
  READY: 'bg-green-100 text-green-700',
  DELIVERED: 'bg-gray-100 text-gray-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

export default async function MiOrdenPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { id } = await params
  const order = await getCustomerOrder(id)

  if (!order) notFound()

  const paymentLabels: Record<string, string> = {
    MERCADOPAGO: 'MercadoPago',
    TRANSFER: 'Transferencia bancaria',
    CASH: 'Efectivo',
  }

  const orderCode = getOrderDisplayCode(order.id)
  const filesWhatsappUrl = buildWhatsappUrl(
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER,
    `Hola! Te envio los archivos de mi orden #${orderCode}.`
  )
  const hasUploadableItems = order.items.some((item) => !item.isService && !item.designRequested)

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <Link href="/perfil" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft size={16} /> Volver a mi perfil
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package size={24} className="text-orange-500" /> Pedido
          </h1>
          <p className="text-sm text-gray-400 font-mono mt-1">#{orderCode}</p>
        </div>
        <span className={`text-sm font-semibold px-3 py-1.5 rounded-full ${statusColor[order.status]}`}>
          {statusLabel[order.status]}
        </span>
      </div>

      <div className="card overflow-hidden">
        <div className="divide-y divide-gray-100">
          {order.items.map((item) => {
            const downloadHref = `/api/orders/${order.id}/items/${item.id}/download`
            const hasUploadedFile = Boolean(item.fileObjectKey || item.fileUrl)

            return (
              <div key={item.id} className="p-4 flex items-center gap-4">
                {item.product.images[0] ? (
                  <img
                    src={item.product.images[0]}
                    alt={item.product.name}
                    className="w-14 h-14 rounded-xl object-cover bg-gray-100"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-orange-50 flex items-center justify-center text-2xl">
                    P
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{item.product.name}</p>
                  {item.notes && <p className="text-xs text-gray-400 mt-0.5">Nota: {item.notes}</p>}

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {hasUploadedFile && (
                      <a
                        href={downloadHref}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 transition-colors"
                      >
                        <Download size={14} /> Descargar archivo
                      </a>
                    )}
                    {item.artworkSubmissionChannel === 'WHATSAPP' && !hasUploadedFile && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                        <MessageSquare size={14} /> Envio por WhatsApp
                      </span>
                    )}
                    {item.designRequested && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-1 rounded">
                        <Palette size={14} /> Requiere diseno
                      </span>
                    )}
                    {item.isService && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded">
                        <Package size={14} /> Servicio
                      </span>
                    )}
                    {!item.isService && !item.designRequested && !hasUploadedFile && item.artworkSubmissionChannel !== 'WHATSAPP' && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded">
                        <Package size={14} /> Esperando archivo
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-500 mt-1">
                    {item.quantity} x ${item.unitPrice.toLocaleString('es-AR')}
                  </p>
                </div>
                <p className="font-bold text-gray-900 shrink-0">
                  ${(item.quantity * item.unitPrice).toLocaleString('es-AR')}
                </p>
              </div>
            )
          })}
        </div>
        <div className="p-4 bg-gray-50 flex justify-between font-bold text-gray-900">
          <span>Total</span>
          <span className="text-orange-500">${order.total.toLocaleString('es-AR')}</span>
        </div>
      </div>

      {hasUploadableItems && (
        <OrderFileUploader orderId={order.id} whatsappUrl={filesWhatsappUrl} items={order.items as any} />
      )}

      <div className="card p-5 space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Fecha</span>
          <span className="font-medium">
            {new Date(order.createdAt).toLocaleDateString('es-AR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Forma de pago</span>
          <span className="font-medium">{paymentLabels[order.paymentType]}</span>
        </div>
        {order.notes && (
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">Notas</span>
            <span className="font-medium text-right">{order.notes}</span>
          </div>
        )}
        {order.receiptUrl && (
          <div className="flex justify-between">
            <span className="text-gray-500">Comprobante</span>
            <a href={order.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline font-medium">
              Ver comprobante
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
