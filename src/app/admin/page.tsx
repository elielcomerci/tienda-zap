export const dynamic = 'force-dynamic'
import { getDashboardStats } from '@/lib/actions/orders'
import { DollarSign, PackageOpen, ShoppingBag, Truck } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Dashboard | ZAP Admin',
}

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats()

  const cards = [
    { label: 'Ingresos del mes', value: `$${stats.monthlyRevenue.toLocaleString('es-AR')}`, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-100' },
    { label: 'Nuevas (Pendientes)', value: stats.counts.pending, icon: PackageOpen, color: 'text-orange-600', bg: 'bg-orange-100' },
    { label: 'En proceso', value: stats.counts.processing, icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Entregadas/Cobradas', value: stats.counts.delivered, icon: Truck, color: 'text-gray-600', bg: 'bg-gray-100' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Dashboard</h1>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {cards.map((card, i) => (
          <div key={i} className="card p-6 flex items-center gap-5">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${card.bg}`}>
              <card.icon size={26} className={card.color} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{card.label}</p>
              <h3 className="text-2xl font-black text-gray-900">{card.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Últimas órdenes */}
      <div className="card max-w-4xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Últimas 10 órdenes</h2>
          <Link href="/admin/ordenes" className="text-sm font-semibold text-orange-500 hover:text-orange-600 transition-colors">
            Ver todas â†’
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Orden</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stats.recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-400">
                    No hay órdenes recientes
                  </td>
                </tr>
              ) : (
                stats.recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold">
                      <Link href={`/admin/ordenes/${order.id}`} className="text-orange-500 hover:underline">
                        #{order.id.slice(-6).toUpperCase()}
                      </Link>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">{order.guestName}</td>
                    <td className="px-6 py-4">
                      <span className={`badge ${
                        order.status === 'PENDING' ? 'bg-orange-100 text-orange-800' :
                        order.status === 'PAID' ? 'bg-green-100 text-green-800' :
                        order.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold">${order.total.toLocaleString('es-AR')}</td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString('es-AR')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
