import { NextRequest, NextResponse } from 'next/server'
import { getFiscalWorkerBaseUrl } from '@/lib/fiscal-worker-config'
import { isValidFiscalCuit } from '@/lib/fiscal-cuit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const LOOKUP_ENVIRONMENT = 'PROD'
const LOOKUP_SOURCE = 'a13'

export async function POST(request: NextRequest) {
  let body: { cuit?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
  }

  const cuit = typeof body?.cuit === 'string' ? body.cuit.replace(/\D/g, '') : ''
  if (!isValidFiscalCuit(cuit)) {
    return NextResponse.json({ error: 'Ingresá una CUIT válida de 11 dígitos.' }, { status: 422 })
  }

  const secret = process.env.PUBLIC_PADRON_BACKEND_SECRET?.trim()
  const baseUrl = getFiscalWorkerBaseUrl()
  if (!secret || !baseUrl) {
    return NextResponse.json({ error: 'La consulta de datos fiscales no está disponible.' }, { status: 503 })
  }

  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const clientIp = forwardedFor || request.headers.get('x-real-ip')?.trim() || ''
  if (!clientIp || clientIp.length > 64 || /[\r\n]/.test(clientIp)) {
    return NextResponse.json({ error: 'No se pudo validar el origen de la consulta.' }, { status: 400 })
  }

  let target: URL
  try {
    target = new URL('/internal/public/padron/consultas', baseUrl)
  } catch {
    return NextResponse.json({ error: 'La consulta de datos fiscales no está disponible.' }, { status: 503 })
  }

  try {
    const response = await fetch(target, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Public-Padron-Secret': secret,
        'X-Nodo-Client-IP': clientIp,
        'Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify({ cuit, environment: LOOKUP_ENVIRONMENT, source: LOOKUP_SOURCE }),
      cache: 'no-store',
      signal: AbortSignal.timeout(25_000),
    })

    const result = await response.json().catch(() => null) as {
      success?: unknown
      data?: {
        cuit?: unknown
        razonSocial?: unknown
        estadoRegistral?: unknown
        actividades?: unknown
      }
      status?: unknown
      retryAfterSeconds?: unknown
      consultedAt?: unknown
      error?: { code?: unknown; message?: unknown }
    } | null

    if (response.status === 200 && result?.success === true && result.data) {
      const data = result.data
      return NextResponse.json({
        success: true,
        data: {
          cuit,
          ...(typeof data.razonSocial === 'string' ? { razonSocial: data.razonSocial } : {}),
          ...(typeof data.estadoRegistral === 'string' ? { estadoRegistral: data.estadoRegistral } : {}),
        },
        consultedAt: typeof result.consultedAt === 'string' ? result.consultedAt : new Date().toISOString(),
      }, { headers: { 'Cache-Control': 'no-store' } })
    }

    if (response.status === 202) {
      return NextResponse.json({
        pending: true,
        retryAfterSeconds: typeof result?.retryAfterSeconds === 'number' ? result.retryAfterSeconds : 3,
      }, { status: 202, headers: { 'Cache-Control': 'no-store' } })
    }

    const code = typeof result?.error?.code === 'string' ? result.error.code : ''
    if (response.status === 404 || code === 'PADRON_PERSON_NOT_FOUND') {
      return NextResponse.json({ error: 'ARCA no encontró datos registrales para esa CUIT.' }, { status: 404 })
    }
    if (response.status === 429) {
      return NextResponse.json({ error: 'Se alcanzó el límite de consultas. Probá nuevamente más tarde.' }, { status: 429 })
    }
    if (response.status === 403) {
      return NextResponse.json({ error: 'La consulta de padrón no está autorizada para este servicio.' }, { status: 503 })
    }
    return NextResponse.json({ error: 'ARCA no pudo completar la consulta. Podés continuar y cargar los datos manualmente.' }, { status: 502 })
  } catch (error) {
    console.error('[checkout/fiscal-lookup] Worker request failed', error instanceof Error ? error.name : 'UnknownError')
    return NextResponse.json({ error: 'No pudimos consultar ARCA en este momento. Podés continuar con la compra.' }, { status: 502 })
  }
}
