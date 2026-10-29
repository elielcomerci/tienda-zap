import { createHash } from 'node:crypto'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Propuesta privada | ZAP' }

export default async function PrivateProposalEntry({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) notFound()
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const invite = await prisma.commercialProposalInvite.findFirst({ where: { tokenHash, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }, select: { id: true, proposalId: true, proposal: { select: { customerId: true, targetEmail: true } } } })
  if (!invite) return <main className="mx-auto max-w-xl px-6 py-20"><h1 className="text-2xl font-semibold text-gray-950">Este enlace ya no está disponible</h1><p className="mt-3 text-sm leading-6 text-gray-600">Puede haber vencido o haber sido reemplazado. Contactá a ZAP para recibir una nueva invitación.</p></main>
  const session = await auth()
  if (!session?.user?.id) redirect('/login?callbackUrl='+encodeURIComponent('/propuesta/'+token))
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, email: true } })
  const matchesUser = invite.proposal.customerId ? invite.proposal.customerId === user?.id : !!invite.proposal.targetEmail && invite.proposal.targetEmail.toLowerCase() === user?.email?.toLowerCase()
  if (!matchesUser && !matchesEmail) return <main className="mx-auto max-w-xl px-6 py-20"><h1 className="text-2xl font-semibold text-gray-950">Esta propuesta está asociada a otro acceso</h1><p className="mt-3 text-sm leading-6 text-gray-600">Ingresá con la cuenta que recibió la invitación o contactá a ZAP para corregir el destinatario.</p></main>
  if (!invite.proposal.customerId && user?.id) await prisma.commercialProposal.updateMany({ where: { id: invite.proposalId, customerId: null }, data: { customerId: user.id } })
  await prisma.commercialProposalInvite.update({ where: { id: invite.id }, data: { lastUsedAt: new Date() } })
  redirect('/perfil/propuestas/'+invite.proposalId)
}
