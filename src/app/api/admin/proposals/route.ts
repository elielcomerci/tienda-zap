import {auth} from '@/auth'
import {prisma} from '@/lib/prisma'
import {normalizeCouponCode,isCouponCodeFormatValid} from '@/lib/coupons'
import {NextRequest,NextResponse} from 'next/server'
export const dynamic='force-dynamic'

const clean=(v:unknown,max=12000)=>typeof v==='string'?v.trim().slice(0,max)||null:null
const validAmount=(v:unknown)=>v===''||v==null||(Number.isFinite(Number(v))&&Number(v)>=0&&Number(v)<1_000_000_000_000&&/^\d+(?:\.\d{1,2})?$/.test(String(v)))
const validEmail=(value:string)=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
function safeHttpsUrl(value:string,label:string){let url:URL;try{url=new URL(value)}catch{throw new Error(label)}if(url.protocol!=='https:')throw new Error(label);return url}
function isActivePromotion(promotion:{status:string;activeFrom:Date|null;activeTo:Date|null},now:Date){return promotion.status==='ACTIVE'&&(!promotion.activeFrom||promotion.activeFrom<=now)&&(!promotion.activeTo||promotion.activeTo>=now)}

export async function GET(request:NextRequest){
 const s=await auth();if(s?.user?.role!=='ADMIN')return NextResponse.json({error:'No autorizado.'},{status:403})
 const q=(request.nextUrl.searchParams.get('q')||'').trim().slice(0,120)
 const page=Math.max(1,Number.parseInt(request.nextUrl.searchParams.get('page')||'1',10)||1)
 const where=q?{OR:[{title:{contains:q,mode:'insensitive' as const}},{targetEmail:{contains:q,mode:'insensitive' as const}},{customer:{is:{name:{contains:q,mode:'insensitive' as const}}}},{businessAccount:{is:{name:{contains:q,mode:'insensitive' as const}}}}]}:undefined
 const [proposals,total]=await Promise.all([
  prisma.commercialProposal.findMany({where,orderBy:{updatedAt:'desc'},skip:(page-1)*50,take:50,include:{customer:{select:{name:true,email:true}},businessAccount:{select:{name:true}},stages:{orderBy:{position:'asc'},include:{comments:{orderBy:{createdAt:'asc'}}}},_count:{select:{invitations:true,materials:true}}}}),
  prisma.commercialProposal.count({where})
 ])
 return NextResponse.json({proposals,total,page,pageSize:50},{headers:{'Cache-Control':'private, no-store'}})
}

