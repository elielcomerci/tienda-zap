import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, ArrowRight, Package, ShoppingBag } from 'lucide-react'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { OrderStatus, Prisma } from '@prisma/client'
import { getOrderDisplayCode } from '@/lib/orders-workflow'

export const dynamic = 'force-dynamic'
const labels: Record<string, string> = { PENDING: 'Pendiente de pago', PAID: 'Pagado', PROOF_SENT: 'Prueba enviada', IN_PRODUCTION: 'En producción', PROCESSING: 'En proceso', READY: 'Listo', DELIVERED: 'Entregado', CANCELLED: 'Cancelado' }
const styles: Record<string, string> = { PENDING: 'bg-amber-50 text-amber-700', PAID: 'bg-sky-50 text-sky-700', PROOF_SENT: 'bg-indigo-50 text-indigo-700', IN_PRODUCTION: 'bg-violet-50 text-violet-700', PROCESSING: 'bg-violet-50 text-violet-700', READY: 'bg-emerald-50 text-emerald-700', DELIVERED: 'bg-gray-100 text-gray-600', CANCELLED: 'bg-rose-50 text-rose-700' }
const filters = [{ label: 'Todos', value: 'todos' }, { label: 'En curso', value: 'curso' }, { label: 'Finalizados', value: 'finalizados' }]

export default async function ServiciosPage({ searchParams }: { searchParams: Promise<{ estado?: string; pagina?: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const params = await searchParams
  const estado = filters.some(f => f.value === params.estado) ? params.estado! : 'todos'
  const page = Math.max(1, Number.parseInt(params.pagina || '1', 10) || 1)
  const pageSize = 15
  const statuses: OrderStatus[] | undefined = estado === 'curso' ? ['PENDING', 'PAID', 'PROOF_SENT', 'IN_PRODUCTION', 'PROCESSING', 'READY'] : estado === 'finalizados' ? ['DELIVERED', 'CANCELLED'] : undefined
  const where: Prisma.OrderWhereInput = { userId: session.user.id, ...(statuses ? { status: { in: statuses } } : {}) }
  const [orders, total] = await Promise.all([prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize, include: { items: { include: { product: { select: { name: true } } } } } }), prisma.order.count({ where })])
  const pages = Math.max(1, Math.ceil(total / pageSize))
  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-10">
    <Link href="/perfil" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900"><ArrowLeft size={16}/> Mi espacio</Link>
    <div className="mt-5 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-violet-700">Mis servicios</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-gray-950">Pedidos y compras</h1><p className="mt-2 text-sm text-gray-500">Seguí el estado, los pagos y las entregas de tus pedidos.</p></div><Link href="/productos" className="inline-flex items-center gap-2 rounded-xl bg-[#ED164F] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#d81245]"><ShoppingBag size={16}/> Explorar servicios</Link></div>
    <div className="mt-6 flex gap-2 border-b border-gray-200">{filters.map(f => <Link key={f.value} href={`/perfil/servicios?estado=${f.value}`} className={`border-b-2 px-3 py-3 text-sm font-semibold ${estado === f.value ? 'border-[#ED164F] text-[#c2103f]' : 'border-transparent text-gray-500 hover:text-gray-900'}`}>{f.label}</Link>)}</div>
    <p className="mt-4 text-sm text-gray-500">{total} {total === 1 ? 'pedido' : 'pedidos'}</p>
    {orders.length === 0 ? <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-10 text-center"><Package size={34} className="mx-auto text-gray-300"/><h2 className="mt-3 font-semibold text-gray-900">{estado === 'todos' ? 'Todavía no tenés pedidos' : 'No hay pedidos en esta categoría'}</h2><p className="mt-1 text-sm text-gray-500">{estado === 'todos' ? 'Cuando compres un servicio o producto, vas a poder seguirlo desde acá.' : 'Probá otra vista para encontrar tus pedidos.'}</p>{estado === 'todos' && <Link href="/productos" className="mt-4 inline-flex rounded-xl bg-[#ED164F] px-4 py-2.5 text-sm font-semibold text-white">Ver servicios</Link>}</section> : <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white">{orders.map(order => <Link key={order.id} href={`/perfil/ordenes/${order.id}`} className="group flex items-center gap-4 border-b border-gray-100 p-4 last:border-0 hover:bg-gray-50 sm:px-5"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600"><Package size={18}/></span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles[order.status] || 'bg-gray-100 text-gray-600'}`}>{labels[order.status] || order.status}</span><span className="font-mono text-xs text-gray-400">#{getOrderDisplayCode(order.id)}</span><span className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString('es-AR')}</span></span><span className="mt-1 block truncate text-sm text-gray-700">{order.items.map(item => item.product.name || item.productName).join(', ')}</span></span><span className="text-right"><span className="block font-semibold text-gray-900">${order.total.toLocaleString('es-AR')}</span><ArrowRight size={16} className="ml-auto mt-1 text-gray-300 group-hover:text-[#ED164F]"/></span></Link>)}</div>}
    {pages > 1 && <nav aria-label="Páginas de pedidos" className="mt-5 flex items-center justify-between"><span className="text-sm text-gray-500">Página {page} de {pages}</span><div className="flex gap-2">{page > 1 && <Link href={`/perfil/servicios?estado=${estado}&pagina=${page - 1}`} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold"><ArrowLeft size={15}/> Anterior</Link>}{page < pages && <Link href={`/perfil/servicios?estado=${estado}&pagina=${page + 1}`} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold">Siguiente <ArrowRight size={15}/></Link>}</div></nav>}
  </main>
}
