import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  if (!code) return NextResponse.json({ error: 'no code' })
  
  const coupon = await prisma.promotionCoupon.findUnique({
    where: { code },
    include: { promotion: true }
  })
  
  return NextResponse.json({ coupon })
}
