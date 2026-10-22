import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveFiscalAccount, fiscalApiRequest } from '@/lib/fiscal-account-access'
import { isFiscalFeatureEnabled } from '@/lib/fiscal-feature-flags'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ cuit: string }> }

function getEnvironment(request: NextRequest) {
  const environment = request.nextUrl.searchParams.get('environment')
  return environment === 'TEST' || environment === 'PROD' ? environment : null
}

export async function GET(request: NextRequest, context: RouteContext) {
  const access = await resolveFiscalAccount(request, true)
  if ('response' in access) return access.response

  const { cuit } = await context.params
  const environment = getEnvironment(request)
  if (!/^\d{11}$/.test(cuit) || !environment) {
    return NextResponse.json({ error: 'Indicá una CUIT de 11 dígitos y el ambiente TEST o PROD.' }, { status: 422 })
  }

  return fiscalApiRequest(request, `/v1/contributors/${encodeURIComponent(cuit)}`, access.apiKey)
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const access = await resolveFiscalAccount(request)
  if ('response' in access) return access.response
  if (!(await isFiscalFeatureEnabled('contributorManagement'))) {
    return NextResponse.json({ error: 'La gestión de contribuyentes está desactivada por el administrador.', code: 'FISCAL_FEATURE_DISABLED' }, { status: 423 })
  }

  const { cuit } = await context.params
  const environment = getEnvironment(request)
  if (!/^\d{11}$/.test(cuit) || !environment) {
    return NextResponse.json({ error: 'Indicá una CUIT de 11 dígitos y el ambiente TEST o PROD.' }, { status: 422 })
  }

  // The Worker revokes the tenant-CUIT association and its certificates first.
  // Only after that succeeds do we remove the local UI projection.
  const response = await fiscalApiRequest(request, `/v1/contributors/${encodeURIComponent(cuit)}`, access.apiKey)
  const payload = await response.clone().json().catch(() => ({})) as {
    error?: string | { message?: string }
    message?: string
    authorizationStatus?: string
  }
  if (!response.ok) return response

  try {
    await prisma.fiscalContributor.deleteMany({
      where: { accountId: access.account.id, cuit, environment },
    })
  } catch (error) {
    console.error('[fiscal/contributors] local unlink failed', error instanceof Error ? error.name : 'UnknownError')
    return NextResponse.json({
      error: 'El Worker revocó el vínculo, pero no se pudo actualizar la lista local. Actualizá la pantalla antes de volver a intentar.',
      code: 'FISCAL_CONTRIBUTOR_LOCAL_SYNC_FAILED',
      authorizationStatus: payload.authorizationStatus || 'REVOKED',
    }, { status: 500 })
  }

  return NextResponse.json({
    cuit,
    environment,
    authorizationStatus: payload.authorizationStatus || 'REVOKED',
    message: payload.message || `Se quitó la CUIT ${cuit} de ${environment}. El Worker revocó la relación y bloqueó sus permisos y certificados para esta cuenta.`,
  }, { headers: { 'Cache-Control': 'no-store' } })
}
