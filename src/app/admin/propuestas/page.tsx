import Link from 'next/link'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Propuestas comerciales | ZAP Admin' }

const labels: Record<string, string> = { DRAFT: 'Borrador', SHARED: 'Compartida', VIEWED: 'Vista', PENDING: 'Pendiente', QUERY: 'Consulta solicitada', ACCEPTED: 'Aceptada', REJECTED: 'Rechazada', EXPIRED: 'Vencida', CANCELLED: 'Cancelada' }

export default async function ProposalsPage() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') redirect('/login')
  const proposals = await prisma.commercialProposal.findMany({
    orderBy: { updatedAt: 'desc' }, take: 100,
    include: { customer: { select: { name: true, email: true } }, businessAccount: { select: { name: true } }, _count: { select: { materials: true, invitations: true } } },
  })
  return <div className="space-y-6">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-xs font-semibold uppercase tracking-[.14em] text-gray-500">Equipo comercial</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-gray-950">Propuestas</h1><p className="mt-2 text-sm text-gray-500">Prepará una propuesta, compartila en privado y seguí la respuesta desde acá.</p></div>
      <Link href="/admin/propuestas/nueva" className="inline-flex items-center justify-center rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800">Nueva propuesta</Link>
    </header>
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      {proposals.length === 0 ? <div className="px-6 py-16 text-center"><h2 className="text-lg font-semibold text-gray-900">Todavía no hay propuestas</h2><p className="mt-2 text-sm text-gray-500">Creá la primera para iniciar el circuito comercial.</p><Link href="/admin/propuestas/nueva" className="mt-5 inline-flex rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium">Crear propuesta</Link></div> :
      <div className="divide-y divide-gray-100">{proposals.map(p => <Link key={p.id} href={`/admin/propuestas/${p.id}`} className="flex flex-col gap-2 p-5 transition-colors hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="font-semibold text-gray-900">{p.title}</p><p className="mt-1 text-sm text-gray-500">{p.businessAccount?.name || p.customer?.name || p.targetEmail || 'Sin cliente asociado'} · Actualizada {new Date(p.updatedAt).toLocaleDateString('es-AR')}</p></div>
        <div className="flex items-center gap-3 text-xs text-gray-500"><span>{p.amount == null ? 'Inversión a definir' : new Intl.NumberFormat('es-AR',{style:'currency',currency:p.currency,maximumFractionDigits:0}).format(Number(p.amount))}</span><span className="rounded-full bg-gray-100 px-3 py-1.5 font-medium text-gray-700">{labels[p.status] || p.status}</span><span>{p._count.materials} adj. · {p._count.invitations} enlaces</span></div>
      </Link>)}</div>}
    </div>
  </div>
}
