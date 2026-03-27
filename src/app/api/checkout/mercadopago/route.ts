import { MercadoPagoConfig, Preference } from 'mercadopago'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { orderCheckoutSchema } from '@/lib/validations'
import { auth } from '@/auth'

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = orderCheckoutSchema.parse(body)

    const session = await auth()
    const userId = session?.user?.id

    // Crear orden pendiente
    const order = await prisma.order.create({
      data: {
        userId: session?.user?.id,
        guestName: data.name,
        guestEmail: data.email,
        guestPhone: data.phone,
        status: 'PENDING',
        paymentType: 'MERCADOPAGO',
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
        payer: { email: data.email },
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
