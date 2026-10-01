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

  const productsUrl = new URL('/productos', req.nextUrl.origin)
  productsUrl.searchParams.set('c', normalizedCode || code)

  const response = NextResponse.redirect(productsUrl)
  
  const isZapDomain =
    req.nextUrl.hostname === 'zap.com.ar' || req.nextUrl.hostname.endsWith('.zap.com.ar')

  response.cookies.set('zap_welcome_promo', normalizedCode || code, {
    path: '/',
    domain: isZapDomain ? '.zap.com.ar' : undefined,
    maxAge: 60 * 60 * 24 * 60, // 60 dias
    httpOnly: false,
    sameSite: 'lax',
  })

  return response
}
