import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { encryptFiscalCredential } from '@/lib/fiscal-credentials'
import { fiscalWorkerRequest } from '@/lib/fiscal-worker-admin'
import { isFiscalFeatureEnabled } from '@/lib/fiscal-feature-flags'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type WorkerPayload = {
  tenants?: Array<{ id: string; name: string; slug: string; status: string; createdAt?: string; apiKeys?: unknown[] }>
  tenant?: { id: string; name: string; slug: string; status: string }
  apiKey?: { id: string; label: string; value: string; shownOnce?: boolean }
  error?: string | { message?: string; code?: string }
}

function errorMessage(payload: WorkerPayload, fallback: string) {
  return typeof payload.error === 'string' ? payload.error : payload.error?.message || fallback
}

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  return null
}

export async function GET() {
  const denied = await requireAdmin()
  if (denied) return denied

  try {
    const [users, accounts, workerResponse] = await Promise.all([
      prisma.user.findMany({
        where: { role: 'CUSTOMER', isBanned: false },
        select: { id: true, name: true, email: true, phone: true, documentId: true },
        orderBy: [{ name: 'asc' }, { email: 'asc' }],
        take: 500,
      }),
      prisma.fiscalClientAccount.findMany({
        select: {
          id: true, userId: true, tenantId: true, tenantName: true, tenantSlug: true,
          status: true, notes: true, createdAt: true, updatedAt: true,
          user: { select: { name: true, email: true, phone: true, documentId: true } },
          _count: { select: { invoices: true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      fiscalWorkerRequest('/internal/tenants', { secret: 'internal' }),
    ])

    const workerPayload = await workerResponse.json().catch(() => ({})) as WorkerPayload
    if (!workerResponse.ok) {
      return NextResponse.json({ error: errorMessage(workerPayload, 'No se pudieron consultar las cuentas del Worker.'), code: 'WORKER_TENANT_LIST_FAILED' }, { status: workerResponse.status })
    }

    return NextResponse.json({
      users,
      accounts: accounts.map(account => ({
        id: account.id,
        userId: account.userId,
        tenantId: account.tenantId,
        tenantName: account.tenantName,
        tenantSlug: account.tenantSlug,
        status: account.status,
        notes: account.notes,
        createdAt: account.createdAt.toISOString(),
        updatedAt: account.updatedAt.toISOString(),
        invoiceCount: account._count.invoices,
        customer: account.user,
      })),
      tenants: (workerPayload.tenants || []).map(tenant => ({
        id: tenant.id, name: tenant.name, slug: tenant.slug, status: tenant.status,
        assigned: accounts.some(account => account.tenantId === tenant.id),
      })),
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[admin/fiscal/clients] read failed', error instanceof Error ? error.name : 'UnknownError')
    return NextResponse.json({ error: 'No se pudieron cargar los clientes fiscales.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied
  if (!(await isFiscalFeatureEnabled('accountProvisioning'))) return NextResponse.json({ error: 'El alta y la vinculación de cuentas fiscales están desactivadas por el administrador.', code: 'FISCAL_FEATURE_DISABLED' }, { status: 423 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'El body debe ser JSON válido.' }, { status: 400 })
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 })
  }

  const input = body as { userId?: unknown; mode?: unknown; name?: unknown; slug?: unknown; tenantId?: unknown }
  const session = await auth()
  const mode = input.mode === 'connect' ? 'connect' : input.mode === 'create' ? 'create' : input.mode === 'connect-self' ? 'connect-self' : ''
  const userId = mode === 'connect-self'
    ? (session?.user?.id || '')
    : (typeof input.userId === 'string' ? input.userId.trim() : '')
  if (!userId || !mode || (mode === 'connect-self' && session?.user?.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Elegí un cliente y una acción válida.' }, { status: 422 })
  }

  const user = await prisma.user.findFirst({
    where: { id: userId, role: mode === 'connect-self' ? 'ADMIN' : 'CUSTOMER', isBanned: false },
    select: { id: true, name: true, email: true },
  })
  if (!user) return NextResponse.json({ error: 'No se encontró el cliente seleccionado.' }, { status: 404 })

  try {
    // Fail before creating a remote tenant/key if the server-side encryption key is missing.
    encryptFiscalCredential('preflight')
  } catch {
    return NextResponse.json({
      error: 'Falta configurar FISCAL_CREDENTIALS_ENCRYPTION_KEY en el servidor. No se creó ninguna cuenta.',
      code: 'FISCAL_CREDENTIALS_ENCRYPTION_NOT_CONFIGURED',
    }, { status: 503 })
  }

  const existingAccount = await prisma.fiscalClientAccount.findUnique({ where: { userId } })
  if (existingAccount) return NextResponse.json({ error: 'Este cliente ya tiene una cuenta fiscal vinculada.' }, { status: 409 })

  let tenantId = ''
  let tenantName = ''
  let tenantSlug = ''
  let apiKeyValue = ''
  let apiKeyId = ''

  if (mode === 'create') {
    const name = typeof input.name === 'string' && input.name.trim() ? input.name.trim() : (user.name || user.email)
    const slug = typeof input.slug === 'string' ? input.slug.trim().toLowerCase() : ''
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 60) {
      return NextResponse.json({ error: 'El identificador debe usar minúsculas, números y guiones.' }, { status: 422 })
    }
    const response = await fiscalWorkerRequest('/internal/tenants', {
      method: 'POST', secret: 'provisioning', body: { name, slug },
    })
    const payload = await response.json().catch(() => ({})) as WorkerPayload
    if (!response.ok || !payload.tenant || !payload.apiKey?.value) {
      return NextResponse.json({ error: errorMessage(payload, 'No se pudo crear la cuenta en el Worker.'), code: 'WORKER_PROVISION_FAILED' }, { status: response.ok ? 502 : response.status })
    }
    tenantId = payload.tenant.id
    tenantName = payload.tenant.name
    tenantSlug = payload.tenant.slug
    apiKeyValue = payload.apiKey.value
    apiKeyId = payload.apiKey.id
  } else {
    const tenantIdInput = typeof input.tenantId === 'string' ? input.tenantId.trim() : ''
    if (!tenantIdInput) return NextResponse.json({ error: 'Elegí una cuenta del Worker para vincular.' }, { status: 422 })

    const listResponse = await fiscalWorkerRequest('/internal/tenants', { secret: 'internal' })
    const listPayload = await listResponse.json().catch(() => ({})) as WorkerPayload
    if (!listResponse.ok) return NextResponse.json({ error: errorMessage(listPayload, 'No se pudo consultar el Worker.') }, { status: listResponse.status })
    const tenant = (listPayload.tenants || []).find(item => item.id === tenantIdInput)
    if (!tenant) return NextResponse.json({ error: 'La cuenta seleccionada ya no existe en el Worker.' }, { status: 404 })
    if (await prisma.fiscalClientAccount.findUnique({ where: { tenantId: tenant.id } })) {
      return NextResponse.json({ error: 'Esta cuenta del Worker ya está vinculada a otro cliente.' }, { status: 409 })
    }

    const keyResponse = await fiscalWorkerRequest(`/internal/tenants/${encodeURIComponent(tenant.id)}/api-keys`, {
      method: 'POST', secret: 'provisioning', body: { label: `tienda-zap-support-${user.id.slice(-8)}` },
    })
    const keyPayload = await keyResponse.json().catch(() => ({})) as WorkerPayload
    if (!keyResponse.ok || !keyPayload.apiKey?.value) {
      return NextResponse.json({ error: errorMessage(keyPayload, 'No se pudo crear una clave de soporte para esa cuenta.'), code: 'WORKER_KEY_CREATE_FAILED' }, { status: keyResponse.ok ? 502 : keyResponse.status })
    }
    tenantId = tenant.id
    tenantName = tenant.name
    tenantSlug = tenant.slug
    apiKeyValue = keyPayload.apiKey.value
    apiKeyId = keyPayload.apiKey.id
  }

  try {
    const account = await prisma.fiscalClientAccount.create({
      data: {
        userId,
        tenantId,
        tenantName,
        tenantSlug,
        encryptedApiKey: encryptFiscalCredential(apiKeyValue),
        status: 'ACTIVE',
      },
      select: {
        id: true, userId: true, tenantId: true, tenantName: true, tenantSlug: true,
        status: true, createdAt: true,
      },
    })
    return NextResponse.json({
      account: { ...account, createdAt: account.createdAt.toISOString(), customer: user },
      message: 'Cuenta fiscal vinculada. La credencial quedó cifrada en el servidor para que ZAP pueda dar soporte sin exponerla al navegador.',
    }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    // If the local DB write failed, revoke the just-created support key when possible.
    if ((mode === 'connect' || mode === 'connect-self') && apiKeyId) {
      await fiscalWorkerRequest(`/internal/tenants/${encodeURIComponent(tenantId)}/api-keys/${encodeURIComponent(apiKeyId)}`, {
        method: 'DELETE', secret: 'provisioning',
      }).catch(() => undefined)
    }
    console.error('[admin/fiscal/clients] account link failed', error instanceof Error ? error.name : 'UnknownError')
    return NextResponse.json({
      error: 'La cuenta se creó en el Worker, pero no se pudo guardar el vínculo local. Revisá el estado antes de repetir la operación.',
      code: 'FISCAL_ACCOUNT_LINK_FAILED',
      tenantId,
    }, { status: 500 })
  }
}
