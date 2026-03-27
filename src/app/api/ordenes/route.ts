import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { orderCheckoutSchema } from '@/lib/validations'
import { auth } from '@/auth'

// POST /api/ordenes — crear orden TRANSFER o CASH
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = orderCheckoutSchema.parse(body)

    if (data.paymentType === 'MERCADOPAGO') {
      return Response.json({ error: 'Usar /api/checkout/mercadopago' }, { status: 400 })
    }

    const session = await auth()

    const order = await prisma.order.create({
      data: {
        userId: session?.user?.id,
        guestName: data.name,
        guestEmail: data.email,
        guestPhone: data.phone,
        status: 'PENDING',
        paymentType: data.paymentType as 'TRANSFER' | 'CASH',
        total: data.items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0),
        notes: data.notes,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            notes: item.notes,
            fileUrl: item.fileUrl,
            designRequested: item.designRequested,
            selectedOptions: item.selectedOptions ? {
              create: item.selectedOptions.map((opt: any) => ({
                optionName: opt.name,
                valueName: opt.value
              }))
            } : undefined
          })),
        },
      },
    })

    return Response.json({ orderId: order.id })
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
