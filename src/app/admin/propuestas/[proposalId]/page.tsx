import Link from 'next/link'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import ProposalSharePanel from './ProposalSharePanel'

export const dynamic = 'force-dynamic'
export default async function ProposalDetailPage({ params }: { params: Promise<{ proposalId: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') redirect('/login')
  const { proposalId } = await params
  const p = await prisma.commercialProposal.findUnique({ where: { id: proposalId }, include: { customer: { select: { name: true, email: true } }, businessAccount: { select: { name: true } }, materials: { orderBy: { sortOrder: 'asc' } }, invitations: { orderBy: { createdAt: 'desc' }, take: 5 } } })
  if (!p) notFound()
  const sections = [['Resumen',p.summary],['Lo que entendimos',p.diagnosis],['Lo que proponemos',p.solution],['Alcance',p.scope],['Entregables',p.deliverables],['Etapas y plazos',p.timeline],['Condiciones',p.conditions],['Modalidad de pago',p.paymentTerms]] as const
  return <div className="mx-auto max-w-4xl space-y-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><Link href="/admin/propuestas" className="text-sm text-gray-500 hover:text-gray-900">← Propuestas</Link><h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950">{p.title}</h1><p className="mt-1 text-sm text-gray-500">{p.businessAccount?.name || p.customer?.name || p.targetEmail || 'Sin cliente asociado'} · Versión {p.version}</p></div><span className="rounded-full bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700">{p.status}</span></div>
    <ProposalSharePanel proposalId={p.id} initialInvites={p.invitations.map(i=>({createdAt:i.createdAt.toISOString(),expiresAt:i.expiresAt?.toISOString()||null,revoked:!!i.revokedAt}))}/>
    <section className="rounded-2xl border border-gray-200 bg-white p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-semibold">Inversión</h2><p className="mt-1 text-sm text-gray-500">Importe opcional</p></div><p className="text-xl font-semibold tabular-nums">{p.amount == null ? 'A definir' : new Intl.NumberFormat('es-AR',{style:'currency',currency:p.currency,maximumFractionDigits:2}).format(Number(p.amount))}</p></div></section>
    <section className="rounded-2xl border border-gray-200 bg-white p-6"><h2 className="text-lg font-semibold">Contenido de la propuesta</h2><div className="mt-5 space-y-5">{sections.map(([title,body])=><div key={title}><h3 className="text-sm font-semibold text-gray-800">{title}</h3><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-gray-600">{body || 'Pendiente de completar'}</p></div>)}</div></section>
    <section className="rounded-2xl border border-gray-200 bg-white p-6"><h2 className="text-lg font-semibold">Material de referencia</h2><p className="mt-2 text-sm text-gray-500">La carga y gestión de adjuntos privados se incorpora en el siguiente bloque. El modelo ya permite asociar archivos y enlaces.</p></section>
  </div>
}
