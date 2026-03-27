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

// POST /api/ordenes - crear orden TRANSFER o CASH
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = orderCheckoutSchema.parse(body)

    if (data.paymentType === 'MERCADOPAGO') {
      return Response.json({ error: 'Usar /api/checkout/mercadopago' }, { status: 400 })
    }

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
        paymentType: data.paymentType as 'TRANSFER' | 'CASH',
        total,
        notes: data.notes,
        items: {
          create: resolvedItems,
        },
      },
    })

    return Response.json({
      orderId: order.id,
      accessToken: publicAccessToken,
      successQuery: buildOrderAccessQuery(order.id, publicAccessToken),
    })
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
