import { getOrder, updateOrderStatus, confirmManualPayment } from '@/lib/actions/orders'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CreditCard, Banknote, Smartphone, Receipt, CheckCircle, PackageOpen, Download, Palette } from 'lucide-react'

export const metadata = { title: 'Detalle de Orden | ZAP Admin' }

const statuses = ['PENDING', 'PAID', 'PROCESSING', 'READY', 'DELIVERED', 'CANCELLED'] as const

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const order = await getOrder(id)
  if (!order) notFound()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/ordenes" className="btn-secondary !p-2">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          Orden #{order.id.slice(-8).toUpperCase()}
        </h1>
        <span className="badge bg-gray-100 text-gray-600 font-mono ml-auto">
          {new Date(order.createdAt).toLocaleString('es-AR')}
        </span>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Info lateral */}
        <div className="space-y-6">
          <div className="card p-5">
            <h3 className="font-bold text-gray-900 mb-4 border-b pb-2">Cliente</h3>
            <p className="font-medium">{order.guestName}</p>
            <p className="text-sm text-gray-600 break-all">{order.guestEmail}</p>
            <p className="text-sm text-gray-600 mt-1">{order.guestPhone}</p>
          </div>

          <div className="card p-5">
            <h3 className="font-bold text-gray-900 mb-4 border-b pb-2">Estado y Cobro</h3>

            <div className="flex flex-col gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Estado actual</p>
                <form action={async (data) => {
                  'use server'
                  await updateOrderStatus(order.id, data.get('status') as string)
                }}>
                  <select
                    name="status"
                    defaultValue={order.status}
                    className="input font-semibold"
                    onChange={(e) => e.target.form?.submit()}
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </form>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">Método de pago</p>
                <div className="flex items-center gap-2 font-medium text-gray-900">
                  {order.paymentType === 'MERCADOPAGO' ? <CreditCard size={18} className="text-blue-500"/> :
                   order.paymentType === 'TRANSFER' ? <Smartphone size={18} className="text-green-500" /> :
                   <Banknote size={18} className="text-orange-500"/>}
                  {order.paymentType}
                </div>
                {order.paymentId && <p className="text-xs text-gray-500 font-mono mt-1">ID: {order.paymentId}</p>}
              </div>

              {order.paymentType !== 'MERCADOPAGO' && order.status === 'PENDING' && (
                <div className="pt-4 border-t">
                  <form action={async () => {
                    'use server'
                    await confirmManualPayment(order.id)
                  }}>
                    <button type="submit" className="btn-primary w-full justify-center !text-xs !py-2 !bg-green-600 hover:!bg-green-700">
                      <CheckCircle size={14} /> Confirmar Pago Manual
                    </button>
                  </form>
                </div>
              )}

              {order.receiptUrl && (
                <a href={order.receiptUrl} target="_blank" rel="noreferrer"
                   className="btn-secondary w-full justify-center !text-xs !py-2 mt-2">
                  <Receipt size={14} /> Ver Comprobante
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Artículos */}
        <div className="md:col-span-2 space-y-6">
          <div className="card p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <PackageOpen size={20} className="text-orange-500" />
              Artículos del pedido
            </h3>

            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-bold text-gray-900 text-sm">
                        {item.quantity}x {item.product.name}
                      </h4>
                      <p className="font-bold text-orange-600">
                        ${(item.unitPrice * item.quantity).toLocaleString('es-AR')}
                      </p>
                    </div>
                    {item.selectedOptions && item.selectedOptions.length > 0 && (
                      <p className="text-xs text-gray-500 mb-1 font-medium">
                        {item.selectedOptions.map((opt: any) => opt.valueName).join(' • ')}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mb-2">${item.unitPrice.toLocaleString('es-AR')} c/u</p>

                    {(item.fileUrl || item.designRequested) && (
                      <div className="flex gap-2 mb-3">
                        {item.fileUrl && (
                          <a href={item.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">
                            <Download size={14} /> Descargar Archivo Cliente
                          </a>
                        )}
                        {item.designRequested && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-lg">
                            <Palette size={14} /> Diseño a coordinar
                          </span>
                        )}
                      </div>
                    )}

                    {item.notes && (
                      <div className="bg-white p-3 rounded-lg border border-orange-100 text-sm text-gray-700">
                        <span className="font-bold text-orange-500 block mb-1">Nota del cliente:</span>
                        {item.notes}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t flex justify-end">
              <div className="text-right">
                <p className="text-sm text-gray-500 mb-1">Total</p>
                <p className="text-3xl font-black text-gray-900">${order.total.toLocaleString('es-AR')}</p>
              </div>
            </div>
          </div>

          {order.notes && (
            <div className="card p-6 bg-orange-50/50 border-orange-100">
              <h3 className="font-bold text-orange-900 mb-2">Notas generales del pedido</h3>
              <p className="text-sm text-gray-700">{order.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
