import { NextRequest, NextResponse } from 'next/server'
import { recordCouponScan } from '@/lib/coupons'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params

  let userAgent = req.headers.get('user-agent')
  let referrer = req.headers.get('referer')

  try {
    const body = await req.json()
    if (body?.userAgent) userAgent = body.userAgent
    if (body?.referrer) referrer = body.referrer
  } catch {
    // Body is optional or empty
  }

  const normalizedCode = await recordCouponScan({
    couponCode: code,
    userAgent,
    referrer,
  })

  return NextResponse.json({ normalizedCode })
}
