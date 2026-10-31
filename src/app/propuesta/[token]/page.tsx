import { createHash } from 'node:crypto'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import RequestProposalEmailVerification from './RequestProposalEmailVerification'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Propuesta privada | ZAP' }

export default async function PrivateProposalEntry({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) notFound()
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const invite = await prisma.commercialProposalInvite.findFirst({
    where: { tokenHash, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    select: { id: true, proposalId: true, proposal: { select: { customerId: true, targetEmail: true } } }
  })
  if (!invite) return <main className="mx-auto max-w-xl px-6 py-20"><h1 className="text-2xl font-semibold text-gray-950">Este enlace ya no está disponible</h1><p className="mt-3 text-sm leading-6 text-gray-600">Puede haber vencido o haber sido reemplazado. Contactá a ZAP para recibir una nueva invitación.</p></main>

  const session = await auth()
  if (invite.proposal.customerId) {
    if (!session?.user?.id) redirect('/login?callbackUrl='+encodeURIComponent('/propuesta/'+token))
    if (invite.proposal.customerId !== session.user.id) return <main className="mx-auto max-w-xl px-6 py-20"><h1 className="text-2xl font-semibold text-gray-950">Esta propuesta está asociada a otro acceso</h1><p className="mt-3 text-sm leading-6 text-gray-600">Ingresá con la cuenta vinculada a esta propuesta o contactá a ZAP.</p></main>
    await prisma.$transaction([
      prisma.commercialProposalInvite.update({ where: { id: invite.id }, data: { lastUsedAt: new Date() } }),
      prisma.commercialProposal.updateMany({ where: { id: invite.proposalId, status: 'SHARED' }, data: { status: 'VIEWED' } }),
    ])
    redirect('/perfil/propuestas/'+invite.proposalId)
  }

  if (!invite.proposal.targetEmail) return <main className="mx-auto max-w-xl px-6 py-20"><h1 className="text-2xl font-semibold text-gray-950">No pudimos identificar al destinatario</h1><p className="mt-3 text-sm text-gray-600">Contactá a ZAP para revisar la invitación.</p></main>
  return <main className="mx-auto max-w-xl px-6 py-20"><h1 className="text-2xl font-semibold text-gray-950">Confirmemos que sos vos</h1><p className="mt-3 text-sm leading-6 text-gray-600">Antes de abrir la propuesta, vamos a enviarte un enlace a la dirección de email destinataria. Desde ese enlace vas a poder crear tu acceso o recuperar el existente.</p><div className="mt-6"><RequestProposalEmailVerification inviteId={invite.id} /></div></main>
}
