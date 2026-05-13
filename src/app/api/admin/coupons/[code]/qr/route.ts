import QRCode from 'qrcode'
import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { buildCouponLandingUrl, normalizeCouponCode } from '@/lib/coupons'

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
        },
      },
    },
  })

  if (!coupon) {
    return new Response('Coupon not found', { status: 404 })
  }

  const payload =
    coupon.qrPayload ||
    buildCouponLandingUrl(
      coupon.code,
      coupon.promotion.qrBaseUrl || `${req.nextUrl.protocol}//${req.nextUrl.host}`
    )

  const svg = await QRCode.toString(payload, {
    type: 'svg',
    margin: 2,
    width: 512,
    errorCorrectionLevel: 'M',
  })

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'private, max-age=300',
      'Content-Disposition': `inline; filename="${coupon.code}.svg"`,
    },
  })
}
