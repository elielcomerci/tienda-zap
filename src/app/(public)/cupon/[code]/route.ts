import { NextRequest, NextResponse } from 'next/server'
import { recordCouponScan } from '@/lib/coupons'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const normalizedCode = await recordCouponScan({
    couponCode: code,
    userAgent: req.headers.get('user-agent'),
    referrer: req.headers.get('referer'),
  })

  const checkoutUrl = new URL('/checkout', req.nextUrl.origin)
  checkoutUrl.searchParams.set('coupon', normalizedCode || code)

  return NextResponse.redirect(checkoutUrl)
}
