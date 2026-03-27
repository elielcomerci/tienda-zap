import { MercadoPagoConfig, Payment } from 'mercadopago'
import { NextRequest } from 'next/server'
import { syncOrderStatusAfterPayment } from '@/lib/orders-workflow'

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('MP Webhook received:', JSON.stringify(body, null, 2))

    if (body.type === 'payment' && body.data?.id) {
      const payment = await new Payment(client).get({ id: body.data.id })

      if (payment.status === 'approved' && payment.external_reference) {
        const nextStatus = await syncOrderStatusAfterPayment(
          payment.external_reference,
          String(payment.id)
        )
        console.log(`Orden ${payment.external_reference} actualizada a ${nextStatus}`)
      }
    }

    return Response.json({ ok: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return Response.json({ ok: true })
  }
}
