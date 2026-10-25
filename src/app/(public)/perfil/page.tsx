import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { ArrowRight, BriefcaseBusiness, FolderOpen, Package, ReceiptText, UserRound } from 'lucide-react'

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

  const [user, orders] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id } }),
    prisma.order.findMany({
      where: { userId: session.user.id }, orderBy: { createdAt: 'desc' }, take: 4,
      include: { items: { include: { product: { select: { name: true } } } } },
    }),
  ])
  if (!user) redirect('/login')

  const firstName = user.name?.trim().split(/\s+/)[0] || 'Hola'
  const areas = [
    { title: 'Mis servicios', description: 'Consultá lo que tenés en marcha y su seguimiento.', href: '/perfil/servicios', icon: BriefcaseBusiness, tint: 'text-[#6D48A8]', action: 'Ver servicios' },
    { title: 'Archivos compartidos', description: 'Intercambiá material y conversá sobre cada trabajo.', href: '/perfil/archivos', icon: FolderOpen, tint: 'text-[#3472A5]', action: process.env.CLIENT_WORK_FILES_ENABLED === 'true' ? 'Ver archivos' : 'Ver información' },
    { title: 'NODO ZAP', description: 'Gestioná CUIT, facturas y datos fiscales.', href: '/perfil/nodo', icon: ReceiptText, tint: 'text-[#C2103F]', action: 'Abrir NODO' },
    { title: 'Mi cuenta', description: 'Editá tus datos personales y seguridad.', href: '/perfil/cuenta', icon: UserRound, tint: 'text-[#3F7663]', action: 'Ver mi cuenta' },
  ]

  return (
    <div className="min-h-screen bg-[#FAF9F6]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
        <section className="border-b border-gray-200 pb-7">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-[#C2103F]">Tu espacio</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950 sm:text-4xl">Todo en orden. Todo a mano.</h1>
          <p className="mt-2 text-sm text-gray-600">Hola, {firstName}. Elegí qué necesitás hacer.</p>
        </section>

        <section className="mt-8" aria-labelledby="areas-heading">
          <h2 id="areas-heading" className="mb-4 text-xl font-semibold tracking-tight text-gray-950">¿Qué querés resolver?</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {areas.map(({ title, description, href, icon: Icon, tint, action }) => <Link key={title} href={href} className="group flex min-h-36 items-start gap-4 rounded-xl border border-gray-200 bg-white p-5 transition hover:border-[#D6A2B1] hover:bg-[#FFFCFD] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2103F]">
              <span className={`mt-0.5 shrink-0 ${tint}`}><Icon size={20} strokeWidth={1.8} /></span>
              <span className="min-w-0 flex-1"><span className="block font-semibold text-gray-950">{title}</span><span className="mt-1 block text-sm leading-5 text-gray-600">{description}</span><span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#C2103F]">{action}<ArrowRight size={15} className="transition group-hover:translate-x-0.5" /></span></span>
            </Link>)}
          </div>
        </section>

        {orders.length > 0 && <section id="servicios" className="mt-10 scroll-mt-24">
          <div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#C2103F]">Mis servicios</p><h2 className="mt-1 text-xl font-semibold text-gray-950">Actividad reciente</h2></div><Link href="/perfil/servicios" className="inline-flex items-center gap-1 text-sm font-semibold text-[#C2103F] hover:underline">Ver todos <ArrowRight size={15} /></Link></div>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">{orders.map(order => <Link key={order.id} href={`/perfil/ordenes/${order.id}`} className="group flex items-center gap-4 border-b border-gray-100 p-4 last:border-0 hover:bg-gray-50 sm:px-5"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600"><Package size={18} /></span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle[order.status] || 'bg-gray-100 text-gray-600'}`}>{statusLabel[order.status] || order.status}</span><span className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString('es-AR')}</span></span><span className="mt-1 block truncate text-sm text-gray-700">{order.items.map(item => item.product.name).join(', ')}</span></span><span className="text-right"><span className="block font-semibold text-gray-900">${order.total.toLocaleString('es-AR')}</span><ArrowRight size={16} className="ml-auto mt-1 text-gray-400 group-hover:text-[#C2103F]" /></span></Link>)}</div>
        </section>}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-5 text-sm text-gray-600"><span>¿Necesitás ayuda con una gestión?</span><a href="https://wa.me/541125832323" target="_blank" rel="noreferrer" className="font-semibold text-[#C2103F] hover:underline">Escribinos a ZAP <ArrowRight className="ml-1 inline" size={14} /></a></div>
      </div>
    </div>
  )
}
