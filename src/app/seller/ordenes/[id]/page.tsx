import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getOrderDisplayCode } from '@/lib/orders-workflow'
import { ArrowLeft, CalendarDays, DollarSign, Package, UserRound } from 'lucide-react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

const statusLabel: Record<string, string> = {
  PENDING: 'Pendiente',
  PAID: 'Pagado',
  PROOF_SENT: 'Prueba',
  IN_PRODUCTION: 'Produccion',
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

export default async function SellerOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const seller = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!seller || (seller.role !== 'SELLER' && seller.role !== 'ADMIN')) redirect('/')

  const { id } = await params
  const order = await prisma.order.findFirst({
    where: {
      id,
      sellerId: seller.id,
    },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      items: {
        include: {
          product: { select: { name: true, images: true } },
        },
      },
    },
  })

  if (!order) notFound()

  const isCommissionAvailable = order.status === 'DELIVERED'

  return (
    <div className="space-y-6">
      <Link href="/seller/ordenes" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900">
        <ArrowLeft size={16} /> Volver a ordenes
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Orden #{getOrderDisplayCode(order.id)}
          </h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-gray-500">
            <CalendarDays size={16} />
            {new Date(order.createdAt).toLocaleDateString('es-AR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        <span className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${statusColor[order.status] ?? 'bg-gray-100 text-gray-700'}`}>
          {statusLabel[order.status] ?? order.status}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm md:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <Package size={18} className="text-[#ED2C71]" />
            <h2 className="font-bold text-gray-900">Productos</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                <div className="h-14 w-14 overflow-hidden rounded-lg bg-gray-100">
                  {item.product.images[0] ? (
                    <img src={item.product.images[0]} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900">{item.product.name}</p>
                  <p className="text-sm text-gray-500">
                    {item.quantity} x ${item.unitPrice.toLocaleString('es-AR')}
                  </p>
                </div>
                <p className="font-bold text-gray-900">
                  ${(item.quantity * item.unitPrice).toLocaleString('es-AR')}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <UserRound size={18} className="text-[#4576B9]" />
              <h2 className="font-bold text-gray-900">Cliente</h2>
            </div>
            <p className="font-semibold text-gray-900">{order.user?.name || order.guestName || 'Cliente invitado'}</p>
            <p className="text-sm text-gray-500">{order.user?.email || order.guestEmail}</p>
            {(order.user?.phone || order.guestPhone) && (
              <p className="mt-2 text-sm text-gray-500">{order.user?.phone || order.guestPhone}</p>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <DollarSign size={18} className="text-emerald-600" />
              <h2 className="font-bold text-gray-900">Importes</h2>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Total</span>
                <span className="font-bold text-gray-900">${order.total.toLocaleString('es-AR')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Comision</span>
                <span className={isCommissionAvailable ? 'font-bold text-emerald-600' : 'font-semibold text-gray-400'}>
                  {order.commissionAmount !== null ? `$${order.commissionAmount.toLocaleString('es-AR')}` : 'No aplica'}
                </span>
              </div>
              {!isCommissionAvailable && order.commissionAmount !== null && (
                <p className="rounded-lg bg-gray-50 p-3 text-xs text-gray-500">
                  La comision queda disponible cuando la orden se marca como entregada.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
