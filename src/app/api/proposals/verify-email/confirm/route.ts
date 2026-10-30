import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') || ''
  if (!/^[a-f0-9]{64}$/.test(token)) return NextResponse.redirect(new URL('/login?error=Enlace+inválido', request.url))

  const verification = await prisma.verificationToken.findUnique({ where: { token } })
  if (!verification || !verification.identifier.startsWith('proposal-invite:')) {
    return NextResponse.redirect(new URL('/login?error=El+enlace+es+inválido+o+ya+fue+usado', request.url))
  }
  if (verification.expires <= new Date()) {
    await prisma.verificationToken.delete({ where: { token } })
    return NextResponse.redirect(new URL('/login?error=El+enlace+ha+expirado', request.url))
  }

  const parts = verification.identifier.split(':')
  if (parts.length !== 4) return NextResponse.redirect(new URL('/login?error=Enlace+inválido', request.url))
  const [, proposalId, inviteId, email] = parts

  try {
    const result = await prisma.$transaction(async tx => {
      const invite = await tx.commercialProposalInvite.findFirst({
        where: { id: inviteId, proposalId, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
        select: { id: true },
      })
      if (!invite) throw new Error('INVITE_EXPIRED')
      const user = await tx.user.findUnique({ where: { email }, select: { id: true } })
      if (!user) throw new Error('ACCOUNT_NOT_FOUND')
      const proposal = await tx.commercialProposal.findUnique({
        where: { id: proposalId },
        select: { targetEmail: true, customerId: true },
      })
      if (!proposal || proposal.targetEmail?.trim().toLowerCase() !== email || (proposal.customerId && proposal.customerId !== user.id)) {
        throw new Error('CLAIM_CONFLICT')
      }
      if (!proposal.customerId) {
        const claimed = await tx.commercialProposal.updateMany({
          where: { id: proposalId, customerId: null, targetEmail: email },
          data: { customerId: user.id },
        })
        if (!claimed.count) throw new Error('CLAIM_CONFLICT')
      }
      await tx.commercialProposalInvite.update({ where: { id: invite.id }, data: { lastUsedAt: new Date() } })
      await tx.verificationToken.delete({ where: { token } })
      const onboarding = await tx.proposalClientOnboarding.findUnique({ where: { userId: user.id }, select: { completedAt: true } })
      return { userId: user.id, completed: !!onboarding?.completedAt }
    })
    const destination = result.completed ? `/perfil/propuestas/${proposalId}` : `/perfil/bienvenida?callbackUrl=${encodeURIComponent('/perfil/propuestas/' + proposalId)}`
    return NextResponse.redirect(new URL(destination, request.url))
  } catch (error) {
    if (error instanceof Error && error.message === 'INVITE_EXPIRED') return NextResponse.redirect(new URL('/login?error=La+invitación+ya+no+está+disponible', request.url))
    if (error instanceof Error && error.message === 'ACCOUNT_NOT_FOUND') return NextResponse.redirect(new URL('/registro?error=Creá+tu+cuenta+con+el+email+invitado+y+volvé+a+solicitar+la+confirmación', request.url))
    if (error instanceof Error && error.message === 'CLAIM_CONFLICT') return NextResponse.redirect(new URL('/login?error=La+propuesta+ya+está+vinculada+a+otra+cuenta', request.url))
    console.error('proposal email verification confirmation failed', error)
    return NextResponse.redirect(new URL('/login?error=No+pudimos+confirmar+el+email', request.url))
  }
}
