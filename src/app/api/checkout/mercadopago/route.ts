import { MercadoPagoConfig, Preference } from 'mercadopago'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { orderCheckoutSchema } from '@/lib/validations'

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = orderCheckoutSchema.parse(body)

    // Crear la orden en DB primero
    const order = await prisma.order.create({
      data: {
        guestEmail: data.guestEmail,
        guestName: data.guestName,
        guestPhone: data.guestPhone,
        paymentType: 'MERCADOPAGO',
        notes: data.notes,
        total: data.items.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0),
        items: {
          create: data.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            notes: i.notes,
          })),
        },
      },
    })

    // Crear preferencia en MercadoPago
    const preference = await new Preference(client).create({
      body: {
        items: data.items.map((i: any) => ({
          id: i.productId,
          title: i.name || 'Producto ZAP',
          quantity: i.quantity,
          unit_price: i.unitPrice,
          currency_id: 'ARS',
        })),
        payer: { email: data.guestEmail },
        external_reference: order.id,
        back_urls: {
          success: `${process.env.NEXTAUTH_URL}/checkout/success?orderId=${order.id}`,
          failure: `${process.env.NEXTAUTH_URL}/checkout?error=pago_fallido`,
          pending: `${process.env.NEXTAUTH_URL}/checkout/success?orderId=${order.id}&pending=true`,
        },
        notification_url: `${process.env.NEXTAUTH_URL}/api/checkout/webhook`,
        auto_return: 'approved',
      },
    })

    return Response.json({
      preferenceId: preference.id,
      initPoint: preference.init_point,
      orderId: order.id,
    })
  } catch (error: any) {
    console.error('MP checkout error:', error)
    return Response.json({ error: error.message || 'Error al procesar el pago' }, { status: 500 })
  }
}
