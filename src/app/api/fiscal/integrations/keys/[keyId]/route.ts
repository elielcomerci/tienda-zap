import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { fiscalWorkerRequest } from '@/lib/fiscal-worker-admin'
import { isFiscalFeatureEnabled } from '@/lib/fiscal-feature-flags'

export const runtime = 'nodejs'

export async function DELETE(_request: Request, context: { params: Promise<{ keyId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Iniciá sesión para continuar.' }, { status: 401 })
  const account = await prisma.fiscalClientAccount.findFirst({
    where: { userId: session.user.id, status: 'ACTIVE' }, select: { tenantId: true },
  })
  if (!account) return NextResponse.json({ error: 'No hay una cuenta fiscal activa vinculada.' }, { status: 404 })
  if (!(await isFiscalFeatureEnabled('apiKeyManagement'))) return NextResponse.json({ error: 'La gestión de claves de integración todavía no está habilitada.', code: 'FISCAL_FEATURE_DISABLED' }, { status: 423 })

  const { keyId } = await context.params
  if (!/^[A-Za-z0-9_-]+$/.test(keyId)) return NextResponse.json({ error: 'Identificador de clave inválido.' }, { status: 400 })
  return fiscalWorkerRequest(`/internal/tenants/${encodeURIComponent(account.tenantId)}/api-keys/${encodeURIComponent(keyId)}`, { method: 'DELETE', secret: 'provisioning' })
}
