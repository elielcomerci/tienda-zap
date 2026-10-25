import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { isFiscalFeatureEnabled } from '@/lib/fiscal-feature-flags'
import { getFiscalWorkerBaseUrl, getFiscalWorkerSecret } from '@/lib/fiscal-worker-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return { response: NextResponse.json({ error: 'No autorizado.' }, { status: 403 }) } as const
  }
  return { session } as const
}

function workerConfig() {
  const base = getFiscalWorkerBaseUrl()
  const secret = getFiscalWorkerSecret('internal')
  if (!secret) return null
  try {
    return { base: new URL(base), secret }
  } catch {
    return null
  }
}

async function internalGet(path: string, config: { base: URL; secret: string }) {
  try {
    const url = new URL(path, config.base)
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'X-Internal-Secret': config.secret, Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    })
    const body = await response.json().catch(() => null)
    return { ok: response.ok, status: response.status, data: body, error: response.ok ? null : 'El Worker devolvió un error.' }
  } catch {
    return { ok: false, status: 0, data: null, error: 'No se pudo conectar con el Worker.' }
  }
}

export async function GET() {
  const access = await requireAdmin()
  if ('response' in access) return access.response
  const config = workerConfig()
  if (!config) return NextResponse.json({ error: 'Faltan FISCAL_WORKER_URL o FISCAL_WORKER_INTERNAL_SECRET en el servidor.' }, { status: 503 })

  const [stats, wsaa, deadJobs, deadWebhooks] = await Promise.all([
    internalGet('/internal/stats', config),
    internalGet('/internal/wsaa/status', config),
    internalGet('/internal/dead-jobs', config),
    internalGet('/internal/dead-webhooks', config),
  ])
  const results = [stats, wsaa, deadJobs, deadWebhooks]
  if (results.every(item => !item.ok)) {
    return NextResponse.json({ error: 'No se pudieron consultar las operaciones internas del Worker.', details: { stats: stats.status, wsaa: wsaa.status, deadJobs: deadJobs.status, deadWebhooks: deadWebhooks.status } }, { status: 502 })
  }
  return NextResponse.json({ stats, wsaa, deadJobs, deadWebhooks, recoveryEnabled: await isFiscalFeatureEnabled('operationalRecovery'), checkedAt: new Date().toISOString() }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: NextRequest) {
  const access = await requireAdmin()
  if ('response' in access) return access.response
  if (!(await isFiscalFeatureEnabled('operationalRecovery'))) {
    return NextResponse.json({ error: 'La recuperación operativa está desactivada por ZAP.', code: 'FISCAL_FEATURE_DISABLED' }, { status: 423 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'El body debe ser JSON válido.' }, { status: 400 })
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 })
  const input = body as { action?: unknown; id?: unknown }
  const action = input.action
  const id = typeof input.id === 'string' ? input.id.trim() : ''
  if ((action !== 'retry-job' && action !== 'retry-webhook') || !/^[A-Za-z0-9_-]{1,128}$/.test(id)) {
    return NextResponse.json({ error: 'Acción o identificador inválido.' }, { status: 422 })
  }

  const config = workerConfig()
  if (!config) return NextResponse.json({ error: 'Faltan FISCAL_WORKER_URL o FISCAL_WORKER_INTERNAL_SECRET en el servidor.' }, { status: 503 })

  const entityType = action === 'retry-job' ? 'FiscalJob' : 'WebhookDelivery'
  await prisma.adminAuditLog.create({
    data: {
      actorId: access.session.user.id,
      actorEmail: access.session.user.email ?? null,
      action: 'FISCAL_WORKER_RECOVERY_REQUESTED',
      entityType,
      entityId: id,
      description: action === 'retry-job' ? 'Solicitud administrativa de reintento de job DEAD en Fiscal Worker.' : 'Solicitud administrativa de reintento de webhook DEAD en Fiscal Worker.',
      metadata: { action, requestedAt: new Date().toISOString() },
    },
  })

  const path = action === 'retry-job' ? `/internal/retry/${encodeURIComponent(id)}` : `/internal/retry-webhook/${encodeURIComponent(id)}`
  try {
    const response = await fetch(new URL(path, config.base), {
      method: 'POST',
      headers: { 'X-Internal-Secret': config.secret, Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(20000),
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) return NextResponse.json({ error: payload?.error?.message || payload?.error || 'El Worker no aceptó el reintento.', details: payload }, { status: response.status })
    return NextResponse.json({ success: true, result: payload }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'No se pudo confirmar la respuesta del Worker. Actualizá el estado antes de repetir la acción.' }, { status: 502 })
  }
}
