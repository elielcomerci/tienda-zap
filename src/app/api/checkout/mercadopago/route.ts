import { MercadoPagoConfig, Preference } from 'mercadopago'
import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { orderCheckoutSchema } from '@/lib/validations'
import {
  buildOrderAccessQuery,
  createOrderPublicAccessToken,
  hashOrderPublicAccessToken,
} from '@/lib/order-access'
import { resolveCheckoutOrderItems } from '@/lib/checkout-orders'

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = orderCheckoutSchema.parse(body)

    const session = await auth()
    const publicAccessToken = createOrderPublicAccessToken()
    const { resolvedItems, total } = await resolveCheckoutOrderItems(data.items)

    const order = await prisma.order.create({
      data: {
        userId: session?.user?.id,
        publicAccessTokenHash: hashOrderPublicAccessToken(publicAccessToken),
        guestName: data.name,
        guestEmail: data.email,
        guestPhone: data.phone,
        status: 'PENDING',
        paymentType: 'MERCADOPAGO',
        total,
        notes: data.notes,
        items: {
          create: resolvedItems,
        },
      },
    })

    const successQuery = buildOrderAccessQuery(order.id, publicAccessToken)

    const preference = await new Preference(client).create({
      body: {
        items: data.items.map((item: any, index: number) => ({
          id: item.productId,
          title: item.name || 'Producto ZAP',
          quantity: item.quantity,
          unit_price: resolvedItems[index]?.unitPrice || item.unitPrice,
          currency_id: 'ARS',
        })),
        payer: { email: data.email },
        external_reference: order.id,
        back_urls: {
          success: `${process.env.NEXTAUTH_URL}/checkout/success?${successQuery}`,
          failure: `${process.env.NEXTAUTH_URL}/checkout?error=pago_fallido`,
          pending: `${process.env.NEXTAUTH_URL}/checkout/success?${successQuery}&pending=true`,
        },
        notification_url: `${process.env.NEXTAUTH_URL}/api/checkout/webhook`,
        auto_return: 'approved',
      },
    })

    return Response.json({
      preferenceId: preference.id,
      initPoint: preference.init_point,
      orderId: order.id,
      accessToken: publicAccessToken,
    })
  } catch (error: any) {
    console.error('MP checkout error:', error)
    return Response.json({ error: error.message || 'Error al procesar el pago' }, { status: 500 })
  }
}
