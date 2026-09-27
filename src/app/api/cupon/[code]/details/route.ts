import { NextRequest, NextResponse } from 'next/server'
import { getWelcomePromoDetails } from '@/lib/coupons'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const details = await getWelcomePromoDetails(code)
  return NextResponse.json(details)
}
