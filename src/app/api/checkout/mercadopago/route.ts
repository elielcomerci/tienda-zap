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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = orderCheckoutSchema.parse(body)
    const accessToken = process.env.MP_ACCESS_TOKEN

    if (!accessToken) {
      throw new Error('MP_ACCESS_TOKEN no esta configurado.')
    }

    const session = await auth()
    const publicAccessToken = createOrderPublicAccessToken()
    const { resolvedItems, total } = await resolveCheckoutOrderItems(data.items)
    const client = new MercadoPagoConfig({ accessToken })

    const order = await prisma.order.create({
      data: {
        userId: session?.user?.id,
        publicAccessTokenHash: hashOrderPublicAccessToken(publicAccessToken),
        guestName: data.name,
        guestEmail: data.email,
        guestPhone: data.phone,

        // New fields snapshot
        documentId: data.documentId,
        billingAddress: data.billingAddress,
        billingCity: data.billingCity,
        billingProvince: data.billingProvince,
        shippingAddress: data.shippingAddress,
        shippingCity: data.shippingCity,
        shippingProvince: data.shippingProvince,
        shippingPostalCode: data.shippingPostalCode,

        status: 'PENDING',
        paymentType: 'MERCADOPAGO',
        total,
        notes: data.notes,
        items: {
          create: resolvedItems,
        },
      },
    })

    // Sync with User Profile if logged in
    if (session?.user?.id) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          phone: data.phone,
          documentId: data.documentId,
          billingAddress: data.billingAddress,
          billingCity: data.billingCity,
          billingProvince: data.billingProvince,
          shippingAddress: data.shippingAddress,
          shippingCity: data.shippingCity,
          shippingProvince: data.shippingProvince,
          shippingPostalCode: data.shippingPostalCode,
        },
      })
    }

    const successQuery = buildOrderAccessQuery(order.id, publicAccessToken)
    const baseUrl = req.nextUrl.origin
    const successUrl = new URL('/checkout/success', baseUrl)
    successUrl.search = successQuery
    const failureUrl = new URL('/checkout', baseUrl)
    failureUrl.searchParams.set('error', 'pago_fallido')
    const pendingUrl = new URL('/checkout/success', baseUrl)
    pendingUrl.search = `${successQuery}&pending=true`
    const notificationUrl = new URL('/api/checkout/webhook', baseUrl)

    const preference = await new Preference(client).create({
      body: {
        items: resolvedItems.map((item) => ({
          id: item.productId,
          title: 'Producto ZAP',
          quantity: item.quantity,
          unit_price: item.unitPrice,
          currency_id: 'ARS',
        })),
        payer: { email: data.email },
        external_reference: order.id,
        back_urls: {
          success: successUrl.toString(),
          failure: failureUrl.toString(),
          pending: pendingUrl.toString(),
        },
        notification_url: notificationUrl.toString(),
        auto_return: 'approved',
      },
    })

    // Guardar preferenceId para poder recuperar el link de pago sin crear orden duplicada
    await prisma.order.update({
      where: { id: order.id },
      data: { mpPreferenceId: preference.id },
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
