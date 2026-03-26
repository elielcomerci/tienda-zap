export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { getOrders } from '@/lib/actions/orders'
import { Eye, Clock, CheckCircle2, PackageIcon, AlertCircle, RefreshCcw, Banknote, CreditCard, Smartphone } from 'lucide-react'

export const metadata = {
  title: 'Ã“rdenes | ZAP Admin',
}

const statusThemes = {
  PENDING: { label: 'Pendiente', color: 'text-orange-600 bg-orange-100', icon: Clock },
  PAID: { label: 'Pagada', color: 'text-green-600 bg-green-100', icon: CheckCircle2 },
  PROCESSING: { label: 'En proceso', color: 'text-blue-600 bg-blue-100', icon: RefreshCcw },
  READY: { label: 'Lista', color: 'text-purple-600 bg-purple-100', icon: PackageIcon },
  DELIVERED: { label: 'Entregada', color: 'text-gray-600 bg-gray-100', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelada', color: 'text-red-600 bg-red-100', icon: AlertCircle },
}

const paymentIcons = {
  MERCADOPAGO: { label: 'MercadoPago', icon: CreditCard },
  TRANSFER: { label: 'Transferencia', icon: Smartphone },
  CASH: { label: 'Efectivo', icon: Banknote },
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; payment?: string }>
}) {
  const { status, payment } = await searchParams
  const orders = await getOrders(status, payment)

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Ã“rdenes</h1>

        {/* Filters */}
        <div className="flex gap-2">
          <form className="flex gap-2">
            <select name="status" defaultValue={status || ''} className="input !py-2 !w-auto text-sm" onChange={(e) => e.target.form?.submit()}>
              <option value="">Todos los estados</option>
              {Object.entries(statusThemes).map(([val, theme]) => (
                <option key={val} value={val}>{theme.label}</option>
              ))}
            </select>
            <select name="payment" defaultValue={payment || ''} className="input !py-2 !w-auto text-sm" onChange={(e) => e.target.form?.submit()}>
              <option value="">Todos los pagos</option>
              {Object.entries(paymentIcons).map(([val, theme]) => (
                <option key={val} value={val}>{theme.label}</option>
              ))}
            </select>
          </form>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
            <tr>
              <th className="px-6 py-4">ID</th>
              <th className="px-6 py-4">Cliente / Fecha</th>
              <th className="px-6 py-4">Items / Total</th>
              <th className="px-6 py-4">Pago</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders.length === 0 ? (
               <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">No hay Ã³rdenes para mostrar</td></tr>
            ) : (
              orders.map((order) => {
                const StatusIcon = statusThemes[order.status].icon
                const PaymentIcon = paymentIcons[order.paymentType].icon

                return (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-gray-500">
                      #{order.id.slice(-6).toUpperCase()}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900">{order.guestName}</p>
                      <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString('es-AR')}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-900">{order.items.reduce((acc, i) => acc + i.quantity, 0)} items</p>
                      <p className="font-bold text-orange-500">${order.total.toLocaleString('es-AR')}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-600">
                        <PaymentIcon size={16} />
                        <span className="text-xs font-semibold">{paymentIcons[order.paymentType].label}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`badge flex items-center gap-1.5 w-fit ${statusThemes[order.status].color}`}>
                        <StatusIcon size={14} /> {statusThemes[order.status].label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/admin/ordenes/${order.id}`}
                        className="btn-secondary !py-1.5 !px-3 font-medium !text-xs !bg-white">
                        <Eye size={14} /> Detalle
                      </Link>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
