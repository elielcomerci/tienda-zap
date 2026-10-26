import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, ArrowUpRight, Package } from 'lucide-react'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { findUniqueBusinessAccountId } from '@/lib/customer-account'
import { OrderStatus, Prisma } from '@prisma/client'
import { getOrderDisplayCode } from '@/lib/orders-workflow'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Mis servicios | ZAP Tienda' }

const statusLabels: Record<OrderStatus, string> = {
  PENDING: 'Pendiente de pago', PAID: 'Pago confirmado', PROOF_SENT: 'Prueba para revisar',
  IN_PRODUCTION: 'En producción', PROCESSING: 'En proceso', READY: 'Listo para retirar',
  DELIVERED: 'Entregado', CANCELLED: 'Cancelado',
}
const statusStyles: Record<OrderStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-800', PAID: 'bg-sky-50 text-sky-800', PROOF_SENT: 'bg-indigo-50 text-indigo-800',
  IN_PRODUCTION: 'bg-violet-50 text-violet-800', PROCESSING: 'bg-violet-50 text-violet-800', READY: 'bg-emerald-50 text-emerald-800',
  DELIVERED: 'bg-gray-100 text-gray-700', CANCELLED: 'bg-rose-50 text-rose-800',
}
const filters = [{ label: 'Todos', value: 'todos' }, { label: 'En curso', value: 'curso' }, { label: 'Finalizados', value: 'finalizados' }] as const
const inProgressStatuses: OrderStatus[] = ['PAID', 'PROOF_SENT', 'IN_PRODUCTION', 'PROCESSING', 'READY']
const finishedStatuses: OrderStatus[] = ['DELIVERED', 'CANCELLED']
const serviceStatuses: OrderStatus[] = [...inProgressStatuses, ...finishedStatuses]

function getStatusHint(status: OrderStatus): string | null {
  switch (status) {
    case 'PENDING': return 'El pago todavía está pendiente. Abrí el pedido para ver cómo continuarlo.'
    case 'PAID': return 'El pago está confirmado. Abrí el pedido para ver el seguimiento.'
    case 'PROOF_SENT': return 'Hay una prueba disponible para revisar en el detalle del pedido.'
    case 'IN_PRODUCTION': return 'El pedido está en producción.'
    case 'PROCESSING': return 'Estamos preparando tu pedido.'
    case 'READY': return 'El pedido está listo para retirar.'
    case 'DELIVERED': return 'El pedido fue entregado.'
    case 'CANCELLED': return 'Este pedido fue cancelado.'
  }
  return null
}

export default async function ServiciosPage({ searchParams }: { searchParams: Promise<{ estado?: string; pagina?: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true },
  })
  if (!user) redirect('/login')

  const businessAccountId = await findUniqueBusinessAccountId({
    userId: session.user.id,
    email: user.email,
  })
  const params = await searchParams
  const estado = filters.find(filter => filter.value === params.estado)?.value ?? 'todos'
  const page = Math.max(1, Number.parseInt(params.pagina || '1', 10) || 1)
  const pageSize = 15
  const baseWhere: Prisma.OrderWhereInput = {
    OR: [
      { userId: session.user.id },
      ...(businessAccountId ? [{ businessAccountId }] : []),
    ],
    status: { in: serviceStatuses },
  }
  const statuses = estado === 'curso' ? inProgressStatuses : estado === 'finalizados' ? finishedStatuses : undefined
  const where: Prisma.OrderWhereInput = { ...baseWhere, ...(statuses ? { status: { in: statuses } } : {}) }
  const [orders, total, statusCounts] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { items: { include: { product: { select: { name: true } } } } },
    }),
    prisma.order.count({ where }),
    prisma.order.groupBy({ by: ['status'], where: baseWhere, _count: { _all: true } }),
  ])

  const totalOrders = statusCounts.reduce((count, group) => count + group._count._all, 0)
  const lifecycleGroups = new Set(statusCounts.map(group => inProgressStatuses.includes(group.status) ? 'in-progress' : 'finished'))
  const showFilters = totalOrders >= 5 && lifecycleGroups.size > 1
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const exploreLink = <Link href="/productos" className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-300 hover:text-gray-950">Explorar servicios <ArrowUpRight size={15} /></Link>

  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-10">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-[.16em] text-violet-700">Mi espacio</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-gray-950">Mis servicios</h1><p className="mt-2 text-sm text-gray-500">Todo lo que tenés en marcha con ZAP.</p></div>
      {exploreLink}
    </header>

    {showFilters && <nav aria-label="Filtrar servicios" className="mt-6 flex gap-2 border-b border-gray-200">{filters.map(filter => <Link key={filter.value} href={`/perfil/servicios?estado=${filter.value}`} aria-current={estado === filter.value ? 'page' : undefined} className={`border-b-2 px-3 py-3 text-sm font-semibold ${estado === filter.value ? 'border-[#ED164F] text-[#c2103f]' : 'border-transparent text-gray-500 hover:text-gray-900'}`}>{filter.label}</Link>)}</nav>}

    {orders.length === 0 ? <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-8 sm:p-10"><Package size={30} className="text-gray-300" /><h2 className="mt-3 font-semibold text-gray-900">{totalOrders === 0 ? 'Todavía no tenés servicios' : 'No hay servicios en esta categoría'}</h2><p className="mt-1 text-sm text-gray-500">{totalOrders === 0 ? 'Cuando contrates tu primer servicio, lo vas a encontrar acá.' : 'Elegí otro filtro para ver tus servicios.'}</p></section> : <>
      <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white">{orders.map(order => {
        const products = order.items.map(item => `${item.quantity > 1 ? `${item.quantity} × ` : ''}${item.product.name || item.productName}`).join(', ')
        const hint = getStatusHint(order.status)
        return <Link key={order.id} href={`/perfil/ordenes/${order.id}`} className="group flex items-center gap-4 border-b border-gray-100 p-4 last:border-0 hover:bg-gray-50 sm:px-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600"><Package size={18} /></span>
          <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[order.status]}`}>{statusLabels[order.status]}</span><span className="font-mono text-xs text-gray-400">#{getOrderDisplayCode(order.id)}</span><span className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString('es-AR')}</span></span><span className="mt-1 block truncate text-sm font-medium text-gray-800">{products}</span>{hint && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}</span>
          <span className="text-right"><span className="block font-semibold text-gray-900">${order.total.toLocaleString('es-AR')}</span><ArrowRight size={16} className="ml-auto mt-1 text-gray-300 group-hover:text-[#ED164F]" /></span>
        </Link>
      })}</div>
    </>}

    {pages > 1 && <nav aria-label="Páginas de servicios" className="mt-5 flex items-center justify-between"><span className="text-sm text-gray-500">Página {page} de {pages}</span><div className="flex gap-2">{page > 1 && <Link href={`/perfil/servicios?estado=${estado}&pagina=${page - 1}`} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold">Anterior</Link>}{page < pages && <Link href={`/perfil/servicios?estado=${estado}&pagina=${page + 1}`} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold">Siguiente <ArrowRight size={15} /></Link>}</div></nav>}
  </main>
}
