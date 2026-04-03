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
import { buildDraftZapCreditPlan } from '@/lib/financing'

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

    const { resolvedItems, total } = await resolveCheckoutOrderItems(data.items)
    const zapCreditPlan =
      data.paymentType === 'ZAP_CREDIT'
        ? await buildDraftZapCreditPlan({
            baseAmount: total,
            userId: session?.user?.id,
            selectedPlan: data.zapCreditConfig,
            items: resolvedItems.map((item) => ({
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              creditDownPaymentPercent: item.creditDownPaymentPercent,
            })),
          })
        : null

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
        paymentType: data.paymentType as 'TRANSFER' | 'ZAP_CREDIT',
        total,
        notes: data.notes,
        items: {
          create: resolvedItems,
        },
        zapCreditPlan: zapCreditPlan
          ? {
              create: zapCreditPlan,
            }
          : undefined,
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

    return Response.json({
      orderId: order.id,
      accessToken: publicAccessToken,
      successQuery: buildOrderAccessQuery(order.id, publicAccessToken),
    })
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
