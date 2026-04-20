import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { orderCheckoutSchema } from '@/lib/validations'
import {
  buildOrderAccessQuery,
  createOrderPublicAccessToken,
  hashOrderPublicAccessToken,
} from '@/lib/order-access'
import { buildDraftZapCreditPlan } from '@/lib/financing'
import { evaluateCheckoutPricing, reserveCouponRedemptionForOrder } from '@/lib/coupons'

// POST /api/ordenes - crear orden TRANSFER, CASH o ZAP_CREDIT
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = orderCheckoutSchema.parse(body)

    if (data.paymentType === 'MERCADOPAGO') {
      return Response.json({ error: 'Usar /api/checkout/mercadopago' }, { status: 400 })
    }

    const session = await auth()
    const publicAccessToken = createOrderPublicAccessToken()

    if (data.paymentType === 'ZAP_CREDIT' && !session?.user?.id) {
      return Response.json(
        { error: 'Inicia sesion para solicitar Credito ZAP y seguir tus cuotas.' },
        { status: 401 }
      )
    }

    const pricing = await evaluateCheckoutPricing({
      items: data.items,
      couponCode: data.couponCode,
      userId: session?.user?.id,
    })
    const zapCreditPlan =
      data.paymentType === 'ZAP_CREDIT'
        ? await buildDraftZapCreditPlan({
            baseAmount: pricing.total,
            userId: session?.user?.id,
            selectedPlan: data.zapCreditConfig,
            items: pricing.resolvedItems.map((item) => ({
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              creditDownPaymentPercent: item.creditDownPaymentPercent,
            })),
          })
        : null

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
          paymentType: data.paymentType as 'TRANSFER' | 'ZAP_CREDIT',
          subtotal: pricing.subtotal,
          discountTotal: pricing.discountTotal,
          total: pricing.total,
          couponCode: pricing.couponCode ?? null,
          pricingSnapshot: pricing.pricingSnapshot,
          notes: data.notes,
          items: {
            create: pricing.resolvedItems,
          },
          zapCreditPlan: zapCreditPlan
            ? {
                create: zapCreditPlan,
              }
            : undefined,
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

    return Response.json({
      orderId: order.id,
      accessToken: publicAccessToken,
      successQuery: buildOrderAccessQuery(order.id, publicAccessToken),
    })
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
