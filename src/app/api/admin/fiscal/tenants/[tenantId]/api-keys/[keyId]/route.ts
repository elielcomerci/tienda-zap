import { NextResponse } from 'next/server'
import { fiscalWorkerRequest, requireFiscalAdmin } from '@/lib/fiscal-worker-admin'

export const runtime = 'nodejs'

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ tenantId: string; keyId: string }> }
) {
  const denied = await requireFiscalAdmin()
  if (denied) return denied

  const { tenantId, keyId } = await context.params
  if (!tenantId || !keyId || tenantId.includes('/') || keyId.includes('/')) {
    return NextResponse.json({ error: 'Identificadores inválidos.' }, { status: 400 })
  }

  return fiscalWorkerRequest(
    `/internal/tenants/${encodeURIComponent(tenantId)}/api-keys/${encodeURIComponent(keyId)}`,
    { method: 'DELETE', secret: 'provisioning' }
  )
}
