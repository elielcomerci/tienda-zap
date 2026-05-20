import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getOrderDisplayCode } from '@/lib/orders-workflow'

export const dynamic = 'force-dynamic'

const statusLabel: Record<string, string> = {
  PENDING: 'Pendiente',
  PAID: 'Pagado',
  PROOF_SENT: 'Prueba',
  IN_PRODUCTION: 'Producción',
  PROCESSING: 'Procesando',
  READY: 'Listo',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
}

const statusColor: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  PAID: 'bg-blue-100 text-blue-700',
  PROOF_SENT: 'bg-indigo-100 text-indigo-700',
  IN_PRODUCTION: 'bg-purple-100 text-purple-700',
  PROCESSING: 'bg-purple-100 text-purple-700',
  READY: 'bg-green-100 text-green-700',
  DELIVERED: 'bg-gray-100 text-gray-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

export default async function SellerOrdenesPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const seller = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!seller || (seller.role !== 'SELLER' && seller.role !== 'ADMIN')) redirect('/')

  const orders = await prisma.order.findMany({
    where: { sellerId: seller.id },
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { name: true, email: true } }
    },
    take: 100,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Órdenes</h1>
        <p className="mt-1 text-sm text-gray-500">
          Seguí en tiempo real las compras de tus clientes y tus comisiones.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-6 py-4 font-semibold">Orden</th>
                <th className="px-6 py-4 font-semibold">Cliente</th>
                <th className="px-6 py-4 font-semibold">Estado</th>
                <th className="px-6 py-4 font-semibold text-right">Total</th>
                <th className="px-6 py-4 font-semibold text-right">Comisión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    Tus clientes aún no tienen compras registradas.
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const isCommissionAvailable = order.status === 'DELIVERED'
                  return (
                    <tr key={order.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4">
                        <Link href={`/seller/ordenes/${order.id}`} className="font-semibold text-[#ED2C71] hover:underline">
                          #{getOrderDisplayCode(order.id)}
                        </Link>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(order.createdAt).toLocaleDateString('es-AR')}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900">{order.user?.name || order.guestName}</p>
                        <p className="text-xs text-gray-500">{order.user?.email || order.guestEmail}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${statusColor[order.status] ?? 'bg-gray-100 text-gray-700'}`}>
                          {statusLabel[order.status] ?? order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium">
                        ${order.total.toLocaleString('es-AR')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {order.commissionAmount !== null ? (
                          <div className={isCommissionAvailable ? 'text-emerald-600 font-bold' : 'text-gray-400 font-medium'}>
                            ${order.commissionAmount.toLocaleString('es-AR')}
                            {!isCommissionAvailable && <span className="block text-[10px] text-gray-400 font-normal">Disponible al entregar</span>}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">No aplica</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
