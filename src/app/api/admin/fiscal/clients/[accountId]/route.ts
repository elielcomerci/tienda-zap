import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Context = { params: Promise<{ accountId: string }> }

export async function PATCH(request: NextRequest, context: Context) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  const { accountId } = await context.params
  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'El body debe ser JSON válido.' }, { status: 400 })
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 })
  }
  const input = body as { notes?: unknown; status?: unknown }
  const data: { notes?: string | null; status?: string } = {}
  if (input.notes !== undefined) {
    if (typeof input.notes !== 'string' || input.notes.length > 5000) {
      return NextResponse.json({ error: 'Las notas deben tener hasta 5000 caracteres.' }, { status: 422 })
    }
    data.notes = input.notes.trim() || null
  }
  if (input.status !== undefined) {
    if (input.status !== 'ACTIVE' && input.status !== 'PAUSED') {
      return NextResponse.json({ error: 'El estado debe ser ACTIVE o PAUSED.' }, { status: 422 })
    }
    data.status = input.status
  }
  if (!Object.keys(data).length) return NextResponse.json({ error: 'No hay cambios para guardar.' }, { status: 422 })

  const before = await prisma.fiscalClientAccount.findUnique({
    where: { id: accountId },
    select: { id: true, notes: true, status: true, tenantName: true, userId: true },
  })
  if (!before) return NextResponse.json({ error: 'No se encontró la cuenta fiscal.' }, { status: 404 })

  const updated = await prisma.fiscalClientAccount.update({
    where: { id: accountId },
    data,
    select: { id: true, notes: true, status: true, updatedAt: true },
  })
  await prisma.adminAuditLog.create({
    data: {
      actorId: session.user.id,
      actorEmail: session.user.email || '',
      action: 'FISCAL_CLIENT_ACCOUNT_UPDATED',
      entityType: 'FiscalClientAccount',
      entityId: accountId,
      description: `Se actualizó la cuenta fiscal ${before.tenantName}.`,
      before: { notes: before.notes, status: before.status },
      after: { notes: updated.notes, status: updated.status },
      metadata: { changedFields: Object.keys(data), customerUserId: before.userId },
    },
  }).catch(error => console.error('[admin/fiscal/clients] audit failed', error instanceof Error ? error.name : 'UnknownError'))

  return NextResponse.json({ account: { ...updated, updatedAt: updated.updatedAt.toISOString() } }, { headers: { 'Cache-Control': 'no-store' } })
}
