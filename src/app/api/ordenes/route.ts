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
import { sendEmailAsync } from '@/lib/email'
import { orderConfirmationEmail } from '@/lib/email-templates'
import { getOrderDisplayCode } from '@/lib/orders-workflow'

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

    let sellerId = null
    if (session?.user?.id) {
      const userDb = await prisma.user.findUnique({ where: { id: session.user.id }, select: { sellerId: true } })
      sellerId = userDb?.sellerId || null
    }

    if (!sellerId) {
      sellerId = req.cookies.get('zap_seller_ref')?.value || null
    }

    if (data.paymentType === 'ZAP_CREDIT' && !session?.user?.id) {
      return Response.json(
        { error: 'Inicia sesión para solicitar Crédito ZAP y seguir tus cuotas.' },
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
          sellerId,
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

    // Log initial event
    await prisma.orderEvent.create({
      data: { orderId: order.id, status: 'PENDING', note: 'Pedido creado' },
    })

    // Send confirmation email
    const email = data.email
    if (email) {
      const template = orderConfirmationEmail({
        customerName: data.name,
        orderCode: getOrderDisplayCode(order.id),
        total: pricing.total,
        itemCount: data.items.reduce((sum, i) => sum + i.quantity, 0),
        paymentType: data.paymentType,
      })
      sendEmailAsync({ to: email, ...template })
    }

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