export async function POST(req:NextRequest){
 const session=await auth()
 if(session?.user?.role!=='ADMIN'||!session.user.id)return NextResponse.json({error:'No autorizado.'},{status:403})
 try{
  const b=await req.json().catch(()=>null)
  if(!b||typeof b!=='object'||Array.isArray(b))return NextResponse.json({error:'Los datos de la propuesta no son válidos.'},{status:400})
  const customerIdInput=clean(b.customerId,100)
  const newAccount=b.newBusinessAccount&&typeof b.newBusinessAccount==='object'?b.newBusinessAccount:null
  const customerEmail=clean(b.targetEmail,254)?.toLowerCase()||clean(newAccount?.email,254)?.toLowerCase()||null
  if(!customerEmail||!validEmail(customerEmail))return NextResponse.json({error:'Ingresá el email que va a usar el cliente para acceder a ZAP.'},{status:400})
  if(newAccount&&clean(newAccount.email,254)&&clean(newAccount.email,254)!.toLowerCase()!==customerEmail)return NextResponse.json({error:'El email del contacto y el email de acceso deben coincidir.'},{status:400})
  if(newAccount&&!clean(newAccount.name,180))return NextResponse.json({error:'El nombre del cliente es obligatorio.'},{status:400})
  if(newAccount&&clean(b.businessAccountId,100))return NextResponse.json({error:'Elegí una cuenta existente o creá una nueva, no ambas.'},{status:400})
  const businessAccountIdInput=clean(b.businessAccountId,100)
  if(!newAccount&&!businessAccountIdInput)return NextResponse.json({error:'Seleccioná una cuenta del CRM o creá el cliente.'},{status:400})
  if(Array.isArray(b.stages)&&b.stages.length>12)return NextResponse.json({error:'Una propuesta admite hasta 12 etapas.'},{status:400})
  const stages=Array.isArray(b.stages)?b.stages:[]
  for(const x of stages){
   if(!clean(x?.title,180))return NextResponse.json({error:'Cada etapa necesita un nombre.'},{status:400})
   if(x.track!=null&&!['NOW','LATER'].includes(x.track))return NextResponse.json({error:'El carril de una etapa no es válido.'},{status:400})
   if(!validAmount(x.amount))return NextResponse.json({error:'Importe inválido.'},{status:400})
  }
  const amount=b.amount===''||b.amount==null?null:Number(b.amount)
  if(!validAmount(b.amount))return NextResponse.json({error:'Importe inválido.'},{status:400})
  const yt=clean(b.youtubeUrl,1000)
  if(yt){const u=safeHttpsUrl(yt,'El enlace de YouTube debe ser HTTPS.');if(!['youtube.com','www.youtube.com','youtu.be','m.youtube.com'].includes(u.hostname))return NextResponse.json({error:'Solo se admiten enlaces de YouTube en este campo.'},{status:400})}
  const ref=clean(b.referenceUrl,1500)
  if(ref)safeHttpsUrl(ref,'El enlace de referencia debe ser HTTPS.')
  const rawCouponCode=clean(b.welcomeCouponCode,80)
  const welcomeCouponCode=rawCouponCode?normalizeCouponCode(rawCouponCode):null
  if(rawCouponCode&&!isCouponCodeFormatValid(rawCouponCode))return NextResponse.json({error:'El código del cupón no tiene un formato válido.'},{status:400})

  const proposal=await prisma.$transaction(async tx=>{
   const customer=customerIdInput
    ? await tx.user.findFirst({where:{id:customerIdInput,role:'CUSTOMER',isBanned:false},select:{id:true,email:true}})
    : await tx.user.findFirst({where:{email:{equals:customerEmail,mode:'insensitive'}},select:{id:true,email:true,role:true,isBanned:true}})
   if(customerIdInput&&!customer)throw new Error('CUSTOMER_NOT_FOUND')
   if(customerIdInput&&customer&&customer.email.toLowerCase()!==customerEmail)throw new Error('CUSTOMER_EMAIL_MISMATCH')
   if(customer&&!customerIdInput&&'isBanned'in customer&&customer.isBanned)throw new Error('ACCOUNT_BLOCKED')
   if(customer&&!customerIdInput&&'role'in customer&&customer.role!=='CUSTOMER')throw new Error('ACCOUNT_TYPE_INVALID')
   const linkedCustomerId=customer?.id||null

   let resolvedAccountId=businessAccountIdInput
   if(newAccount){
    const name=clean(newAccount.name,180)!
    const contactName=clean(newAccount.contactName,120)
    const account=await tx.businessAccount.create({
     data:{
      name,legalName:clean(newAccount.legalName,180),taxId:clean(newAccount.taxId,40),
      status:'PROSPECT',source:'PROPUESTA ZAP',userId:linkedCustomerId,
      contacts:{create:{firstName:contactName||name,email:customerEmail,phone:clean(newAccount.phone,80),whatsapp:clean(newAccount.whatsapp,80),isPrimary:true}}
     },select:{id:true}
    })
    resolvedAccountId=account.id
   }else if(resolvedAccountId){
    const account=await tx.businessAccount.findUnique({where:{id:resolvedAccountId},select:{id:true,userId:true}})
    if(!account)throw new Error('BUSINESS_ACCOUNT_NOT_FOUND')
    if(account.userId&&account.userId!==linkedCustomerId)throw new Error('ACCOUNT_LINKED_TO_OTHER_USER')
    if(linkedCustomerId&&!account.userId)await tx.businessAccount.update({where:{id:account.id},data:{userId:linkedCustomerId}})
   }

   if(welcomeCouponCode){
    const coupon=await tx.promotionCoupon.findUnique({where:{code:welcomeCouponCode},include:{promotion:true,welcomeProposal:{select:{id:true}}}})
    const now=new Date()
    if(!coupon||coupon.status!=='AVAILABLE'||coupon.usesLeft<=0||(coupon.expiresAt&&coupon.expiresAt<now)||!isActivePromotion(coupon.promotion,now))throw new Error('WELCOME_COUPON_UNAVAILABLE')
    if(coupon.promotion.discountKind!=='PERCENTAGE')throw new Error('WELCOME_COUPON_NOT_PERCENTAGE')
    if(coupon.promotion.allowedProductIds.length>0||coupon.promotion.excludedProductIds.length>0)throw new Error('WELCOME_COUPON_NOT_GLOBAL')
    if(coupon.recipientEmail&&coupon.recipientEmail.trim().toLowerCase()!==customerEmail)throw new Error('WELCOME_COUPON_EMAIL_MISMATCH')
    if(coupon.assignedUserId&&coupon.assignedUserId!==linkedCustomerId)throw new Error('WELCOME_COUPON_ASSIGNED')
    if(coupon.welcomeProposal)throw new Error('WELCOME_COUPON_ASSIGNED')
    await tx.promotionCoupon.update({where:{code:welcomeCouponCode},data:{recipientEmail:coupon.recipientEmail||customerEmail,...(linkedCustomerId&&!coupon.assignedUserId?{assignedUserId:linkedCustomerId}:{})}})
   }

   return tx.commercialProposal.create({
    data:{
     title:clean(b.title,180)||'Propuesta ZAP',summary:clean(b.summary),diagnosis:clean(b.diagnosis),solution:clean(b.solution),
     scope:clean(b.scope),deliverables:clean(b.deliverables),timeline:clean(b.timeline),conditions:clean(b.conditions),
     paymentTerms:clean(b.paymentTerms),amount,currency:'ARS',targetEmail:customerEmail,customerId:linkedCustomerId,
     businessAccountId:resolvedAccountId,createdById:session.user.id,welcomeCouponCode,
     stages:{create:stages.map((x:any,position:number)=>({position,track:x.track==='LATER'?'LATER':'NOW',title:clean(x.title,180)!,description:clean(x.description),scope:clean(x.scope),deliverables:clean(x.deliverables),timeline:clean(x.timeline),conditions:clean(x.conditions),paymentTerms:clean(x.paymentTerms),amount:x.amount===''||x.amount==null?null:Number(x.amount),currency:'ARS'}))},
     materials:{create:[...(yt?[{kind:'YOUTUBE',label:'Video de referencia',url:yt,sortOrder:0}]:[]),...(ref?[{kind:'LINK',label:'Referencia externa',url:ref,sortOrder:1}]:[])]}
    },select:{id:true,title:true,status:true,createdAt:true}
   })
  })
  return NextResponse.json({proposal},{status:201})
 }catch(error){
  const messages:Record<string,string>={
   CUSTOMER_NOT_FOUND:'No encontramos un usuario ZAP habilitado con ese email.',
   CUSTOMER_EMAIL_MISMATCH:'El email debe coincidir con el usuario seleccionado.',
   ACCOUNT_BLOCKED:'Ese email corresponde a una cuenta bloqueada.',
   ACCOUNT_TYPE_INVALID:'Ese email pertenece a una cuenta administrativa o de vendedor.',
   BUSINESS_ACCOUNT_NOT_FOUND:'No encontramos la cuenta CRM seleccionada.',
   ACCOUNT_LINKED_TO_OTHER_USER:'La cuenta CRM ya está vinculada a otra persona. Revisá el email antes de continuar.',
   WELCOME_COUPON_UNAVAILABLE:'El cupón no está disponible o su promoción no está activa.',
   WELCOME_COUPON_NOT_PERCENTAGE:'El cupón debe ofrecer un descuento porcentual.',
   WELCOME_COUPON_NOT_GLOBAL:'El cupón debe aplicar a todos los productos: sin productos incluidos o excluidos específicos.',
   WELCOME_COUPON_EMAIL_MISMATCH:'El cupón está asignado a otro email.',
   WELCOME_COUPON_ASSIGNED:'Ese código ya está asociado a otra persona o propuesta.'
  }
  if(error instanceof Error&&messages[error.message])return NextResponse.json({error:messages[error.message]},{status:400})
  console.error('admin proposal create',error)
  return NextResponse.json({error:'No pudimos guardar la propuesta.'},{status:500})
 }
}
