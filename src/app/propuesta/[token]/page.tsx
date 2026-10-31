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
  if (!invite) return <main className="flex min-h-screen items-center justify-center bg-[#FAF9F6] px-4 py-12"><section className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-8 sm:p-10"><p className="text-sm font-semibold tracking-[.2em] text-gray-950">ZAP</p><h1 className="mt-8 text-2xl font-semibold tracking-tight text-gray-950">Este enlace ya no está disponible</h1><p className="mt-3 text-sm leading-6 text-gray-600">Contactanos para recibir una nueva invitación.</p></section></main>

  const session = await auth()
  if (invite.proposal.customerId) {
    if (!session?.user?.id) redirect('/login?callbackUrl='+encodeURIComponent('/propuesta/'+token))
    if (invite.proposal.customerId !== session.user.id) return <main className="flex min-h-screen items-center justify-center bg-[#FAF9F6] px-4 py-12"><section className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-8 sm:p-10"><p className="text-sm font-semibold tracking-[.2em] text-gray-950">ZAP</p><h1 className="mt-8 text-2xl font-semibold tracking-tight text-gray-950">Esta propuesta tiene otro acceso</h1><p className="mt-3 text-sm leading-6 text-gray-600">Ingresá con la cuenta vinculada o contactanos.</p></section></main>
    await prisma.$transaction([
      prisma.commercialProposalInvite.update({ where: { id: invite.id }, data: { lastUsedAt: new Date() } }),
      prisma.commercialProposal.updateMany({ where: { id: invite.proposalId, status: 'SHARED' }, data: { status: 'VIEWED' } }),
    ])
    redirect('/perfil/propuestas/'+invite.proposalId)
  }

  if (!invite.proposal.targetEmail) return <main className="flex min-h-screen items-center justify-center bg-[#FAF9F6] px-4 py-12"><section className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-8 sm:p-10"><p className="text-sm font-semibold tracking-[.2em] text-gray-950">ZAP</p><h1 className="mt-8 text-2xl font-semibold tracking-tight text-gray-950">No pudimos identificar el destinatario</h1><p className="mt-3 text-sm text-gray-600">Contactanos para revisar la invitación.</p></section></main>
  return <main className="flex min-h-screen items-center justify-center bg-[#FAF9F6] px-4 py-12"><section className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-8 sm:p-10"><p className="text-sm font-semibold tracking-[.2em] text-gray-950">ZAP</p><p className="mt-8 text-xs font-semibold uppercase tracking-[.16em] text-gray-500">Propuesta privada</p><h1 className="mt-3 text-3xl font-semibold tracking-tight text-gray-950">Tu propuesta te espera.</h1><p className="mt-3 max-w-sm text-sm leading-6 text-gray-600">Confirmá tu email para ingresar.</p><div className="mt-7"><RequestProposalEmailVerification inviteId={invite.id} /></div></section></main>
}
