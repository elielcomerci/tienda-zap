import {auth} from '@/auth'
import {prisma} from '@/lib/prisma'
import {NextResponse} from 'next/server'

export const dynamic='force-dynamic'
export async function GET() {
  const session=await auth()
  if(!session?.user?.id)return NextResponse.json({code:null,available:false},{headers:{'Cache-Control':'private, no-store'}})
  const now=new Date()
  const coupons=await prisma.promotionCoupon.findMany({
    where:{assignedUserId:session.user.id},
    include:{promotion:true},
    orderBy:{createdAt:'desc'},
    take:100,
  })
  const available=coupons.find(coupon=>
    coupon.status==='AVAILABLE' &&
    coupon.usesLeft>0 &&
    (!coupon.expiresAt||coupon.expiresAt>=now) &&
    coupon.promotion.status==='ACTIVE' &&
    (!coupon.promotion.activeFrom||coupon.promotion.activeFrom<=now) &&
    (!coupon.promotion.activeTo||coupon.promotion.activeTo>=now)
  )
  return NextResponse.json({
    code:available?.code||coupons[0]?.code||null,
    available:!!available,
    usesLeft:available?.usesLeft??0,
  },{headers:{'Cache-Control':'private, no-store'}})
}
