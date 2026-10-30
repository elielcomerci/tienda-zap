import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const token = typeof body.token === 'string' ? body.token : ''
    const password = typeof body.password === 'string' ? body.password : ''
    if (!/^[a-f0-9]{64}$/.test(token) || password.length < 8 || password.length > 128) {
      return NextResponse.json({ error: 'El enlace o la contraseña no son válidos. Usá al menos 8 caracteres.' }, { status: 400 })
    }

    const verification = await prisma.verificationToken.findUnique({ where: { token } })
    if (!verification || !verification.identifier.startsWith('proposal-invite:')) {
      return NextResponse.json({ error: 'El enlace es inválido o ya fue utilizado.' }, { status: 400 })
    }
    if (verification.expires <= new Date()) {
      await prisma.verificationToken.delete({ where: { token } })
      return NextResponse.json({ error: 'El enlace venció. Solicitá uno nuevo desde la invitación.' }, { status: 410 })
    }

    const parts = verification.identifier.split(':')
    if (parts.length !== 4) return NextResponse.json({ error: 'El enlace no es válido.' }, { status: 400 })
    const [, proposalId, inviteId, email] = parts
    const passwordHash = await bcrypt.hash(password, 12)

    await prisma.$transaction(async tx => {
      const locked = await tx.commercialProposal.updateMany({ where: { id: proposalId }, data: { version: { increment: 0 } } })
      if (!locked.count) throw new Error('INVITE_EXPIRED')
      const invite = await tx.commercialProposalInvite.findFirst({
        where: { id: inviteId, proposalId, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
        select: { id: true },
      })
      if (!invite) throw new Error('INVITE_EXPIRED')
      const proposal = await tx.commercialProposal.findUnique({ where: { id: proposalId }, select: { targetEmail: true, customerId: true } })
      if (!proposal || proposal.targetEmail?.trim().toLowerCase() !== email || proposal.customerId) throw new Error('CLAIM_CONFLICT')

      let user = await tx.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } }, select: { id: true, isBanned: true, role: true } })
      if (user?.isBanned) throw new Error('ACCOUNT_BLOCKED')
      if (user && user.role !== 'CUSTOMER') throw new Error('ACCOUNT_TYPE_INVALID')
      if (user) {
        await tx.user.update({ where: { id: user.id }, data: { password: passwordHash } })
      } else {
        user = await tx.user.create({
          data: { email, name: email.split('@')[0], password: passwordHash, role: 'CUSTOMER' },
          select: { id: true, isBanned: true },
        })
      }

      const claimed = await tx.commercialProposal.updateMany({
        where: { id: proposalId, customerId: null, targetEmail: { equals: email, mode: 'insensitive' } },
        data: { customerId: user.id },
      })
      if (!claimed.count) throw new Error('CLAIM_CONFLICT')
      await tx.commercialProposalInvite.update({ where: { id: invite.id }, data: { lastUsedAt: new Date() } })
      await tx.verificationToken.delete({ where: { token } })
      return
    })

    return NextResponse.json({ ok: true, redirectTo: '/login?callbackUrl=' + encodeURIComponent('/perfil/bienvenida?callbackUrl=' + encodeURIComponent('/perfil/propuestas/' + proposalId)) }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    if (error instanceof Error && error.message === 'INVITE_EXPIRED') return NextResponse.json({ error: 'La invitación ya no está disponible.' }, { status: 410 })
    if (error instanceof Error && error.message === 'ACCOUNT_TYPE_INVALID') return NextResponse.json({ error: 'Esta dirección está asociada a una cuenta administrativa o de vendedor. Contactá a ZAP.' }, { status: 403 })
    if (error instanceof Error && error.message === 'ACCOUNT_BLOCKED') return NextResponse.json({ error: 'La cuenta está bloqueada. Contactá a ZAP.' }, { status: 403 })
    if (error instanceof Error && error.message === 'CLAIM_CONFLICT') return NextResponse.json({ error: 'La propuesta ya está vinculada o cambió de destinatario.' }, { status: 409 })
    console.error('proposal email verification confirmation failed', error)
    return NextResponse.json({ error: 'No pudimos confirmar el acceso.' }, { status: 500 })
  }
}
