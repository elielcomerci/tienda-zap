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
      unitPrice: z.number().min(0).optional(),
      notes: z.string().optional(),
      briefType: z.enum(['NONE', 'DESIGN', 'MUSIC', 'VIDEO']).optional(),
      briefResponses: z.record(z.string(), z.string()).optional(),
      briefReferenceLinks: z.array(z.string().url()).optional(),
      briefReferenceFiles: z
        .array(
          z.object({
            url: z.string().url(),
            objectKey: z.string().optional(),
            fileName: z.string(),
            contentType: z.string().optional(),
            sizeBytes: z.number().optional(),
          })
        )
        .optional(),
      fileUrl: z.string().url().optional(),
      designRequested: z.boolean().optional(),
      selectedOptions: z
        .array(
          z.object({
            name: z.string(),
            value: z.string(),
          })
        )
        .optional(),
      configuratorSelection: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])).optional(),
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
    const message = error?.message || 'No pudimos revisar el cupon en este momento.'
    const staleConfiguration = /(cambió desde la última cotización|configuración .* incompleta|no pudimos validar el precio actual)/i.test(message)
    const invalidRequest = error instanceof z.ZodError || /Falta el producto|producto ya no esta disponible|no esta disponible para compra online/i.test(message)
    return Response.json(
      { error: message },
      { status: staleConfiguration ? 409 : invalidRequest ? 400 : 500 }
    )
  }
}
