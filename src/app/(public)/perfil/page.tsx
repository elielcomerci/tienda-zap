import { auth, signOut } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import {
  ArrowRight, BriefcaseBusiness, FileText, FolderOpen,
  LogOut, Package, ReceiptText, UserRound,
} from 'lucide-react'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Mi espacio | ZAP Tienda' }

const statusLabel: Record<string, string> = {
  PENDING: 'Pendiente', PAID: 'Pagado', PROOF_SENT: 'Prueba enviada',
  IN_PRODUCTION: 'En producción', PROCESSING: 'En proceso', READY: 'Listo para retirar',
  DELIVERED: 'Entregado', CANCELLED: 'Cancelado',
}
const statusStyle: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700', PAID: 'bg-sky-50 text-sky-700',
  PROOF_SENT: 'bg-indigo-50 text-indigo-700', IN_PRODUCTION: 'bg-violet-50 text-violet-700',
  PROCESSING: 'bg-violet-50 text-violet-700', READY: 'bg-emerald-50 text-emerald-700',
  DELIVERED: 'bg-gray-100 text-gray-600', CANCELLED: 'bg-rose-50 text-rose-700',
}

export default async function PerfilPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const [user, orders, orderCount, activeOrders] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id } }),
    prisma.order.findMany({
      where: { userId: session.user.id }, orderBy: { createdAt: 'desc' }, take: 5,
      include: { items: { include: { product: { select: { name: true } } } } },
    }),
    prisma.order.count({ where: { userId: session.user.id } }),
    prisma.order.count({ where: { userId: session.user.id, status: { in: ['PAID', 'PROOF_SENT', 'IN_PRODUCTION', 'PROCESSING', 'READY'] } } }),
  ])
  if (!user) redirect('/login')

  const firstName = user.name?.trim().split(/\s+/)[0] || 'Hola'
  const areas = [
    { title: 'Mis servicios', description: 'Explorá servicios, compras y el estado de tus pedidos.', href: '/perfil/servicios', icon: BriefcaseBusiness, tint: 'bg-violet-50 text-violet-700', detail: `${orderCount} pedidos` },
    { title: 'Archivos y mensajes', description: 'Compartí materiales y encontrá las entregas de ZAP.', href: '/perfil/archivos', icon: FolderOpen, tint: 'bg-sky-50 text-sky-700', detail: process.env.CLIENT_WORK_FILES_ENABLED === 'true' ? 'Trabajos y archivos' : 'En preparación' },
    { title: 'NODO ZAP', description: 'Facturá, administrá tus CUIT e integrá tus sistemas.', href: '/perfil/nodo', icon: ReceiptText, tint: 'bg-rose-50 text-rose-700', detail: 'Abrir espacio NODO' },
    { title: 'Mi cuenta', description: 'Actualizá tus datos personales y contraseña.', href: '/perfil/cuenta', icon: UserRound, tint: 'bg-emerald-50 text-emerald-700', detail: 'Datos y seguridad' },
  ]

  return (
    <div className="min-h-screen bg-[#f7f7f8]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
        <section className="relative overflow-hidden rounded-[2rem] bg-[#17151a] px-6 py-8 text-white shadow-xl sm:px-10 sm:py-10">
          <div aria-hidden="true" className="absolute -right-16 -top-28 h-80 w-80 rounded-full bg-[#ED164F]/25 blur-3xl" />
          <div className="relative flex flex-col justify-between gap-7 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-white/55">Tu espacio ZAP</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{firstName}, ¿qué necesitás resolver?</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/65">Tus servicios, archivos y gestiones en un solo lugar.</p>
            </div>
            <form action={async () => { 'use server'; await signOut({ redirectTo: '/' }) }}>
              <button type="submit" className="inline-flex items-center gap-2 self-start rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/10">
                <LogOut size={16} /> Cerrar sesión
              </button>
            </form>
          </div>
          <div className="relative mt-8 grid grid-cols-2 gap-3 border-t border-white/10 pt-5 sm:max-w-lg">
            <div><p className="text-2xl font-semibold">{orderCount}</p><p className="mt-1 text-xs text-white/55">Pedidos totales</p></div>
            <div><p className="text-2xl font-semibold">{activeOrders}</p><p className="mt-1 text-xs text-white/55">En curso</p></div>
          </div>
        </section>

        <section className="mt-8" aria-labelledby="areas-heading">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div><h2 id="areas-heading" className="text-xl font-semibold tracking-tight text-gray-950">¿A dónde querés ir?</h2><p className="mt-1 text-sm text-gray-500">Elegí un área para continuar.</p></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {areas.map(({ title, description, href, icon: Icon, tint, detail }) => {
              const content = <>
                <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tint}`}><Icon size={21} /></span>
                <span className="min-w-0 flex-1"><span className="block font-semibold text-gray-950">{title}</span><span className="mt-1 block text-sm leading-5 text-gray-500">{description}</span><span className="mt-4 block text-xs font-semibold text-gray-400">{detail}</span></span>
                {href ? <ArrowRight size={18} className="mt-1 shrink-0 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-[#ED164F]" /> : <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-gray-500">Pronto</span>}
              </>
              return href
                ? <Link key={title} href={href} className="group flex min-h-40 items-start gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-md">{content}</Link>
                : <div key={title} aria-disabled="true" className="flex min-h-40 items-start gap-4 rounded-2xl border border-dashed border-gray-200 bg-white/70 p-5">{content}</div>
            })}
          </div>
        </section>

        <section id="servicios" className="mt-10 scroll-mt-24">
          <div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#ED164F]">Mis servicios</p><h2 className="mt-1 text-xl font-semibold text-gray-950">Pedidos recientes</h2></div><Link href="/perfil/servicios" className="inline-flex items-center gap-1 text-sm font-semibold text-[#c2103f] hover:underline">Ver historial <ArrowRight size={15} /></Link></div>
          {orders.length === 0 ? <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center"><Package size={30} className="mx-auto text-gray-300" /><p className="mt-3 font-semibold text-gray-800">Todavía no tenés pedidos</p><p className="mt-1 text-sm text-gray-500">Cuando compres un servicio o producto, vas a poder seguirlo desde acá.</p><Link href="/productos" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#ED164F] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#d81245]">Ver servicios <ArrowRight size={15} /></Link></div> : <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">{orders.slice(0, 4).map(order => <Link key={order.id} href={`/perfil/ordenes/${order.id}`} className="group flex items-center gap-4 border-b border-gray-100 p-4 last:border-0 hover:bg-gray-50 sm:px-5"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600"><Package size={18} /></span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle[order.status] || 'bg-gray-100 text-gray-600'}`}>{statusLabel[order.status] || order.status}</span><span className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString('es-AR')}</span></span><span className="mt-1 block truncate text-sm text-gray-700">{order.items.map(item => item.product.name).join(', ')}</span></span><span className="text-right"><span className="block font-semibold text-gray-900">${order.total.toLocaleString('es-AR')}</span><ArrowRight size={16} className="ml-auto mt-1 text-gray-300 group-hover:text-[#ED164F]" /></span></Link>)}</div>}
        </section>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4 text-sm text-gray-500"><span className="inline-flex items-center gap-2"><FileText size={16} />¿Buscás ayuda con una gestión?</span><a href="https://wa.me/541125832323" target="_blank" rel="noreferrer" className="font-semibold text-[#c2103f] hover:underline">Escribinos a ZAP <ArrowRight className="ml-1 inline" size={14} /></a></div>
      </div>
    </div>
  )
}
