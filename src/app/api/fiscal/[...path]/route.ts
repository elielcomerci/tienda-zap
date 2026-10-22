import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { decryptFiscalCredential } from '@/lib/fiscal-credentials'
import { isFiscalFeatureEnabled, type FiscalFeatureFlagKey } from '@/lib/fiscal-feature-flags'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type FiscalPathParams = { params: Promise<{ path: string[] }> }

async function resolveAccount(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || !session.user.role) {
    return { error: NextResponse.json({ error: 'Iniciá sesión para continuar.' }, { status: 401 }) } as const
  }

  const accountId = request.nextUrl.searchParams.get('accountId')
  const isAdmin = session.user.role === 'ADMIN'
  if (isAdmin && !accountId) {
    return { error: NextResponse.json({ error: 'Seleccioná una cuenta de cliente para operar.' }, { status: 422 }) } as const
  }

  const account = await prisma.fiscalClientAccount.findFirst({
    where: isAdmin ? { id: accountId! } : { userId: session.user.id },
    select: { id: true, userId: true, tenantId: true, encryptedApiKey: true, status: true },
  })
  if (!account || account.status !== 'ACTIVE') {
    return { error: NextResponse.json({ error: 'No hay una cuenta fiscal activa vinculada.' }, { status: 404 }) } as const
  }

  try {
    return { account, apiKey: decryptFiscalCredential(account.encryptedApiKey) } as const
  } catch (error) {
    console.error('[fiscal/proxy] credential decrypt failed', error instanceof Error ? error.name : 'UnknownError')
    return { error: NextResponse.json({ error: 'No se pudo abrir la credencial fiscal protegida.' }, { status: 503 }) } as const
  }
}

function allowedPath(segments: string[], method: string) {
  const path = segments.join('/')
  if (method === 'POST' && path === 'contributors') return true
  if ((method === 'GET' || method === 'DELETE') && /^contributors\/[0-9]{11}$/.test(path)) return true
  if (['GET', 'POST', 'DELETE'].includes(method) && /^contributors\/[0-9]{11}\/certificate$/.test(path)) return true
  if (method === 'POST' && /^contributors\/[0-9]{11}\/certificate\/[A-Za-z0-9_-]+\/activate$/.test(path)) return true
  if (method === 'GET' && /^contributors\/[0-9]{11}\/wsfe\/points-of-sale$/.test(path)) return true
  if (method === 'GET' && /^contributors\/[0-9]{11}\/wsfe\/vouchers\/(?:latest|[0-9]+)$/.test(path)) return true
  if (method === 'POST' && ['invoices/emit', 'invoices/void', 'padron/consultas'].includes(path)) return true
  if (method === 'GET' && path === 'usage') return true
  if (method === 'GET' && /^jobs\/[A-Za-z0-9_-]+$/.test(path)) return true
  if (method === 'POST' && /^jobs\/[A-Za-z0-9_-]+\/reconcile$/.test(path)) return true
  return false
}

async function proxy(request: NextRequest, { params }: FiscalPathParams) {
  const segments = (await params).path || []
  const method = request.method
  if (!allowedPath(segments, method)) {
    return NextResponse.json({ error: 'Operación fiscal no habilitada desde el panel.' }, { status: 404 })
  }

  const resolved = await resolveAccount(request)
  if ('error' in resolved) return resolved.error

  const path = segments.join('/')
  let requiredFlag: FiscalFeatureFlagKey | null = null
  if (method === 'GET' && /^contributors\/[0-9]{11}\/wsfe\//.test(path)) requiredFlag = 'wsfeRead'
  else if (method === 'POST' && path === 'padron/consultas') requiredFlag = 'padronQuery'
  else if (method === 'POST' && path === 'invoices/void') requiredFlag = 'invoiceVoid'
  else if (method === 'POST' && /^jobs\/[A-Za-z0-9_-]+\/reconcile$/.test(path)) requiredFlag = 'jobReconciliation'
  else if (method === 'GET' && path === 'usage') requiredFlag = 'usageVisibility'
  else if (method === 'POST' && /^contributors\/[0-9]{11}\/certificate\/[A-Za-z0-9_-]+\/activate$/.test(path)) requiredFlag = 'certificateManagement'

  if (requiredFlag && !(await isFiscalFeatureEnabled(requiredFlag))) {
    return NextResponse.json({
      error: 'Esta función fiscal está desactivada por ZAP.',
      code: 'FISCAL_FEATURE_DISABLED',
      feature: requiredFlag,
    }, { status: 423, headers: { 'Cache-Control': 'no-store' } })
  }

  const baseUrl = process.env.FISCAL_WORKER_URL?.trim()
  if (!baseUrl) return NextResponse.json({ error: 'FISCAL_WORKER_URL no está configurada.' }, { status: 503 })

  let target: URL
  try {
    target = new URL('/v1/' + segments.map(segment => encodeURIComponent(segment)).join('/'), baseUrl)
    for (const [key, value] of request.nextUrl.searchParams.entries()) {
      if (key !== 'accountId') target.searchParams.append(key, value)
    }
  } catch {
    return NextResponse.json({ error: 'No se pudo construir la solicitud fiscal.' }, { status: 500 })
  }

  try {
    const headers = new Headers({ 'X-Api-Key': resolved.apiKey, Accept: 'application/json' })
    let body: BodyInit | undefined
    if (method !== 'GET' && method !== 'HEAD' && method !== 'DELETE') {
      const contentType = request.headers.get('content-type') || ''
      if (contentType.includes('multipart/form-data')) {
        const form = await request.formData()
        body = form
      } else {
        body = await request.text()
        if (contentType) headers.set('Content-Type', contentType)
      }
    }

    const response = await fetch(target, {
      method,
      headers,
      ...(body !== undefined ? { body } : {}),
      cache: 'no-store',
      signal: AbortSignal.timeout(30_000),
    })
    const responseBody = await response.text()
    return new NextResponse(responseBody, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[fiscal/proxy] Worker request failed', {
      operation: segments[0] || 'unknown',
      error: error instanceof Error ? error.name : 'UnknownError',
    })
    return NextResponse.json({ error: 'No se pudo conectar con el servicio fiscal.' }, { status: 502 })
  }
}

export async function GET(request: NextRequest, context: FiscalPathParams) { return proxy(request, context) }
export async function POST(request: NextRequest, context: FiscalPathParams) { return proxy(request, context) }
export async function DELETE(request: NextRequest, context: FiscalPathParams) { return proxy(request, context) }
