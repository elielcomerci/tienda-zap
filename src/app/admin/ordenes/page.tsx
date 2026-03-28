import Link from 'next/link'
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  Clock,
  CreditCard,
  Eye,
  Filter,
  PackageIcon,
  RefreshCcw,
  Smartphone,
  Wallet,
  XCircle,
} from 'lucide-react'
import { getOrders } from '@/lib/orders'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Ordenes | ZAP Admin',
}

const statusThemes = {
  PENDING: { label: 'Pendiente', color: 'text-orange-600 bg-orange-100', icon: Clock },
  PAID: { label: 'Pagada', color: 'text-green-600 bg-green-100', icon: CheckCircle2 },
  PROCESSING: { label: 'En proceso', color: 'text-blue-600 bg-blue-100', icon: RefreshCcw },
  READY: { label: 'Lista', color: 'text-purple-600 bg-purple-100', icon: PackageIcon },
  DELIVERED: { label: 'Entregada', color: 'text-gray-600 bg-gray-100', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelada', color: 'text-red-600 bg-red-100', icon: AlertCircle },
} as const

const paymentIcons = {
  MERCADOPAGO: { label: 'MercadoPago', icon: CreditCard },
  TRANSFER: { label: 'Transferencia', icon: Smartphone },
  CASH: { label: 'Efectivo', icon: Banknote },
  ZAP_CREDIT: { label: 'Credito ZAP', icon: Wallet },
} as const

function getOrderCustomerLabel(order: {
  guestName: string | null
  guestEmail: string | null
  user: { name: string | null; email: string | null } | null
}) {
  return (
    order.guestName ||
    order.user?.name ||
    order.guestEmail ||
    order.user?.email ||
    'Cliente sin nombre'
  )
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
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <h1 className="text-2xl font-bold text-gray-900">Ordenes</h1>

        <form className="flex flex-wrap items-center gap-2">
          <select
            name="status"
            defaultValue={status || ''}
            className="input !w-auto !py-2 text-sm"
          >
            <option value="">Todos los estados</option>
            {Object.entries(statusThemes).map(([value, theme]) => (
              <option key={value} value={value}>
                {theme.label}
              </option>
            ))}
          </select>

          <select
            name="payment"
            defaultValue={payment || ''}
            className="input !w-auto !py-2 text-sm"
          >
            <option value="">Todos los pagos</option>
            {Object.entries(paymentIcons).map(([value, theme]) => (
              <option key={value} value={value}>
                {theme.label}
              </option>
            ))}
          </select>

          <button type="submit" className="btn-secondary !py-2 !text-sm">
            <Filter size={14} />
            Filtrar
          </button>

          {(status || payment) && (
            <Link href="/admin/ordenes" className="btn-secondary !py-2 !text-sm">
              <XCircle size={14} />
              Limpiar
            </Link>
          )}
        </form>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full whitespace-nowrap text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50 font-semibold text-gray-500">
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
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                  No hay ordenes para mostrar.
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const statusTheme =
                  statusThemes[order.status as keyof typeof statusThemes] || statusThemes.PENDING
                const paymentTheme =
                  paymentIcons[order.paymentType as keyof typeof paymentIcons] || paymentIcons.CASH
                const StatusIcon = statusTheme.icon
                const PaymentIcon = paymentTheme.icon
                const totalItems = order.items.reduce((accumulator, item) => accumulator + item.quantity, 0)

                return (
                  <tr key={order.id} className="transition-colors hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-mono font-bold text-gray-500">
                      #{order.id.slice(-6).toUpperCase()}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900">{getOrderCustomerLabel(order)}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(order.createdAt).toLocaleString('es-AR')}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-900">{totalItems} items</p>
                      <p className="font-bold text-orange-500">
                        ${order.total.toLocaleString('es-AR')}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-600">
                        <PaymentIcon size={16} />
                        <span className="text-xs font-semibold">{paymentTheme.label}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`badge flex w-fit items-center gap-1.5 ${statusTheme.color}`}>
                        <StatusIcon size={14} />
                        {statusTheme.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/ordenes/${order.id}`}
                        className="btn-secondary !bg-white !px-3 !py-1.5 !text-xs font-medium"
                      >
                        <Eye size={14} />
                        Detalle
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
