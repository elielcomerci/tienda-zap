import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
const actions = new Set(['ACCEPTED','PENDING','QUERY'])

export async function POST(request: NextRequest, { params }: { params: Promise<{ proposalId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Iniciá sesión para continuar.' }, { status: 401 })
  const { proposalId } = await params
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'La acción no es válida.' }, { status: 400 })
    const action = typeof body.action === 'string' ? body.action : ''
    const message = typeof body.message === 'string' ? body.message.trim() : ''
    if (!actions.has(action)) return NextResponse.json({ error: 'La acción no es válida.' }, { status: 400 })
    if (message.length > 4000) return NextResponse.json({ error: 'El mensaje supera los 4000 caracteres.' }, { status: 400 })
    const proposal = await prisma.commercialProposal.findFirst({ where: { id: proposalId, customerId: session.user.id } })
    if (!proposal) return NextResponse.json({ error: 'No encontramos esta propuesta.' }, { status: 404 })
    const now = new Date()
    await prisma.commercialProposal.update({ where: { id: proposalId }, data: {
      status: action, customerResponse: message || null, respondedAt: now,
      acceptedAt: action === 'ACCEPTED' ? now : null,
    } })
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('No se pudo registrar la respuesta a la propuesta:', error)
    return NextResponse.json({ error: 'No pudimos registrar tu respuesta.' }, { status: 500 })
  }
}
