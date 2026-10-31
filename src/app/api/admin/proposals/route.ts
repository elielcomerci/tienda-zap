import {auth} from '@/auth'
import {prisma} from '@/lib/prisma'
import {NextRequest,NextResponse} from 'next/server'
export const dynamic='force-dynamic'
const clean=(v:unknown,max=12000)=>typeof v==='string'?v.trim().slice(0,max)||null:null
const validAmount=(v:unknown)=>v===''||v==null||(Number.isFinite(Number(v))&&Number(v)>=0&&Number(v)<1_000_000_000_000&&/^\d+(?:\.\d{1,2})?$/.test(String(v)))
const validEmail=(value:string)=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
function safeHttpsUrl(value:string,label:string){let url:URL;try{url=new URL(value)}catch{throw new Error(label)}if(url.protocol!=='https:')throw new Error(label);return url}
export async function GET(request:NextRequest){const s=await auth();if(s?.user?.role!=='ADMIN')return NextResponse.json({error:'No autorizado.'},{status:403});const q=(request.nextUrl.searchParams.get('q')||'').trim().slice(0,120);const page=Math.max(1,Number.parseInt(request.nextUrl.searchParams.get('page')||'1',10)||1);const where=q?{OR:[{title:{contains:q,mode:'insensitive' as const}},{targetEmail:{contains:q,mode:'insensitive' as const}},{customer:{is:{name:{contains:q,mode:'insensitive' as const}}}},{businessAccount:{is:{name:{contains:q,mode:'insensitive' as const}}}}]}:undefined;const [proposals,total]=await Promise.all([prisma.commercialProposal.findMany({where,orderBy:{updatedAt:'desc'},skip:(page-1)*50,take:50,include:{customer:{select:{name:true,email:true}},businessAccount:{select:{name:true}},stages:{orderBy:{position:'asc'},include:{comments:{orderBy:{createdAt:'asc'}}}},_count:{select:{invitations:true,materials:true}}}}),prisma.commercialProposal.count({where})]);return NextResponse.json({proposals,total,page,pageSize:50},{headers:{'Cache-Control':'private, no-store'}})}
export async function POST(req:NextRequest){
 const s=await auth();if(s?.user?.role!=='ADMIN'||!s.user.id)return NextResponse.json({error:'No autorizado.'},{status:403})
 try{
  const b=await req.json().catch(()=>null);if(!b||typeof b!=='object'||Array.isArray(b))return NextResponse.json({error:'Los datos de la propuesta no son válidos.'},{status:400})
  let targetEmail=clean(b.targetEmail,254)?.toLowerCase()||null
  const customerId=clean(b.customerId,100)
  if(targetEmail&&!validEmail(targetEmail))return NextResponse.json({error:'El email del destinatario no es válido.'},{status:400})
  if(customerId){const customer=await prisma.user.findFirst({where:{id:customerId,role:'CUSTOMER',isBanned:false},select:{email:true}});if(!customer)return NextResponse.json({error:'No encontramos un cliente habilitado.'},{status:400});if(targetEmail&&targetEmail!==customer.email.toLowerCase())return NextResponse.json({error:'El email debe coincidir con el cliente seleccionado.'},{status:400});targetEmail=customer.email.toLowerCase()}
  const newAccount=b.newBusinessAccount&&typeof b.newBusinessAccount==='object'?b.newBusinessAccount:null
  if(newAccount&&!clean(newAccount.name,180))return NextResponse.json({error:'El nombre del cliente es obligatorio.'},{status:400})
  if(newAccount&&clean(b.businessAccountId,100))return NextResponse.json({error:'Elegí una cuenta existente o creá una nueva, no ambas.'},{status:400})
  const businessAccountId=clean(b.businessAccountId,100)
  if(businessAccountId){const account=await prisma.businessAccount.findUnique({where:{id:businessAccountId},include:{contacts:{where:{isPrimary:true},take:1,select:{email:true}}}});if(!account)return NextResponse.json({error:'No encontramos la cuenta CRM seleccionada.'},{status:400});if(!targetEmail)targetEmail=account.contacts[0]?.email?.trim().toLowerCase()||null}
  const newEmail=clean(newAccount?.email,254)?.toLowerCase()||null
  if(newEmail&&!validEmail(newEmail))return NextResponse.json({error:'El email del cliente no es válido.'},{status:400})
  if(!targetEmail&&newEmail)targetEmail=newEmail
  if(!targetEmail&&!customerId&&!businessAccountId&&!newAccount)return NextResponse.json({error:'Asociá una cuenta CRM o indicá el email de acceso.'},{status:400})
  if(Array.isArray(b.stages)&&b.stages.length>12)return NextResponse.json({error:'Una propuesta admite hasta 12 etapas.'},{status:400})
  const stages=Array.isArray(b.stages)?b.stages:[];for(const x of stages){if(!clean(x?.title,180))return NextResponse.json({error:'Cada etapa necesita un nombre.'},{status:400});if(x.track!=null&&!['NOW','LATER'].includes(x.track))return NextResponse.json({error:'El carril de una etapa no es válido.'},{status:400});if(!validAmount(x.amount))return NextResponse.json({error:'Importe inválido.'},{status:400})}
  const amount=b.amount===''||b.amount==null?null:Number(b.amount);if(!validAmount(b.amount))return NextResponse.json({error:'Importe inválido.'},{status:400})
  const yt=clean(b.youtubeUrl,1000);if(yt){const u=safeHttpsUrl(yt,'El enlace de YouTube debe ser HTTPS.');if(!['youtube.com','www.youtube.com','youtu.be','m.youtube.com'].includes(u.hostname))return NextResponse.json({error:'Solo se admiten enlaces de YouTube en este campo.'},{status:400})}
  const ref=clean(b.referenceUrl,1500);if(ref)safeHttpsUrl(ref,'El enlace de referencia debe ser HTTPS.')
  const proposal=await prisma.$transaction(async tx=>{
   let resolvedAccountId=businessAccountId
   if(newAccount){
    const name=clean(newAccount.name,180)!
    const email=newEmail,phone=clean(newAccount.phone,80),whatsapp=clean(newAccount.whatsapp,80),contactName=clean(newAccount.contactName,120)
    const account=await tx.businessAccount.create({data:{name,legalName:clean(newAccount.legalName,180),taxId:clean(newAccount.taxId,40),status:'PROSPECT',source:'PROPUESTA ZAP',...(email||phone||whatsapp||contactName?{contacts:{create:{firstName:contactName||name,email,phone,whatsapp,isPrimary:true}}}:{})},select:{id:true}})
    resolvedAccountId=account.id
   }
   return tx.commercialProposal.create({data:{title:clean(b.title,180)||'Propuesta ZAP',summary:clean(b.summary),diagnosis:clean(b.diagnosis),solution:clean(b.solution),scope:clean(b.scope),deliverables:clean(b.deliverables),timeline:clean(b.timeline),conditions:clean(b.conditions),paymentTerms:clean(b.paymentTerms),amount,currency:'ARS',targetEmail,customerId,businessAccountId:resolvedAccountId,createdById:s.user.id,stages:{create:stages.map((x:any,position:number)=>({position,track:x.track==='LATER'?'LATER':'NOW',title:clean(x.title,180)!,description:clean(x.description),scope:clean(x.scope),deliverables:clean(x.deliverables),timeline:clean(x.timeline),conditions:clean(x.conditions),paymentTerms:clean(x.paymentTerms),amount:x.amount===''||x.amount==null?null:Number(x.amount),currency:'ARS'}))},materials:{create:[...(yt?[{kind:'YOUTUBE',label:'Video de referencia',url:yt,sortOrder:0}]:[]),...(ref?[{kind:'LINK',label:'Referencia externa',url:ref,sortOrder:1}]:[])]}},select:{id:true,title:true,status:true,createdAt:true}})
  })
  return NextResponse.json({proposal},{status:201})
 }catch(e){if(e instanceof Error&&['El enlace de referencia debe ser HTTPS.','El enlace de YouTube debe ser HTTPS.'].includes(e.message))return NextResponse.json({error:e.message},{status:400});console.error(e);return NextResponse.json({error:'No pudimos guardar la propuesta.'},{status:500})}
}
