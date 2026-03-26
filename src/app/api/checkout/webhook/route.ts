import { MercadoPagoConfig, Payment } from 'mercadopago'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

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
        await prisma.order.update({
          where: { id: payment.external_reference },
          data: {
            status: 'PAID',
            paymentId: String(payment.id),
          },
        })
        console.log(`✅ Orden ${payment.external_reference} marcada como PAID`)
      }
    }

    return Response.json({ ok: true })
  } catch (error) {
    console.error('Webhook error:', error)
    // Siempre retornar 200 para que MP no reintente
    return Response.json({ ok: true })
  }
}
