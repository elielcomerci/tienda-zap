import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { createHash, randomBytes } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, { params }: { params: Promise<{ proposalId: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN' || !session.user.id) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  const { proposalId } = await params
  const proposal = await prisma.commercialProposal.findUnique({ where: { id: proposalId }, select: { id: true, status: true } })
  if (!proposal) return NextResponse.json({ error: 'No encontramos la propuesta.' }, { status: 404 })
  const token = randomBytes(32).toString('base64url')
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const invite = await prisma.$transaction(async tx => {
    await tx.commercialProposalInvite.updateMany({ where: { proposalId, revokedAt: null }, data: { revokedAt: new Date() } })
    const created = await tx.commercialProposalInvite.create({
      data: { proposalId, tokenHash, createdById: session.user.id!, expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
      select: { id: true, expiresAt: true },
    })
    await tx.commercialProposal.update({ where: { id: proposalId }, data: { status: 'SHARED' } })
    return created
  })
  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin
  return NextResponse.json({ url: origin + '/propuesta/' + token, expiresAt: invite.expiresAt }, { headers: { 'Cache-Control': 'private, no-store' } })
}
