import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { orderCheckoutSchema } from '@/lib/validations'

// POST /api/ordenes — crear orden TRANSFER o CASH
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = orderCheckoutSchema.parse(body)

    if (data.paymentType === 'MERCADOPAGO') {
      return Response.json({ error: 'Usar /api/checkout/mercadopago' }, { status: 400 })
    }

    const order = await prisma.order.create({
      data: {
        guestEmail: data.guestEmail,
        guestName: data.guestName,
        guestPhone: data.guestPhone,
        paymentType: data.paymentType as 'TRANSFER' | 'CASH',
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

    return Response.json({ orderId: order.id })
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
