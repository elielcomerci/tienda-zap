import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, FileText } from 'lucide-react'

export const dynamic = 'force-dynamic'

const statusLabel: Record<string, string> = {
  DRAFT: 'Borrador', SHARED: 'Enviada', VIEWED: 'Vista', ACCEPTED: 'Aprobada',
  PENDING: 'Pendiente', QUERY: 'En conversación', REJECTED: 'No aprobada',
}

export default async function CustomerProposalsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const proposals = await prisma.commercialProposal.findMany({
    where: { customerId: session.user.id },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, title: true, status: true, updatedAt: true, stages: { select: { status: true } } },
  })

  return <main className="mx-auto min-h-screen max-w-4xl px-4 py-10 sm:px-6">
    <Link href="/perfil" className="text-sm text-gray-500 hover:text-gray-900">← Mi espacio</Link>
    <div className="mt-5 border-b border-gray-200 pb-6">
      <p className="text-xs font-semibold uppercase tracking-[.16em] text-gray-500">Tu espacio ZAP</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950">Mis propuestas</h1>
      <p className="mt-2 text-sm text-gray-600">Revisá cada propuesta y retomá las decisiones cuando quieras.</p>
    </div>
    {proposals.length ? <div className="mt-6 divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white">
      {proposals.map(proposal => {
        const accepted = proposal.stages.filter(stage => stage.status === 'ACCEPTED').length
        return <Link key={proposal.id} href={`/perfil/propuestas/${proposal.id}`} className="group flex items-center gap-4 p-5 hover:bg-gray-50">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-700"><FileText size={20}/></span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-gray-950">{proposal.title}</span>
            <span className="mt-1 block text-sm text-gray-500">{statusLabel[proposal.status] || proposal.status} · {accepted} de {proposal.stages.length} etapas aprobadas · {new Date(proposal.updatedAt).toLocaleDateString('es-AR')}</span>
          </span>
          <ArrowRight size={18} className="shrink-0 text-gray-400 transition group-hover:translate-x-0.5 group-hover:text-gray-900"/>
        </Link>
      })}
    </div> : <section className="mt-8 rounded-2xl border border-dashed border-gray-300 p-8 text-center">
      <FileText size={28} className="mx-auto text-gray-400"/>
      <h2 className="mt-3 font-semibold text-gray-900">Todavía no tenés propuestas</h2>
      <p className="mt-1 text-sm text-gray-500">Cuando ZAP comparta una propuesta con vos, la vas a encontrar acá.</p>
    </section>}
  </main>
}
