import { prisma } from '@/lib/prisma'
import { sendProposalEmailVerification } from '@/lib/email'
import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const inviteId = typeof body.inviteId === 'string' ? body.inviteId : ''
    if (!inviteId) return NextResponse.json({ error: 'Invitación no válida.' }, { status: 400 })

    const invite = await prisma.commercialProposalInvite.findFirst({
      where: { id: inviteId, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      select: { id: true, proposalId: true, proposal: { select: { customerId: true, targetEmail: true } } },
    })
    const email = invite?.proposal.targetEmail?.trim().toLowerCase()
    if (!invite || invite.proposal.customerId || !email) {
      return NextResponse.json({ error: 'La invitación no está disponible para confirmar.' }, { status: 403 })
    }

    const identifier = `proposal-invite:${invite.proposalId}:${invite.id}:${email}`
    const pending = await prisma.verificationToken.findFirst({ where: { identifier, expires: { gt: new Date() } }, select: { token: true } })
    const token = pending?.token || randomBytes(32).toString('hex')
    if (!pending) {
      await prisma.verificationToken.create({ data: { identifier, token, expires: new Date(Date.now() + 60 * 60 * 1000) } })
    }
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin
    const verificationUrl = `${baseUrl}/propuesta/confirmar/${encodeURIComponent(token)}`

    try {
      await sendProposalEmailVerification({ to: email, verificationUrl })
    } catch (error) {
      if (!pending) await prisma.verificationToken.deleteMany({ where: { identifier, token } })
      console.error('proposal email verification delivery failed', error)
      return NextResponse.json({ error: 'No pudimos enviar el email de confirmación. Intentá más tarde o contactá a ZAP.' }, { status: 503 })
    }
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('proposal email verification request failed', error)
    return NextResponse.json({ error: 'No pudimos iniciar la confirmación.' }, { status: 500 })
  }
}
