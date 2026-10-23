import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { decryptFiscalCredential } from '@/lib/fiscal-credentials'
import { fiscalWorkerRequest } from '@/lib/fiscal-worker-admin'
import { isFiscalFeatureEnabled } from '@/lib/fiscal-feature-flags'
import { buildIntegrationApiKeyLabel, getIntegrationKeyInventoryError, type IntegrationApiKeyMetadata } from '@/lib/fiscal-integration-keys'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Environment = 'TEST' | 'PROD'
type ApiKeyMetadata = { id: string; label: string; expiresAt: string | null; lastUsedAt: string | null; revokedAt: string | null; createdAt: string }

async function resolveAccount() {
  const session = await auth()
  if (!session?.user?.id) return { response: NextResponse.json({ error: 'Iniciá sesión para continuar.' }, { status: 401 }) } as const
  const account = await prisma.fiscalClientAccount.findFirst({
    where: { userId: session.user.id, status: 'ACTIVE' },
    select: { id: true, tenantId: true, tenantName: true, tenantSlug: true, encryptedApiKey: true },
  })
  if (!account) return { response: NextResponse.json({ error: 'No hay una cuenta fiscal activa vinculada.' }, { status: 404 }) } as const
  return { account } as const
}

async function featureDisabled() { return !(await isFiscalFeatureEnabled('apiKeyManagement')) }

function assertProductionWorker() {
  const configured = process.env.FISCAL_WORKER_URL?.trim()
  if (!configured) return false
  try { return new URL(configured).origin === 'https://arca.zap.com.ar' } catch { return false }
}

function workerUrl(path: string) {
  return new URL(path, 'https://arca.zap.com.ar')
}

async function validateKey(key: string, environment: Environment) {
  const response = await fetch(await workerUrl(`/v1/contributors?environment=${environment}`), {
    headers: { 'X-Api-Key': key, Accept: 'application/json' }, cache: 'no-store', signal: AbortSignal.timeout(15_000),
  })
  const payload = await response.json().catch(() => null) as { contributors?: unknown[]; error?: { code?: string; message?: string } } | null
  if (!response.ok || !payload || !Array.isArray(payload.contributors)) {
    return { ok: false as const, status: response.status, code: payload?.error?.code || 'CONNECTION_CHECK_FAILED', message: payload?.error?.message || 'El Worker no confirmó la conexión con esta credencial.' }
  }
  return { ok: true as const, contributorCount: payload.contributors.length }
}

