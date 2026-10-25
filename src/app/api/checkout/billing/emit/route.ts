import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { findAccessibleOrder } from '@/lib/order-access'
import { OrderInvoiceEmissionError, requestOrderInvoice } from '@/lib/order-invoice-emission'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const requestSchema = z.object({ orderId: z.string().min(1).max(128), accessToken: z.string().max(256).optional() })

export async function POST(request: NextRequest) {
  let input: z.infer<typeof requestSchema>
  try { input = requestSchema.parse(await request.json()) } catch { return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 }) }
  const order = await findAccessibleOrder(input.orderId, input.accessToken, { select: { id: true } })
  if (!order) return NextResponse.json({ error: 'No encontramos el pedido o no tenés acceso.' }, { status: 404 })
  try {
    return NextResponse.json(await requestOrderInvoice(order.id))
  } catch (error) {
    if (error instanceof OrderInvoiceEmissionError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('[checkout.billing.emit]', error instanceof Error ? error.name : 'UnknownError')
    return NextResponse.json({ error: 'No pudimos solicitar la factura ahora.' }, { status: 500 })
  }
}
