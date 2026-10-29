import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import ProposalResponse from './ProposalResponse'

export const dynamic = 'force-dynamic'
export default async function CustomerProposalPage({ params }: { params: Promise<{ proposalId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const { proposalId } = await params
  const p = await prisma.commercialProposal.findFirst({ where: { id: proposalId, customerId: session.user.id }, include: { materials: { orderBy: { sortOrder: 'asc' } } } })
  if (!p) notFound()
  const sections = [['Lo que entendimos',p.diagnosis],['Lo que proponemos',p.solution],['Qué incluye',p.scope],['Entregables',p.deliverables],['Etapas y plazos',p.timeline],['Consideraciones',p.conditions]] as const
  return <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6"><p className="text-xs font-semibold uppercase tracking-[.14em] text-gray-500">Propuesta de ZAP · Versión {p.version}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950">Hola, {session.user.name?.split(' ')[0] || 'bienvenido'}.</h1><h2 className="mt-2 text-xl font-medium text-gray-800">{p.title}</h2>{p.summary&&<p className="mt-5 text-base leading-7 text-gray-600">{p.summary}</p>}<section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6"><h3 className="text-lg font-semibold">Inversión</h3><p className="mt-2 text-2xl font-semibold">{p.amount==null?'A definir':new Intl.NumberFormat('es-AR',{style:'currency',currency:p.currency}).format(Number(p.amount))}</p>{p.paymentTerms&&<p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">{p.paymentTerms}</p>}</section><div className="mt-8 space-y-6">{sections.map(([title,body])=><section key={title}><h3 className="text-lg font-semibold text-gray-900">{title}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-gray-600">{body||' '}</p></section>)}</div><section className="mt-10 rounded-2xl border border-gray-200 bg-white p-6"><h3 className="text-lg font-semibold">Tu respuesta</h3><p className="mt-2 text-sm text-gray-500">Podés aceptar, dejar pendiente o enviarnos una consulta. La decisión queda registrada junto con tu comentario.</p><ProposalResponse proposalId={p.id}/></section></main>
}
