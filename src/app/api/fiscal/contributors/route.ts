import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveFiscalAccount, fiscalApiRequest } from '@/lib/fiscal-account-access'
import { isFiscalFeatureEnabled } from '@/lib/fiscal-feature-flags'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const access = await resolveFiscalAccount(request, true)
  if ('response' in access) return access.response
  const contributors = await prisma.fiscalContributor.findMany({
    where: { accountId: access.account.id },
    orderBy: [{ cuit: 'asc' }, { environment: 'asc' }],
    take: 200,
    select: {
      id: true, cuit: true, environment: true, representativeCuit: true,
      razonSocial: true, authorizationStatus: true, permissions: true,
      createdAt: true, updatedAt: true,
    },
  })

  // Refresh authorization from the Worker instead of treating the local projection as authoritative.
  const authorizationVerifiedIds = new Set<string>()
  await Promise.all(contributors.map(async item => {
    try {
      const response = await fiscalApiRequest(request, `/v1/contributors/${encodeURIComponent(item.cuit)}?environment=${item.environment}`, access.apiKey)
      if (!response.ok) return
      const payload = await response.json() as { environments?: Array<{ environment: string; representativeCuit?: string; authorizationStatus?: string; permissions?: unknown; razonSocial?: string }> }
      const remote = payload.environments?.find(entry => entry.environment === item.environment)
      if (!remote) return
      await prisma.fiscalContributor.update({
        where: { id: item.id },
        data: {
          representativeCuit: remote.representativeCuit || item.representativeCuit,
          authorizationStatus: remote.authorizationStatus || item.authorizationStatus,
          permissions: remote.permissions as any,
          razonSocial: remote.razonSocial || item.razonSocial,
        },
      })
      authorizationVerifiedIds.add(item.id)
    } catch {
      // Keep the last known projection when the Worker is temporarily unavailable.
    }
  }))

  const refreshed = await prisma.fiscalContributor.findMany({
    where: { accountId: access.account.id },
    orderBy: [{ cuit: 'asc' }, { environment: 'asc' }],
    select: {
      id: true, cuit: true, environment: true, representativeCuit: true,
      razonSocial: true, authorizationStatus: true, permissions: true,
      createdAt: true, updatedAt: true,
    },
  })
  return NextResponse.json({
    contributors: refreshed.map(item => ({
      ...item,
      authorizationVerified: authorizationVerifiedIds.has(item.id),
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
  }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: NextRequest) {
  const access = await resolveFiscalAccount(request)
  if ('response' in access) return access.response
  if (!(await isFiscalFeatureEnabled('contributorManagement'))) return NextResponse.json({ error: 'La vinculación de CUIT está desactivada por el administrador.', code: 'FISCAL_FEATURE_DISABLED' }, { status: 423 })

  let input: Record<string, unknown>
  try {
    const body: unknown = await request.json()
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('invalid')
    input = body as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'El body debe ser un objeto JSON válido.' }, { status: 400 })
  }

  const cuit = typeof input.cuit === 'string' ? input.cuit.trim() : ''
  const representativeCuit = typeof input.representativeCuit === 'string' && input.representativeCuit.trim()
    ? input.representativeCuit.trim() : cuit
  const environment = input.environment === 'PROD' ? 'PROD' : input.environment === 'TEST' ? 'TEST' : ''
  const razonSocial = typeof input.razonSocial === 'string' ? input.razonSocial.trim() : ''
  if (!/^\d{11}$/.test(cuit) || !/^\d{11}$/.test(representativeCuit) || !environment || razonSocial.length > 180) {
    return NextResponse.json({ error: 'Revisá CUIT, CUIT representante, ambiente y razón social.' }, { status: 422 })
  }

  const payload = {
    cuit,
    representativeCuit,
    environment,
    ...(razonSocial ? { razonSocial } : {}),
    ...(typeof input.domicilioFiscal === 'string' ? { domicilioFiscal: input.domicilioFiscal.trim().slice(0, 180) } : {}),
    ...(typeof input.condicionIva === 'string' ? { condicionIva: input.condicionIva } : {}),
  }
  const response = await fiscalApiRequest(request, '/v1/contributors', access.apiKey, JSON.stringify(payload))
  const result = await response.clone().json().catch(() => ({})) as {
    id?: string; cuit?: string; environment?: string; representativeCuit?: string;
    razonSocial?: string; authorizationStatus?: string; permissions?: unknown;
    error?: string | { message?: string }
  }
  if (!response.ok) return response

  try {
    const contributor = await prisma.fiscalContributor.upsert({
      where: { accountId_cuit_environment: { accountId: access.account.id, cuit, environment } },
      create: {
        accountId: access.account.id, cuit, environment, representativeCuit,
        razonSocial: razonSocial || result.razonSocial || null,
        authorizationStatus: result.authorizationStatus || 'PENDING',
        permissions: result.permissions as any,
      },
      update: {
        representativeCuit,
        razonSocial: razonSocial || result.razonSocial || undefined,
        authorizationStatus: result.authorizationStatus || undefined,
        permissions: result.permissions as any,
      },
    })
    return NextResponse.json({ ...result, localContributorId: contributor.id }, { status: response.status, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[fiscal/contributors] local sync failed', error instanceof Error ? error.name : 'UnknownError')
    return NextResponse.json({
      error: 'ARCA/Worker respondió correctamente, pero no se pudo guardar el vínculo en el panel. Revisá la cuenta antes de reintentar.',
      code: 'FISCAL_CONTRIBUTOR_SYNC_FAILED',
    }, { status: 500 })
  }
}
