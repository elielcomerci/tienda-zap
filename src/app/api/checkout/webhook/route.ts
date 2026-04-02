import { MercadoPagoConfig, Payment } from 'mercadopago'
import { NextRequest } from 'next/server'
import { syncOrderStatusAfterPayment } from '@/lib/orders-workflow'

function getMercadoPagoClient() {
  const accessToken = process.env.MP_ACCESS_TOKEN
  if (!accessToken) {
    throw new Error('MP_ACCESS_TOKEN no esta configurado.')
  }

  return new MercadoPagoConfig({ accessToken })
}

export async function POST(req: NextRequest) {
  try {
    const accessToken = process.env.MP_ACCESS_TOKEN
    if (!accessToken) {
      throw new Error('MP_ACCESS_TOKEN no esta configurado.')
    }

    const body = await req.json()

    if (body.type === 'payment' && body.data?.id) {
      const payment = await new Payment(getMercadoPagoClient()).get({ id: body.data.id })

      if (payment.status === 'approved' && payment.external_reference) {
        await syncOrderStatusAfterPayment(payment.external_reference, String(payment.id))
      }
    }

    return Response.json({ ok: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return Response.json({ ok: true })
  }
}
