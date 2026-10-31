import {auth} from '@/auth'
import {prisma} from '@/lib/prisma'
import {getCouponPresenterName} from '@/lib/coupons'
import {NextRequest,NextResponse} from 'next/server'

export const dynamic='force-dynamic'
function activePromotion(promotion:{status:string;activeFrom:Date|null;activeTo:Date|null},now:Date) {
  return promotion.status==='ACTIVE'&&(!promotion.activeFrom||promotion.activeFrom<=now)&&(!promotion.activeTo||promotion.activeTo>=now)
}

export async function GET() {
  const session=await auth()
  if(!session?.user?.id)return NextResponse.json(null,{headers:{'Cache-Control':'private, no-store'}})
  const now=new Date()
  const coupons=await prisma.promotionCoupon.findMany({
    where:{
      assignedUserId:session.user.id,
      welcomeShownAt:null,
      status:'AVAILABLE',
      usesLeft:{gt:0},
      OR:[{expiresAt:null},{expiresAt:{gte:now}}],
    },
    include:{promotion:true},
    orderBy:{createdAt:'asc'},
    take:20,
  })
  const coupon=coupons.find(item=>activePromotion(item.promotion,now))
  if(!coupon)return NextResponse.json(null,{headers:{'Cache-Control':'private, no-store'}})
  const promo=coupon.promotion
  const presenterName=getCouponPresenterName(coupon)
  const recipientName=coupon.recipientName?.trim()||null
  const recipientBusiness=coupon.recipientBusiness?.trim()||null
  return NextResponse.json({
    code:coupon.code,
    title:promo.welcomeTitle||'Un beneficio para vos',
    message:promo.welcomeMessage||`Tenés un beneficio de bienvenida para usar en la tienda ZAP. El código ${coupon.code} queda asociado a tu cuenta y se aplicará en el checkout a los productos incluidos en la promoción, según sus condiciones.`,
    conditions:promo.welcomeConditions,
    logoUrl:promo.welcomeLogoUrl,
    presenterName,
    recipientName,
    recipientBusiness,
    recipientLabel:recipientName||recipientBusiness,
    discountKind:promo.discountKind,
    discountValue:promo.discountValue,
    usesLeft:coupon.usesLeft,
  },{headers:{'Cache-Control':'private, no-store'}})
}

export async function POST(request:NextRequest) {
  const session=await auth()
  if(!session?.user?.id)return NextResponse.json({error:'Iniciá sesión.'},{status:401})
  const body=await request.json().catch(()=>null)
  const code=typeof body?.code==='string'?body.code.trim().toUpperCase().slice(0,40):''
  if(!code)return NextResponse.json({error:'Cupón no válido.'},{status:400})
  const result=await prisma.promotionCoupon.updateMany({
    where:{code,assignedUserId:session.user.id,welcomeShownAt:null},
    data:{welcomeShownAt:new Date()},
  })
  return NextResponse.json({ok:true,marked:result.count===1},{headers:{'Cache-Control':'private, no-store'}})
}
