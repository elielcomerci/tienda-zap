import { NextRequest, NextResponse } from 'next/server'
import { fiscalWorkerRequest, requireFiscalAdmin } from '@/lib/fiscal-worker-admin'
import { isFiscalFeatureEnabled } from '@/lib/fiscal-feature-flags'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const denied = await requireFiscalAdmin()
  if (denied) return denied
  return fiscalWorkerRequest('/internal/tenants', { secret: 'internal' })
}

export async function POST(request: NextRequest) {
  const denied = await requireFiscalAdmin()
  if (denied) return denied
  if (!(await isFiscalFeatureEnabled('accountProvisioning'))) return NextResponse.json({ error: 'El alta de cuentas fiscales está desactivada por el administrador.', code: 'FISCAL_FEATURE_DISABLED' }, { status: 423 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'El body debe ser JSON válido.' }, { status: 400 })
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'El body debe ser un objeto.' }, { status: 400 })
  }

  const input = body as { name?: unknown; slug?: unknown }
  const name = typeof input.name === 'string' ? input.name.trim() : ''
  const slug = typeof input.slug === 'string' ? input.slug.trim().toLowerCase() : ''

  if (!name || name.length > 120) {
    return NextResponse.json({ error: 'Ingresá un nombre de hasta 120 caracteres.' }, { status: 422 })
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 60) {
    return NextResponse.json({ error: 'El identificador debe usar minúsculas, números y guiones.' }, { status: 422 })
  }

  return fiscalWorkerRequest('/internal/tenants', {
    method: 'POST',
    secret: 'provisioning',
    body: { name, slug },
  })
}
