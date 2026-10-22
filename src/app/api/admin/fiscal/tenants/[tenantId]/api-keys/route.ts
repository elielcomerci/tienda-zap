import { NextRequest, NextResponse } from 'next/server'
import { fiscalWorkerRequest, requireFiscalAdmin } from '@/lib/fiscal-worker-admin'

export const runtime = 'nodejs'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ tenantId: string }> }
) {
  const denied = await requireFiscalAdmin()
  if (denied) return denied

  const { tenantId } = await context.params
  if (!tenantId || tenantId.includes('/')) {
    return NextResponse.json({ error: 'Tenant inválido.' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'El body debe ser JSON válido.' }, { status: 400 })
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'El body debe ser un objeto.' }, { status: 400 })
  }

  const input = body as { label?: unknown; expiresAt?: unknown }
  const label = typeof input.label === 'string' ? input.label.trim() : ''
  if (!label || label.length > 80) {
    return NextResponse.json({ error: 'Ingresá una etiqueta de hasta 80 caracteres.' }, { status: 422 })
  }

  const expiresAt = input.expiresAt
  if (expiresAt !== undefined && expiresAt !== null && typeof expiresAt !== 'string') {
    return NextResponse.json({ error: 'La fecha de vencimiento no es válida.' }, { status: 422 })
  }

  return fiscalWorkerRequest(
    `/internal/tenants/${encodeURIComponent(tenantId)}/api-keys`,
    {
      method: 'POST',
      secret: 'provisioning',
      body: { label, ...(expiresAt !== undefined ? { expiresAt } : {}) },
    }
  )
}
