import {auth} from '@/auth'
import {prisma} from '@/lib/prisma'
import {NextRequest,NextResponse} from 'next/server'
export const dynamic='force-dynamic'
export async function POST(request:NextRequest,{params}:{params:Promise<{proposalId:string}>}) {
  const session=await auth()
  if(session?.user?.role!=='ADMIN'||!session.user.id)return NextResponse.json({error:'No autorizado.'},{status:403})
  const {proposalId}=await params
  const proposal=await prisma.commercialProposal.findUnique({where:{id:proposalId},select:{id:true}})
  if(!proposal)return NextResponse.json({error:'No encontramos la propuesta.'},{status:404})
  const body=await request.json().catch(()=>null)
  const label=typeof body?.label==='string'?body.label.trim().slice(0,180):''
  const rawUrl=typeof body?.url==='string'?body.url.trim(): ''
  if(!rawUrl||rawUrl.length>1500)return NextResponse.json({error:'Ingresá un enlace válido.'},{status:400})
  let url:URL
  try{url=new URL(rawUrl)}catch{return NextResponse.json({error:'El enlace no es válido.'},{status:400})}
  if(url.protocol!=='https:')return NextResponse.json({error:'Solo se admiten enlaces HTTPS.'},{status:400})
  const youtube=['youtube.com','www.youtube.com','youtu.be','m.youtube.com'].includes(url.hostname)
  const material=await prisma.commercialProposalMaterial.create({data:{proposalId,kind:youtube?'YOUTUBE':'LINK',label:label||null,url:url.toString(),sortOrder:await prisma.commercialProposalMaterial.count({where:{proposalId}})}})
  return NextResponse.json({material},{status:201,headers:{'Cache-Control':'private, no-store'}})
}
