import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { previewCheckoutCoupon } from '@/lib/coupons'

const couponPreviewSchema = z.object({
  couponCode: z.string(),
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().positive(),
      notes: z.string().optional(),
      designRequested: z.boolean().optional(),
      selectedOptions: z
        .array(
          z.object({
            name: z.string(),
            value: z.string(),
          })
        )
        .optional(),
    })
  ).min(1),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = couponPreviewSchema.parse(body)
    const session = await auth()
    const result = await previewCheckoutCoupon({
      ...data,
      userId: session?.user?.id,
    })

    return Response.json(result, {
      status: result.status === 'invalid' ? 400 : 200,
    })
  } catch (error: any) {
    return Response.json(
      { error: error.message || 'No pudimos revisar el cupon en este momento.' },
      { status: 500 }
    )
  }
}
