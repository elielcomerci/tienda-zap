import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { findAccessibleOrder } from '@/lib/order-access'
import { isValidFiscalCuit } from '@/lib/fiscal-cuit'
import { getFiscalWorkerBaseUrl } from '@/lib/fiscal-worker-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'El body debe ser JSON válido.' }, { status: 400 }) }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 })
  const input = body as { orderId?: unknown; accessToken?: unknown; cuit?: unknown }
  const orderId = typeof input.orderId === 'string' ? input.orderId : ''
  const accessToken = typeof input.accessToken === 'string' ? input.accessToken : undefined
  const cuit = typeof input.cuit === 'string' ? input.cuit.replace(/\D/g, '') : ''
  if (!orderId || !isValidFiscalCuit(cuit)) return NextResponse.json({ error: 'Ingresá una CUIT válida de 11 dígitos.' }, { status: 422 })

  const order = await findAccessibleOrder(orderId, accessToken, { select: { id: true, status: true } })
  if (!order) return NextResponse.json({ error: 'No encontramos el pedido o no tenés acceso.' }, { status: 404 })
  if (order.status !== 'DELIVERED') return NextResponse.json({ error: 'La consulta de facturación estará disponible cuando el pedido esté entregado.' }, { status: 409 })

  const baseUrl = getFiscalWorkerBaseUrl()
  const environment = process.env.FISCAL_ORDER_ENVIRONMENT?.trim() || 'TEST'
  const secret = process.env.PUBLIC_PADRON_BACKEND_SECRET?.trim()
  if (!baseUrl || !secret) return NextResponse.json({ error: 'La consulta de padrón no está configurada en el servidor.' }, { status: 503 })
  if (!['TEST', 'PROD'].includes(environment)) return NextResponse.json({ error: 'El ambiente fiscal configurado no es válido.' }, { status: 503 })
  try {
    const url = new URL('/internal/public/padron/consultas', baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`)
    const clientKey = createHash('sha256').update(order.id).digest('hex').slice(0, 48)
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Public-Padron-Secret': secret,
        'X-Nodo-Client-IP': `order-${clientKey}`,
        'Idempotency-Key': `order-padron-${order.id}-${cuit}`,
      },
      body: JSON.stringify({ cuit, environment }),
      cache: 'no-store',
      signal: AbortSignal.timeout(30_000),
    })
    const text = await response.text()
    return new NextResponse(text, {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('content-type') || 'application/json', 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('[checkout.billing.padron] request failed', error instanceof Error ? error.name : 'UnknownError')
    return NextResponse.json({ error: 'No se pudo consultar el padrón en este momento.' }, { status: 502 })
  }
}
