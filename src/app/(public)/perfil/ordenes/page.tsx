import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import AccountSectionNav from '@/components/public/AccountSectionNav'
import { ChevronRight, Package } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Mis pedidos — ZAP Tienda' }
const labels: Record<string, string> = { PENDING: 'Pendiente', PAID: 'Pagado', PROOF_SENT: 'Prueba enviada', IN_PRODUCTION: 'En producción', PROCESSING: 'En proceso', READY: 'Listo para retirar', DELIVERED: 'Entregado', CANCELLED: 'Cancelado' }
const colors: Record<string, string> = { PENDING: 'bg-yellow-100 text-yellow-700', PAID: 'bg-blue-100 text-blue-700', PROOF_SENT: 'bg-indigo-100 text-indigo-700', IN_PRODUCTION: 'bg-purple-100 text-purple-700', PROCESSING: 'bg-purple-100 text-purple-700', READY: 'bg-green-100 text-green-700', DELIVERED: 'bg-gray-100 text-gray-700', CANCELLED: 'bg-red-100 text-red-700' }

export default async function PerfilOrdenesPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const orders = await prisma.order.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: 'desc' }, include: { items: { include: { product: { select: { name: true } } } } } })
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
      <div><p className="text-sm text-gray-500">Mi cuenta</p><h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-gray-900"><Package size={24} className="text-[#ED164F]" /> Mis pedidos</h1><p className="mt-1 text-sm text-gray-500">Estado, detalles y acceso a la facturación de tus compras.</p></div>
      <AccountSectionNav active="orders" />
      {orders.length === 0 ? <div className="card p-12 text-center text-gray-400"><Package size={40} className="mx-auto mb-3 text-gray-200" /><p className="font-medium">Todavía no tenés pedidos</p><Link href="/productos" className="mt-3 inline-block text-sm text-[#ED164F] hover:underline">Ver productos</Link></div> :
        <div className="space-y-3">{orders.map(order => <Link key={order.id} href={`/perfil/ordenes/${order.id}`} className="card group flex items-center gap-4 p-4 transition-all hover:border-[#F7638B]/25 hover:shadow-sm"><div className="min-w-0 flex-1"><div className="mb-1 flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${colors[order.status] || 'bg-gray-100 text-gray-700'}`}>{labels[order.status] || order.status}</span><span className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString('es-AR')}</span>{order.invoiceCae && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Factura emitida</span>}</div><p className="truncate text-sm text-gray-600">{order.items.map(item => item.product.name).join(', ')}</p></div><div className="shrink-0 text-right"><p className="font-bold text-gray-900">${order.total.toLocaleString('es-AR')}</p><ChevronRight size={16} className="ml-auto mt-1 text-gray-300 group-hover:text-[#F7638B]" /></div></Link>)}</div>}
    </div>
  )
}
