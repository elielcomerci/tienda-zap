import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { isValidFiscalCuit } from '@/lib/fiscal-cuit'
import { signFiscalPadronResult } from '@/lib/fiscal-onboarding-proof'
import { getFiscalWorkerBaseUrl } from '@/lib/fiscal-worker-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || !['CUSTOMER', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Iniciá sesión como cliente para continuar.' }, { status: 401 })
  }
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { isBanned: true } })
  if (!user || user.isBanned) return NextResponse.json({ error: 'La cuenta no puede realizar esta operación.' }, { status: 403 })

  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'El body debe ser JSON válido.' }, { status: 400 }) }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 })
  const input = body as { cuit?: unknown; source?: unknown }
  const source = input.source === undefined ? 'a13' : input.source
  if (source !== 'a13' && source !== 'constancia') return NextResponse.json({ error: 'El servicio debe ser Constancia de Inscripción o A13.' }, { status: 422 })
  const cuit = typeof input.cuit === 'string' ? input.cuit.replace(/\D/g, '') : ''
  const idempotencyKey = request.headers.get('Idempotency-Key')?.trim() ?? ''
  if (!isValidFiscalCuit(cuit)) return NextResponse.json({ error: 'Ingresá una CUIT válida de 11 dígitos.' }, { status: 422 })
  if (!/^[A-Za-z0-9._:-]{1,100}$/.test(idempotencyKey)) return NextResponse.json({ error: 'Falta una clave de consulta válida.' }, { status: 422 })

  const baseUrl = getFiscalWorkerBaseUrl()
  const secret = process.env.PUBLIC_PADRON_BACKEND_SECRET?.trim()
  if (!baseUrl || !secret) return NextResponse.json({ error: 'La consulta de padrón no está configurada en el servidor.' }, { status: 503 })

  try {
    const url = new URL('/internal/public/padron/consultas', baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`)
    const clientKey = createHash('sha256').update(session.user.id).digest('hex').slice(0, 48)
    const headers = {
      'Content-Type': 'application/json',
      'X-Public-Padron-Secret': secret,
      'X-Nodo-Client-IP': `customer-${clientKey}`,
      'Idempotency-Key': idempotencyKey,
    }
    const requestWorker = (includeSource: boolean) => fetch(url, {
      method: 'POST',
      headers,
      // The server uses ZAP's platform identity; callers cannot choose the represented CUIT.
      body: JSON.stringify({ cuit, environment: 'PROD', ...(includeSource ? { source } : {}) }),
      cache: 'no-store',
      signal: AbortSignal.timeout(30_000),
    })
    // Older Worker deployments default to A13 and reject the newer `source` field.
    let response = await requestWorker(source === 'constancia')
    let usedA13CompatibilityFallback = source === 'a13'
    if (source === 'constancia' && response.status === 400) {
      const firstText = await response.clone().text()
      let unsupportedSource = false
      try {
        const failure = JSON.parse(firstText) as { error?: { code?: unknown; message?: unknown } }
        unsupportedSource = failure.error?.code === 'INVALID_REQUEST' &&
          typeof failure.error.message === 'string' &&
          /solo admite cuit,\s*environment(?:,| y)\s*turnstileToken/i.test(failure.error.message)
      } catch {
        unsupportedSource = false
      }
      if (unsupportedSource) {
        response = await requestWorker(false)
        usedA13CompatibilityFallback = true
      }
    }
    const text = await response.text()
    if (response.ok) {
      try {
        const payload = JSON.parse(text) as { success?: boolean; source?: string; data?: { cuit?: string; razonSocial?: string; estadoRegistral?: string } }
        if (payload.success && payload.data?.cuit === cuit && payload.data.razonSocial?.trim()) {
          const proof = signFiscalPadronResult({
            userId: session.user.id,
            cuit,
            razonSocial: payload.data.razonSocial.trim().slice(0, 180),
            estadoRegistral: payload.data.estadoRegistral?.slice(0, 120),
          })
          if (!proof) return NextResponse.json({ error: 'La validación segura del padrón no está configurada.' }, { status: 503 })
          return NextResponse.json({ ...payload, ...(usedA13CompatibilityFallback ? { source: 'ARCA_A13' } : {}), proof }, { status: response.status, headers: { 'Cache-Control': 'no-store' } })
        }
      } catch {
        // Preserve the Worker's safe response shape when it is not a successful lookup.
      }
    }
    if (response.ok && usedA13CompatibilityFallback) {
      try {
        const payload = JSON.parse(text) as Record<string, unknown>
        return NextResponse.json({ ...payload, source: 'ARCA_A13' }, { status: response.status, headers: { 'Cache-Control': 'no-store' } })
      } catch {
        // Preserve the Worker's response if it is not JSON.
      }
    }
    if (response.status === 400) {
      try {
        const failure = JSON.parse(text) as { error?: string | { code?: unknown; message?: unknown } }
        const workerError = failure.error
        const code = typeof workerError === 'object' && workerError !== null ? workerError.code : undefined
        const message = typeof workerError === 'object' && workerError !== null ? workerError.message : workerError
        if (code === 'INVALID_REQUEST' && typeof message === 'string' && /solo admite cuit,\s*environment(?:,| y)\s*turnstileToken/i.test(message)) {
          return NextResponse.json({
            error: 'El servicio de consulta fiscal necesita una actualización para completar esta consulta. No se modificó el diseño.',
            code: 'PADRON_WORKER_INCOMPATIBLE',
          }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
        }
      } catch {
        // Keep the Worker's safe error response if it does not match a known compatibility failure.
      }
    }
    return new NextResponse(text, {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('content-type') || 'application/json', 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('[fiscal/onboarding/padron] request failed', error instanceof Error ? error.name : 'UnknownError')
    return NextResponse.json({ error: 'No se pudo consultar el padrón en este momento.' }, { status: 502 })
  }
}
