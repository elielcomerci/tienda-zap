import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { encryptFiscalCredential } from '@/lib/fiscal-credentials'
import { fiscalApiRequest } from '@/lib/fiscal-account-access'
import { fiscalWorkerRequest } from '@/lib/fiscal-worker-admin'
import { isFiscalFeatureEnabled } from '@/lib/fiscal-feature-flags'
import { isValidFiscalCuit } from '@/lib/fiscal-cuit'
import { verifyFiscalPadronResult } from '@/lib/fiscal-onboarding-proof'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type WorkerPayload = {
  tenants?: Array<{ id: string; name: string; slug: string; status: string }>
  tenant?: { id: string; name: string; slug: string; status: string }
  apiKey?: { id: string; value: string }
  error?: string | { message?: string }
}

function workerError(payload: WorkerPayload, fallback: string) {
  return typeof payload.error === 'string' ? payload.error : payload.error?.message || fallback
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'CUSTOMER') {
    return NextResponse.json({ error: 'Iniciá sesión como cliente para crear NODO ZAP.' }, { status: 401 })
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, isBanned: true },
  })
  if (!user || user.isBanned) return NextResponse.json({ error: 'La cuenta no puede realizar esta operación.' }, { status: 403 })
  if (!(await isFiscalFeatureEnabled('accountProvisioning'))) {
    return NextResponse.json({ error: 'El alta autoservicio de NODO todavía no está habilitada.', code: 'FISCAL_FEATURE_DISABLED' }, { status: 423 })
  }

  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'El body debe ser JSON válido.' }, { status: 400 }) }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 })
  const input = body as { cuit?: unknown; razonSocial?: unknown; proof?: unknown }
  const cuit = typeof input.cuit === 'string' ? input.cuit.replace(/\D/g, '') : ''
  let razonSocial = typeof input.razonSocial === 'string' ? input.razonSocial.trim().slice(0, 180) : ''
  if (input.proof !== undefined && typeof input.proof !== 'string') {
    return NextResponse.json({ error: 'La validación del padrón no es válida. Consultá nuevamente.' }, { status: 422 })
  }
  if (typeof input.proof === 'string') {
    const verified = verifyFiscalPadronResult(input.proof, user.id, cuit)
    if (!verified) return NextResponse.json({ error: 'La validación del padrón venció o no coincide con esta CUIT. Consultá nuevamente.' }, { status: 422 })
    razonSocial = verified.razonSocial
  }
  if (!isValidFiscalCuit(cuit) || !razonSocial) {
    return NextResponse.json({ error: 'Consultá el padrón y confirmá la razón social antes de continuar.' }, { status: 422 })
  }
  if (await prisma.fiscalClientAccount.findUnique({ where: { userId: user.id }, select: { id: true } })) {
    return NextResponse.json({ error: 'Tu usuario ya tiene una cuenta NODO. Entrá a Facturación para administrarla.' }, { status: 409 })
  }

  try { encryptFiscalCredential('preflight') } catch {
    return NextResponse.json({ error: 'El servidor todavía no tiene configurado el cifrado de credenciales.' }, { status: 503 })
  }

  // Stable per customer: a retry after a lost response recovers the same Worker tenant.
  const customerKey = createHash('sha256').update(user.id).digest('hex').slice(0, 24)
  const tenantSlug = `nodo-${customerKey}`
  const tenantName = razonSocial.slice(0, 120)
  let tenant: WorkerPayload['tenant'] | undefined
  let apiKey: WorkerPayload['apiKey'] | undefined

  const provisionResponse = await fiscalWorkerRequest('/internal/tenants', {
    method: 'POST', secret: 'provisioning', body: { name: tenantName, slug: tenantSlug },
  })
  const provisionPayload = await provisionResponse.json().catch(() => ({})) as WorkerPayload
  if (provisionResponse.ok && provisionPayload.tenant && provisionPayload.apiKey?.value) {
    tenant = provisionPayload.tenant
    apiKey = provisionPayload.apiKey
  } else if (provisionResponse.status === 409) {
    // The Worker may have committed the tenant while the browser lost its response.
    const listResponse = await fiscalWorkerRequest('/internal/tenants', { secret: 'internal' })
    const listPayload = await listResponse.json().catch(() => ({})) as WorkerPayload
    tenant = listPayload.tenants?.find(item => item.slug === tenantSlug)
    if (listResponse.ok && tenant) {
      const existingOwner = await prisma.fiscalClientAccount.findUnique({ where: { tenantId: tenant.id }, select: { userId: true } })
      if (existingOwner && existingOwner.userId !== user.id) {
        return NextResponse.json({ error: 'La cuenta de NODO ya está vinculada y no se puede reutilizar.' }, { status: 409 })
      }
      const keyResponse = await fiscalWorkerRequest(`/internal/tenants/${encodeURIComponent(tenant.id)}/api-keys`, {
        method: 'POST', secret: 'provisioning', body: { label: `tienda-nodo-${customerKey}` },
      })
      const keyPayload = await keyResponse.json().catch(() => ({})) as WorkerPayload
      if (keyResponse.ok) apiKey = keyPayload.apiKey
    }
  }

  if (!tenant || !apiKey?.value || !apiKey.id) {
    return NextResponse.json({ error: workerError(provisionPayload, 'No se pudo preparar la cuenta en el Worker.'), code: 'WORKER_PROVISION_FAILED' }, { status: 502 })
  }

  let account
  try {
    account = await prisma.fiscalClientAccount.create({
      data: {
        userId: user.id,
        tenantId: tenant.id,
        tenantName: tenant.name,
        tenantSlug: tenant.slug,
        encryptedApiKey: encryptFiscalCredential(apiKey.value),
        status: 'ACTIVE',
      },
      select: { id: true, userId: true, tenantId: true, tenantName: true, tenantSlug: true, status: true, createdAt: true },
    })
  } catch (error) {
    await fiscalWorkerRequest(`/internal/tenants/${encodeURIComponent(tenant.id)}/api-keys/${encodeURIComponent(apiKey.id)}`, { method: 'DELETE', secret: 'provisioning' }).catch(() => undefined)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'Tu cuenta NODO se está creando en otra solicitud. Actualizá la página para revisar el estado.' }, { status: 409 })
    }
    console.error('[fiscal/onboarding] local account save failed', error instanceof Error ? error.name : 'UnknownError')
    return NextResponse.json({ error: 'El Worker preparó la cuenta, pero Tienda no pudo guardar el vínculo. Contactá soporte antes de reintentar.', code: 'FISCAL_ACCOUNT_LINK_FAILED' }, { status: 500 })
  }

  // Creating a tenant never grants ARCA permissions. The first CUIT is linked as TEST/PENDING.
  const contributorResponse = await fiscalApiRequest(request, '/v1/contributors', apiKey.value, JSON.stringify({
    cuit,
    representativeCuit: cuit,
    environment: 'TEST',
    razonSocial,
  }))
  let contributorLinked = false
  if (contributorResponse.ok) {
    const result = await contributorResponse.clone().json().catch(() => ({})) as {
      razonSocial?: string; authorizationStatus?: string; permissions?: unknown; representativeCuit?: string
    }
    try {
      await prisma.fiscalContributor.upsert({
        where: { accountId_cuit_environment: { accountId: account.id, cuit, environment: 'TEST' } },
        create: {
          accountId: account.id, cuit, environment: 'TEST', representativeCuit: result.representativeCuit || cuit,
          razonSocial: result.razonSocial || razonSocial, authorizationStatus: result.authorizationStatus || 'PENDING',
          permissions: result.permissions as any,
        },
        update: {
          representativeCuit: result.representativeCuit || cuit, razonSocial: result.razonSocial || razonSocial,
          authorizationStatus: result.authorizationStatus || 'PENDING', permissions: result.permissions as any,
        },
      })
      contributorLinked = true
    } catch (error) {
      console.error('[fiscal/onboarding] contributor projection failed', error instanceof Error ? error.name : 'UnknownError')
    }
  }

  return NextResponse.json({
    account: { ...account, createdAt: account.createdAt.toISOString() },
    contributorLinked,
    message: contributorLinked
      ? 'NODO está creado. La CUIT quedó vinculada en TEST y pendiente de autorización fiscal.'
      : 'NODO está creado. La vinculación inicial quedó pendiente; podés completarla desde Facturación.',
  }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
}
