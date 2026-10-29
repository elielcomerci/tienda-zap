import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  const proposals = await prisma.commercialProposal.findMany({
    orderBy: { updatedAt: 'desc' },
    include: { customer: { select: { name: true, email: true } }, businessAccount: { select: { name: true } }, _count: { select: { invitations: true, materials: true } } },
    take: 100,
  })
  return NextResponse.json({ proposals }, { headers: { 'Cache-Control': 'private, no-store' } })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN' || !session.user.id) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  try {
    const body = await request.json()
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    if (!title || title.length > 180) return NextResponse.json({ error: 'Ingresá un título de hasta 180 caracteres.' }, { status: 400 })
    const amount = body.amount === '' || body.amount == null ? null : Number(body.amount)
    if (amount !== null && (!Number.isFinite(amount) || amount < 0)) return NextResponse.json({ error: 'El importe no es válido.' }, { status: 400 })
    const youtubeUrl = typeof body.youtubeUrl === 'string' ? body.youtubeUrl.trim() : ''
    if (youtubeUrl) {
      let parsed: URL
      try { parsed = new URL(youtubeUrl) } catch { return NextResponse.json({ error: 'El enlace de YouTube no es válido.' }, { status: 400 }) }
      if (!['youtube.com','www.youtube.com','youtu.be','m.youtube.com'].includes(parsed.hostname)) return NextResponse.json({ error: 'Solo se admiten enlaces de YouTube.' }, { status: 400 })
    }
    const proposal = await prisma.commercialProposal.create({
      data: {
        title, summary: body.summary || null, diagnosis: body.diagnosis || null, solution: body.solution || null,
        scope: body.scope || null, deliverables: body.deliverables || null, timeline: body.timeline || null,
        conditions: body.conditions || null, paymentTerms: body.paymentTerms || null,
        amount, currency: 'ARS', targetEmail: body.targetEmail || null,
        customerId: body.customerId || null, businessAccountId: body.businessAccountId || null,
        createdById: session.user.id,
      },
      select: { id: true, title: true, status: true, amount: true, createdAt: true },
    })
    return NextResponse.json({ proposal }, { status: 201, headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('No se pudo crear la propuesta:', error)
    return NextResponse.json({ error: 'No pudimos guardar la propuesta.' }, { status: 500 })
  }
}