export async function GET() {
  const resolved = await resolveAccount()
  if ('response' in resolved) return resolved.response
  if (await featureDisabled()) return NextResponse.json({ error: 'La gestión de claves de integración todavía no está habilitada.', code: 'FISCAL_FEATURE_DISABLED' }, { status: 423 })
  const response = await fiscalWorkerRequest(`/internal/tenants/${encodeURIComponent(resolved.account.tenantId)}/api-keys`, { method: 'GET', secret: 'provisioning' })
  const payload = await response.json().catch(() => null) as { apiKeys?: ApiKeyMetadata[]; error?: unknown } | null
  if (!response.ok || !payload) return NextResponse.json(payload ?? { error: 'No se pudieron consultar las claves.' }, { status: response.status, headers: { 'Cache-Control': 'no-store' } })
  // Keep the platform's original proxy credential out of the customer-facing revocation controls.
  return NextResponse.json({ apiKeys: (payload.apiKeys ?? []).filter(key => key.label.startsWith('Integración:')) }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: NextRequest) {
  const resolved = await resolveAccount()
  if ('response' in resolved) return resolved.response
  if (await featureDisabled()) return NextResponse.json({ error: 'La gestión de claves de integración todavía no está habilitada.', code: 'FISCAL_FEATURE_DISABLED' }, { status: 423 })

  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'El body debe ser JSON válido.' }, { status: 400 }) }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'El body debe ser un objeto.' }, { status: 400 })
  const input = body as { label?: unknown; environment?: unknown; stack?: unknown; rotationKeyId?: unknown }
  const label = typeof input.label === 'string' ? input.label.trim() : ''
  const environment = input.environment
  const stack = input.stack
  if (!label || label.length > 80) return NextResponse.json({ error: 'Ingresá un nombre de proyecto de hasta 80 caracteres.' }, { status: 422 })
  if (environment !== 'TEST' && environment !== 'PROD') return NextResponse.json({ error: 'Elegí el ambiente TEST o PROD.' }, { status: 422 })
  if (!['node-typescript', 'python'].includes(String(stack))) return NextResponse.json({ error: 'Este generador todavía no soporta ese stack.' }, { status: 422 })
  const rotationKeyId = input.rotationKeyId === undefined ? null : typeof input.rotationKeyId === 'string' ? input.rotationKeyId : ''
  if (rotationKeyId === '') return NextResponse.json({ error: 'La clave que querés reemplazar no es válida.' }, { status: 422 })
  if (!assertProductionWorker()) return NextResponse.json({ error: 'El generador solo valida y crea paquetes contra https://arca.zap.com.ar. Revisá FISCAL_WORKER_URL del servidor.', code: 'FISCAL_WORKER_URL_MISMATCH' }, { status: 503 })

  let masterKey: string
  try { masterKey = decryptFiscalCredential(resolved.account.encryptedApiKey) }
  catch { return NextResponse.json({ error: 'No se pudo abrir la credencial fiscal protegida.' }, { status: 503 }) }

  try {
    const initialCheck = await validateKey(masterKey, environment)
    if (!initialCheck.ok) return NextResponse.json({ error: initialCheck.message, code: initialCheck.code, stage: 'existing-credential-check' }, { status: initialCheck.status || 502 })

    const inventoryResponse = await fiscalWorkerRequest(`/internal/tenants/${encodeURIComponent(resolved.account.tenantId)}/api-keys`, { method: 'GET', secret: 'provisioning' })
    const inventory = await inventoryResponse.json().catch(() => null) as { apiKeys?: ApiKeyMetadata[] } | null
    if (!inventoryResponse.ok || !Array.isArray(inventory?.apiKeys)) {
      return NextResponse.json({ error: 'No se pudo comprobar el límite de claves de la cuenta.' }, { status: inventoryResponse.status || 502, headers: { 'Cache-Control': 'no-store' } })
    }
    const inventoryError = getIntegrationKeyInventoryError(inventory.apiKeys as IntegrationApiKeyMetadata[], rotationKeyId)
    if (inventoryError === 'ROTATION_KEY_NOT_AVAILABLE') {
      return NextResponse.json({ error: 'La clave a reemplazar no está activa o no pertenece a una integración del cliente.', code: inventoryError }, { status: 409 })
    }
    if (inventoryError === 'API_KEY_LIMIT_REACHED') {
      return NextResponse.json({ error: 'La cuenta alcanzó el máximo de 10 claves activas. Revocá una que ya no uses para continuar.', code: 'API_KEY_LIMIT_REACHED' }, { status: 409, headers: { 'Cache-Control': 'no-store' } })
    }

    const workerLabel = buildIntegrationApiKeyLabel(label, String(stack))
    const createdResponse = await fiscalWorkerRequest(`/internal/tenants/${encodeURIComponent(resolved.account.tenantId)}/api-keys`, {
      method: 'POST', secret: 'provisioning', body: { label: workerLabel },
    })
    const created = await createdResponse.json().catch(() => null) as { apiKey?: { id: string; label: string; value: string; expiresAt?: string | null; shownOnce?: boolean }; error?: unknown } | null
    if (!createdResponse.ok || !created?.apiKey?.value || !created.apiKey.id) {
      return NextResponse.json(created ?? { error: 'No se pudo crear una clave para el proyecto.' }, { status: createdResponse.status || 502, headers: { 'Cache-Control': 'no-store' } })
    }

    let projectCheck: Awaited<ReturnType<typeof validateKey>>
    try { projectCheck = await validateKey(created.apiKey.value, environment) }
    catch { projectCheck = { ok: false, status: 502, code: 'CONNECTION_CHECK_FAILED', message: 'No hubo respuesta durante la validación de la clave nueva.' } }
    if (!projectCheck.ok) {
      const revokeResponse = await fiscalWorkerRequest(`/internal/tenants/${encodeURIComponent(resolved.account.tenantId)}/api-keys/${encodeURIComponent(created.apiKey.id)}`, { method: 'DELETE', secret: 'provisioning' })
      const revokePayload = await revokeResponse.json().catch(() => null) as { error?: unknown } | null
      return NextResponse.json({
        error: revokeResponse.ok
          ? 'La clave nueva no superó la validación y fue revocada automáticamente.'
          : 'La clave nueva no superó la validación y no se pudo confirmar su revocación. Revisá la lista de claves y revocala si sigue activa.',
        code: projectCheck.code, stage: 'new-key-check', revocationConfirmed: revokeResponse.ok,
        ...(revokePayload?.error ? { revocationError: revokePayload.error } : {}),
      }, { status: 502, headers: { 'Cache-Control': 'no-store' } })
    }

    return NextResponse.json({
      integration: {
        account: resolved.account.tenantName, tenantSlug: resolved.account.tenantSlug, environment,
        baseUrl: 'https://arca.zap.com.ar',
        validation: { ok: true, contributorCount: projectCheck.contributorCount, checkedAt: new Date().toISOString() },
      },
      apiKey: created.apiKey,
    }, { status: 201, headers: { 'Cache-Control': 'no-store', Pragma: 'no-cache' } })
  } catch (error) {
    console.error('[fiscal/integrations] key generation failed', error instanceof Error ? error.name : 'UnknownError')
    return NextResponse.json({ error: 'No se pudo validar la conexión con el Worker fiscal.', code: 'FISCAL_WORKER_UNREACHABLE' }, { status: 502, headers: { 'Cache-Control': 'no-store' } })
  }
}
