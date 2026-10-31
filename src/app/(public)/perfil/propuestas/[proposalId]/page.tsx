import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import ProposalStageDecision from './ProposalStageDecision'
import ProposalMaterials from '@/components/proposals/ProposalMaterials'

export const dynamic = 'force-dynamic'

const trackLabels: Record<string, { title: string; description: string }> = {
  NOW: { title: 'Resolver ahora', description: 'Prioridades inmediatas.' },
  LATER: { title: 'Construir a largo plazo', description: 'Lo que sigue.' },
}

export default async function CustomerProposalPage({ params }: { params: Promise<{ proposalId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const { proposalId } = await params
  const proposal = await prisma.commercialProposal.findFirst({
    where: { id: proposalId, customerId: session.user.id },
    include: {
      materials: { orderBy: { sortOrder: 'asc' } },
      stages: {
        orderBy: { position: 'asc' },
        include: { comments: { orderBy: { createdAt: 'desc' }, take: 200, select: { id: true, authorName: true, authorRole: true, action: true, message: true, createdAt: true } } },
      },
    },
  })
  if (!proposal) notFound()
  if (proposal.status === 'SHARED') {
    await prisma.commercialProposal.updateMany({ where: { id: proposal.id, customerId: session.user.id, status: 'SHARED' }, data: { status: 'VIEWED' } })
  }

  const sections = [
    ['Lo que entendimos', proposal.diagnosis],
    ['Nuestra mirada', proposal.solution],
    ['Alcance general', proposal.scope],
    ['Entregables', proposal.deliverables],
    ['Plazos', proposal.timeline],
    ['Consideraciones', proposal.conditions],
    ['Modalidad de pago', proposal.paymentTerms],
  ] as const
  const visible = sections.filter(([, value]) => typeof value === 'string' && value.trim())
  const immediate = proposal.stages.filter(stage => stage.track !== 'LATER')
  const future = proposal.stages.filter(stage => stage.track === 'LATER')
  const hasBothTracks = immediate.length > 0 && future.length > 0

  return <main className="min-h-screen bg-[#FAF9F6]">
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <Link href="/perfil/propuestas" className="text-sm font-medium text-gray-500 transition hover:text-gray-950">← Mis propuestas</Link>

      <header className="mt-7 border-b border-gray-200 pb-8">
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-gray-500">ZAP · Propuesta {proposal.version > 1 ? `v${proposal.version}` : ""}</p>
        <h1 className="mt-3 max-w-4xl text-3xl font-semibold tracking-tight text-gray-950 sm:text-4xl">{proposal.title}</h1>
        {proposal.summary && <p className="mt-5 max-w-3xl whitespace-pre-wrap text-base leading-7 text-gray-600">{proposal.summary}</p>}
      </header>

      {visible.length > 0 && <section className="grid gap-x-12 gap-y-8 border-b border-gray-200 py-8 sm:grid-cols-2">
        {visible.map(([title, value]) => <div key={title}>
          <h2 className="text-sm font-semibold text-gray-950">{title}</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-gray-600">{value}</p>
        </div>)}
      </section>}

      <ProposalMaterials proposalId={proposal.id} materials={proposal.materials.map(material => ({ ...material, createdAt: material.createdAt.toISOString() }))} />

      {proposal.stages.length > 0 && <section className="mt-10">
        <div className="mb-6 max-w-3xl">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-950 sm:text-3xl">Elegí cómo avanzar</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">Cada etapa se decide por separado.</p>
        </div>
        <div className={hasBothTracks ? 'grid items-start gap-6 lg:grid-cols-2' : 'grid items-start gap-6'}>
          {immediate.length > 0 && <section>
            <div className="mb-4 border-b border-gray-300 pb-3">
              <h3 className="text-lg font-semibold text-gray-950">{trackLabels.NOW.title}</h3>
              <p className="mt-1 text-sm text-gray-500">{trackLabels.NOW.description}</p>
            </div>
            <div className="space-y-4">{immediate.map(stage => <ProposalStageDecision key={stage.id} proposalVersion={proposal.version} stage={{ ...stage, amount: stage.amount == null ? null : Number(stage.amount), comments: stage.comments.slice().reverse().map(comment => ({ ...comment, createdAt: comment.createdAt.toISOString() })) }} />)}</div>
          </section>}
          {future.length > 0 && <section>
            <div className="mb-4 border-b border-gray-300 pb-3">
              <h3 className="text-lg font-semibold text-gray-950">{trackLabels.LATER.title}</h3>
              <p className="mt-1 text-sm text-gray-500">{trackLabels.LATER.description}</p>
            </div>
            <div className="space-y-4">{future.map(stage => <ProposalStageDecision key={stage.id} proposalVersion={proposal.version} stage={{ ...stage, amount: stage.amount == null ? null : Number(stage.amount), comments: stage.comments.slice().reverse().map(comment => ({ ...comment, createdAt: comment.createdAt.toISOString() })) }} />)}</div>
          </section>}
        </div>
      </section>}
      <footer className="mt-12 border-t border-gray-200 pt-5 text-sm text-gray-500">ZAP Agencia Creativa</footer>
    </div>
  </main>
}
