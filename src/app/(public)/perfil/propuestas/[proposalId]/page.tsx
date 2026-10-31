import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import ProposalStageDecision from './ProposalStageDecision'
import ProposalMaterials from '@/components/proposals/ProposalMaterials'
import ProposalPrintActions from '@/components/proposals/ProposalPrintActions'

export const dynamic = 'force-dynamic'
const trackLabels: Record<string, { title: string; description: string }> = {
  NOW: { title: 'Prioridad inmediata', description: 'Soluciones para empezar ahora.' },
  LATER: { title: 'Desarrollo a futuro', description: 'Soluciones para construir a largo plazo.' },
}
export default async function CustomerProposalPage({ params }: { params: Promise<{ proposalId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const { proposalId } = await params
  const proposal = await prisma.commercialProposal.findFirst({
    where: { id: proposalId, customerId: session.user.id },
    include: {
      customer: { select: { name: true, email: true } },
      businessAccount: { select: { name: true, legalName: true } },
      materials: { orderBy: { sortOrder: 'asc' } },
      stages: { orderBy: { position: 'asc' }, include: { comments: { orderBy: { createdAt: 'desc' }, take: 200, select: { id: true, authorName: true, authorRole: true, action: true, message: true, createdAt: true } } } },
    },
  })
  if (!proposal) notFound()
  if (proposal.status === 'SHARED') await prisma.commercialProposal.updateMany({ where: { id: proposal.id, customerId: session.user.id, status: 'SHARED' }, data: { status: 'VIEWED' } })
  const sections = [['Lo que entendimos', proposal.diagnosis], ['Nuestra mirada', proposal.solution], ['Alcance general', proposal.scope], ['Entregables', proposal.deliverables], ['Plazos', proposal.timeline], ['Consideraciones', proposal.conditions], ['Modalidad de pago', proposal.paymentTerms]] as const
  const visible = sections.filter(([, value]) => typeof value === 'string' && value.trim())
  const immediate = proposal.stages.filter(stage => stage.track !== 'LATER')
  const future = proposal.stages.filter(stage => stage.track === 'LATER')
  const hasBothTracks = immediate.length > 0 && future.length > 0
  const recipient = proposal.businessAccount?.name || proposal.customer?.name || proposal.targetEmail || 'Cliente'
  const printStages = (stages: typeof proposal.stages) => stages.map((stage, index) => <article key={stage.id} className="proposal-print-stage border-b border-gray-200 py-5 last:border-0">
    <h4 className="font-semibold text-gray-950">{stage.position + 1}. {stage.title}</h4>
    {stage.description && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">{stage.description}</p>}
    {stage.scope && <div className="mt-3"><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Alcance</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6">{stage.scope}</p></div>}
    {stage.deliverables && <div className="mt-3"><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Entregables</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6">{stage.deliverables}</p></div>}
    {stage.timeline && <p className="mt-3 text-sm"><strong>Plazo:</strong> {stage.timeline}</p>}
    {stage.amount != null && <p className="mt-3 text-base font-semibold">{new Intl.NumberFormat('es-AR',{style:'currency',currency:stage.currency}).format(Number(stage.amount))}</p>}
    {stage.paymentTerms && <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{stage.paymentTerms}</p>}
    {stage.conditions && <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{stage.conditions}</p>}
  </article>)
  return <main className="min-h-screen bg-white">
    <div className="proposal-print-shell mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <div className="no-print"><Link href="/perfil/propuestas" className="text-sm font-medium text-gray-500 transition hover:text-gray-950">← Mis propuestas</Link></div>
      <ProposalPrintActions />
      <header className="proposal-print-section mt-7 border-b border-gray-200 pb-8">
        <div className="flex items-start justify-between gap-6"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-zap-magenta">ZAP</p><p className="mt-2 text-xs font-semibold uppercase tracking-[.16em] text-gray-500">Propuesta comercial {proposal.version > 1 ? `· v${proposal.version}` : ''}</p></div><div className="text-right text-xs text-gray-500"><p>{new Date().toLocaleDateString('es-AR',{timeZone:'America/Argentina/Buenos_Aires'})}</p><p className="mt-1">{recipient}</p></div></div>
        <h1 className="mt-7 max-w-4xl text-3xl font-semibold tracking-tight text-gray-950 sm:text-4xl">{proposal.title}</h1>
        {proposal.summary && <p className="mt-5 max-w-3xl whitespace-pre-wrap text-base leading-7 text-gray-600">{proposal.summary}</p>}
      </header>
      {visible.length > 0 && <section className="proposal-print-section grid gap-x-12 gap-y-8 border-b border-gray-200 py-8 sm:grid-cols-2">{visible.map(([title, value]) => <div key={title} className="proposal-print-section"><h2 className="text-sm font-semibold text-gray-950">{title}</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-gray-600">{value}</p></div>)}</section>}
      <ProposalMaterials proposalId={proposal.id} materials={proposal.materials.map(material => ({ ...material, createdAt: material.createdAt.toISOString() }))} />
      {proposal.stages.length > 0 && <>
        <section className="no-print mt-10">
          <div className="mb-6 max-w-3xl"><h2 className="text-2xl font-semibold tracking-tight text-gray-950 sm:text-3xl">Elegí cómo avanzar</h2><p className="mt-2 text-sm leading-6 text-gray-600">Cada solución se decide por separado.</p></div>
          <div className={hasBothTracks ? 'grid items-start gap-6 lg:grid-cols-2' : 'grid items-start gap-6'}>
            {immediate.length > 0 && <section><div className="mb-4 border-b border-gray-300 pb-3"><h3 className="text-lg font-semibold text-zap-magenta">{trackLabels.NOW.title}</h3><p className="mt-1 text-sm text-gray-500">{trackLabels.NOW.description}</p></div><div className="space-y-4">{immediate.map(stage => <ProposalStageDecision key={stage.id} proposalVersion={proposal.version} stage={{ ...stage, amount: stage.amount == null ? null : Number(stage.amount), comments: stage.comments.slice().reverse().map(comment => ({ ...comment, createdAt: comment.createdAt.toISOString() })) }} />)}</div></section>}
            {future.length > 0 && <section><div className="mb-4 border-b border-gray-300 pb-3"><h3 className="text-lg font-semibold text-zap-blue">{trackLabels.LATER.title}</h3><p className="mt-1 text-sm text-gray-500">{trackLabels.LATER.description}</p></div><div className="space-y-4">{future.map(stage => <ProposalStageDecision key={stage.id} proposalVersion={proposal.version} stage={{ ...stage, amount: stage.amount == null ? null : Number(stage.amount), comments: stage.comments.slice().reverse().map(comment => ({ ...comment, createdAt: comment.createdAt.toISOString() })) }} />)}</div></section>}
          </div>
        </section>
        <section className="print-only proposal-print-section mt-10">
          <h2 className="mb-6 text-2xl font-semibold tracking-tight text-gray-950">Plan de trabajo</h2>
          {immediate.length > 0 && <section className="mb-7"><h3 className="border-b border-zap-magenta pb-2 text-lg font-semibold text-zap-magenta">{trackLabels.NOW.title}</h3>{printStages(immediate)}</section>}
          {future.length > 0 && <section><h3 className="border-b border-zap-blue pb-2 text-lg font-semibold text-zap-blue">{trackLabels.LATER.title}</h3>{printStages(future)}</section>}
        </section>
      </>}
      <footer className="proposal-print-section mt-12 border-t border-gray-200 pt-5 text-sm text-gray-500"><strong className="text-gray-900">ZAP Agencia Creativa</strong><p className="mt-1">Estrategia, creatividad, diseño y tecnología.</p></footer>
    </div>
  </main>
}
