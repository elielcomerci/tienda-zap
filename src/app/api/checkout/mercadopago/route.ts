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
import { evaluateCheckoutPricing, reserveCouponRedemptionForOrder } from '@/lib/coupons'

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
    const pricing = await evaluateCheckoutPricing({
      items: data.items,
      couponCode: data.couponCode,
      userId: session?.user?.id,
    })
    const client = new MercadoPagoConfig({ accessToken })

    const order = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          userId: session?.user?.id,
          publicAccessTokenHash: hashOrderPublicAccessToken(publicAccessToken),
          guestName: data.name,
          guestEmail: data.email,
          guestPhone: data.phone,

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
          subtotal: pricing.subtotal,
          discountTotal: pricing.discountTotal,
          total: pricing.total,
          couponCode: pricing.couponCode ?? null,
          pricingSnapshot: pricing.pricingSnapshot,
          notes: data.notes,
          items: {
            create: pricing.resolvedItems,
          },
        },
      })

      if (pricing.couponCode && pricing.discountTotal > 0) {
        await reserveCouponRedemptionForOrder({
          tx,
          orderId: createdOrder.id,
          couponCode: pricing.couponCode,
          subtotal: pricing.subtotal,
          discountTotal: pricing.discountTotal,
          userId: session?.user?.id,
        })
      }

      return createdOrder
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

    const mercadoPagoItems =
      pricing.discountTotal > 0
        ? [
            {
              id: `pedido-${order.id}`,
              title: pricing.appliedCoupon
                ? `Pedido ZAP · ${pricing.appliedCoupon.promotionName}`
                : 'Pedido ZAP',
              quantity: 1,
              unit_price: pricing.total,
              currency_id: 'ARS',
            },
          ]
        : pricing.resolvedItems.map((item) => ({
            id: item.productId,
            title: 'Producto ZAP',
            quantity: item.quantity,
            unit_price: item.unitPrice,
            currency_id: 'ARS',
          }))

    const preference = await new Preference(client).create({
      body: {
        items: mercadoPagoItems,
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
