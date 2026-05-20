import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { normalizeCouponCode } from '@/lib/coupons'
import { createSingleCouponPdf } from '@/lib/coupon-card-pdf'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const session = await auth()
  if (!session || session.user?.role !== 'ADMIN') {
    return new Response('Unauthorized', { status: 401 })
  }

  const { code } = await params
  const normalizedCode = normalizeCouponCode(code)
  const coupon = await prisma.promotionCoupon.findUnique({
    where: { code: normalizedCode },
    include: {
      promotion: {
        select: {
          qrBaseUrl: true,
          name: true,
          discountKind: true,
          discountValue: true,
        },
      },
    },
  })

  if (!coupon) {
    return new Response('Coupon not found', { status: 404 })
  }

  const fallbackBaseUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}`
  const pdf = await createSingleCouponPdf(coupon, fallbackBaseUrl)

  return new Response(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Cache-Control': 'private, max-age=300',
      'Content-Disposition': `attachment; filename="${coupon.code}-tarjeta-zap.pdf"`,
    },
  })
}
