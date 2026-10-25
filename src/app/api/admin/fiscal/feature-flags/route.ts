import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { DEFAULT_FISCAL_FEATURE_FLAGS, FISCAL_FEATURE_FLAGS, type FiscalFeatureFlagKey } from '@/lib/fiscal-feature-flags'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return { response: NextResponse.json({ error: 'No autorizado.' }, { status: 401 }) }
  }
  return { session }
}

export async function GET() {
  const authResult = await requireAdmin()
  if ('response' in authResult) return authResult.response

  try {
    const rows = await prisma.fiscalFeatureFlag.findMany({ select: { key: true, enabled: true, updatedAt: true, updatedBy: true } })
    const byKey = new Map(rows.map(row => [row.key, row]))
    const flags = Object.entries(FISCAL_FEATURE_FLAGS).map(([key, definition]) => ({
      key: key as FiscalFeatureFlagKey,
      label: definition.label,
      description: definition.description,
      enabled: byKey.get(key)?.enabled ?? DEFAULT_FISCAL_FEATURE_FLAGS[key as FiscalFeatureFlagKey],
      updatedAt: byKey.get(key)?.updatedAt?.toISOString() ?? null,
      updatedBy: byKey.get(key)?.updatedBy ?? null,
    }))
    return NextResponse.json({ flags }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[admin/fiscal/feature-flags] read failed', error instanceof Error ? error.name : 'UnknownError')
    return NextResponse.json({ error: 'No se pudieron leer los controles fiscales. Verificá que la migración esté aplicada.' }, { status: 503 })
  }
}

export async function PATCH(request: NextRequest) {
  const authResult = await requireAdmin()
  if ('response' in authResult) return authResult.response

  let input: unknown
  try { input = await request.json() } catch {
    return NextResponse.json({ error: 'El body debe ser JSON válido.' }, { status: 400 })
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return NextResponse.json({ error: 'Se esperaba un objeto flags.' }, { status: 400 })
  }
  const flagsInput = (input as { flags?: unknown }).flags
  if (!flagsInput || typeof flagsInput !== 'object' || Array.isArray(flagsInput)) {
    return NextResponse.json({ error: 'Se esperaba un objeto flags con valores booleanos.' }, { status: 422 })
  }

  const allowed = new Set(Object.keys(FISCAL_FEATURE_FLAGS))
  const entries = Object.entries(flagsInput as Record<string, unknown>)
  if (!entries.length || entries.some(([key, value]) => !allowed.has(key) || typeof value !== 'boolean')) {
    return NextResponse.json({ error: 'Hay controles desconocidos o valores que no son booleanos.' }, { status: 422 })
  }

  const { session } = authResult
  try {
    const current = await prisma.fiscalFeatureFlag.findMany({ where: { key: { in: entries.map(([key]) => key) } }, select: { key: true, enabled: true } })
    const before = Object.fromEntries(entries.map(([key]) => [key, current.find(row => row.key === key)?.enabled ?? DEFAULT_FISCAL_FEATURE_FLAGS[key as FiscalFeatureFlagKey]]))
    await prisma.$transaction(entries.map(([key, enabled]) => prisma.fiscalFeatureFlag.upsert({
      where: { key },
      create: { key, enabled: enabled as boolean, updatedBy: session.user.email || session.user.id },
      update: { enabled: enabled as boolean, updatedBy: session.user.email || session.user.id },
    })))
    const after = Object.fromEntries(entries.map(([key, enabled]) => [key, enabled as boolean])) as Record<string, boolean>
    await prisma.adminAuditLog.create({
      data: {
        actorId: session.user.id,
        actorEmail: session.user.email || '',
        action: 'FISCAL_FEATURE_FLAGS_UPDATED',
        entityType: 'FiscalFeatureFlag',
        description: 'Se actualizaron controles de operación fiscal.',
        before,
        after,
        metadata: { changedKeys: entries.map(([key]) => key) },
      },
    }).catch(error => console.error('[admin/fiscal/feature-flags] audit failed', error instanceof Error ? error.name : 'UnknownError'))

    return NextResponse.json({ ok: true, flags: await prisma.fiscalFeatureFlag.findMany({ select: { key: true, enabled: true, updatedAt: true, updatedBy: true } }) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[admin/fiscal/feature-flags] write failed', error instanceof Error ? error.name : 'UnknownError')
    return NextResponse.json({ error: 'No se pudieron guardar los controles fiscales.' }, { status: 503 })
  }
}
