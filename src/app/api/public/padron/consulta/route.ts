import { NextRequest, NextResponse } from 'next/server'
import { randomUUID, createHmac } from 'node:crypto'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const WORKER_URL = 'https://arca.zap.com.ar/internal/public/padron/consultas'
const DAILY_LIMIT = 4
const MAX_CUIT_LENGTH = 11

type TurnstileResponse = { success?: boolean; 'error-codes'?: string[] }

function argentineDayKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const value = (type: string) => parts.find(part => part.type === type)?.value ?? ''
  return `${value('year')}-${value('month')}-${value('day')}`
}

function validCuit(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{11}$/.test(value)) return false
  const digits = value.split('').map(Number)
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
  const sum = weights.reduce((total, weight, index) => total + weight * digits[index], 0)
  const remainder = 11 - (sum % 11)
  const check = remainder === 11 ? 0 : remainder === 10 ? 9 : remainder
  return check === digits[10]
}

function error(message: string, status: number, code: string) {
  return NextResponse.json({ success: false, error: { code, message } }, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

export async function POST(request: NextRequest) {
  const backendSecret = process.env.PUBLIC_PADRON_BACKEND_SECRET
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY
  if (!backendSecret || !turnstileSecret) {
    console.error('[public/padron] required server configuration missing')
    return error('La consulta no está disponible en este momento.', 503, 'PUBLIC_PADRON_NOT_CONFIGURED')
  }

  let body: { cuit?: unknown; turnstileToken?: unknown; consultaId?: unknown }
  try {
    body = await request.json()
  } catch {
    return error('La solicitud debe ser JSON válido.', 400, 'INVALID_JSON')
  }
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      Object.keys(body).some(key => !['cuit', 'turnstileToken', 'consultaId'].includes(key))) {
    return error('La solicitud contiene campos no admitidos.', 400, 'INVALID_REQUEST')
  }
  if (!validCuit(body.cuit)) return error('Ingresá una CUIT válida de 11 dígitos.', 422, 'INVALID_CUIT')
  if (body.consultaId !== undefined && (typeof body.consultaId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.consultaId))) {\n    return error('El identificador de consulta no es válido.', 422, 'INVALID_CONSULTA_ID')\n  }\n  if (typeof body.turnstileToken !== 'string' || body.turnstileToken.length < 10 || body.turnstileToken.length > 2048) {
    return error('Completá la verificación de seguridad e intentá nuevamente.', 400, 'TURNSTILE_REQUIRED')
  }

  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const clientIp = forwarded || request.headers.get('x-real-ip') || undefined
  let turnstile: TurnstileResponse
  try {
    const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: turnstileSecret,
        response: body.turnstileToken,
        ...(clientIp ? { remoteip: clientIp } : {}),
      }),
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    })
    turnstile = await verify.json() as TurnstileResponse
  } catch {
    return error('No se pudo verificar la solicitud. Intentá nuevamente.', 503, 'TURNSTILE_UNAVAILABLE')
  }
  if (!turnstile.success) return error('La verificación de seguridad venció o no fue válida.', 403, 'TURNSTILE_REJECTED')

  if (!clientIp) return error('No se pudo validar el origen de la solicitud.', 400, 'CLIENT_IP_UNAVAILABLE')
  const visitorHash = createHmac('sha256', backendSecret)
     .update(`public-padron-v1|${clientIp}`)
    .digest('hex')
  const dayKey = argentineDayKey()

  let reservation: Array<{ count: number }>
  try {
    reservation = await prisma.$queryRaw<Array<{ count: number }>>`
      INSERT INTO "PublicPadronUsage" ("visitorHash", "dayKey", "count", "createdAt", "updatedAt")
      VALUES (${visitorHash}, ${dayKey}, 1, NOW(), NOW())
      ON CONFLICT ("visitorHash", "dayKey")
      DO UPDATE SET "count" = "PublicPadronUsage"."count" + 1, "updatedAt" = NOW()
      WHERE "PublicPadronUsage"."count" < ${DAILY_LIMIT}
      RETURNING "count"
    `
  } catch {
    console.error('[public/padron] quota reservation failed')
    return error('No se pudo verificar el límite de consultas. Intentá más tarde.', 503, 'PUBLIC_PADRON_LIMITER_UNAVAILABLE')
  }
  if (reservation.length === 0) {
    return NextResponse.json({
      success: false,
      error: { code: 'PUBLIC_PADRON_DAILY_LIMIT', message: 'Alcanzaste el límite de 4 consultas por día. Volvé a intentar mañana.' },
    }, { status: 429, headers: { 'Cache-Control': 'no-store', 'Retry-After': '3600' } })
  }

  const consultaId = typeof body.consultaId === 'string' ? body.consultaId : randomUUID()
  try {
    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Public-Padron-Secret': backendSecret,
        'Idempotency-Key': `public-padron-${consultaId}`,
      },
      body: JSON.stringify({ cuit: body.cuit }),
      signal: AbortSignal.timeout(20_000),
      cache: 'no-store',
    })
    const result = await response.json().catch(() => null) as Record<string, unknown> | null
    if (response.status === 200 && result && result.success === true && result.source === 'ARCA_TEST' && result.environment === 'TEST') {
      return NextResponse.json({
        success: true,
        consultaId,
        data: result.data,
        source: 'ARCA_TEST',
        environment: 'TEST',
        consultedAt: result.consultedAt,
      }, { headers: { 'Cache-Control': 'no-store' } })
    }
    if (response.status === 202) {
      return NextResponse.json({
        success: false,
        status: 'PENDING',
        consultaId,
        message: 'La consulta sigue procesándose. Esperá unos segundos antes de volver a intentar.',
        source: 'ARCA_TEST',
        environment: 'TEST',
      }, { status: 202, headers: { 'Cache-Control': 'no-store', 'Retry-After': '3' } })
    }
    if (response.status === 429) return error('Se alcanzó el límite de consultas del servicio. Intentá más tarde.', 429, 'WORKER_RATE_LIMIT')
    if (response.status === 404 || response.status === 503) return error('La consulta al padrón no está habilitada en este momento.', 503, 'PUBLIC_PADRON_UNAVAILABLE')
    console.error('[public/padron] Worker request failed', { status: response.status, consultaId })
    return error('ARCA no pudo completar la consulta. No se muestran datos anteriores como actuales.', 502, 'PADRON_QUERY_FAILED')
  } catch (reason) {
    console.error('[public/padron] Worker request timed out or failed', {
      consultaId,
      errorName: reason instanceof Error ? reason.name : 'UnknownError',
    })
    return error('La consulta tardó demasiado o no se pudo completar. Intentá nuevamente.', 504, 'PADRON_TIMEOUT')
  }
}
