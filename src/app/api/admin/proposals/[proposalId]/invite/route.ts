import {auth} from '@/auth'
import {prisma} from '@/lib/prisma'
import {createHash,randomBytes} from 'node:crypto'
import {NextRequest,NextResponse} from 'next/server'

export const dynamic='force-dynamic'

export async function POST(request:NextRequest,{params}:{params:Promise<{proposalId:string}>}) {
  const session=await auth()
  if(session?.user?.role!=='ADMIN'||!session.user.id) return NextResponse.json({error:'No autorizado.'},{status:403})
  const {proposalId}=await params
  const proposal=await prisma.commercialProposal.findUnique({
    where:{id:proposalId},
    include:{stages:{orderBy:{position:'asc'}},materials:{orderBy:{sortOrder:'asc'}}}
  })
  if(!proposal) return NextResponse.json({error:'No encontramos la propuesta.'},{status:404})
  if(!proposal.customerId&&!proposal.targetEmail) return NextResponse.json({error:'Asociá un cliente o ingresá su email antes de generar la invitación.'},{status:400})
  const token=randomBytes(32).toString('base64url')
  const tokenHash=createHash('sha256').update(token).digest('hex')
  const invite=await prisma.$transaction(async tx=>{
    const existingVersion=await tx.commercialProposalVersion.findUnique({
      where:{proposalId_version:{proposalId,version:proposal.version}},
      select:{id:true}
    })
    if(!existingVersion) {
      const snapshot={
        version:proposal.version,title:proposal.title,summary:proposal.summary,diagnosis:proposal.diagnosis,
        solution:proposal.solution,scope:proposal.scope,deliverables:proposal.deliverables,timeline:proposal.timeline,
        conditions:proposal.conditions,amount:proposal.amount?.toString()??null,currency:proposal.currency,
        paymentTerms:proposal.paymentTerms,status:proposal.status,
        stages:proposal.stages.map(stage=>({
          position:stage.position,title:stage.title,description:stage.description,scope:stage.scope,
          deliverables:stage.deliverables,timeline:stage.timeline,conditions:stage.conditions,
          amount:stage.amount?.toString()??null,currency:stage.currency,paymentTerms:stage.paymentTerms
        })),
        materials:proposal.materials.map(material=>({
          id:material.id,kind:material.kind,label:material.label,url:material.url,fileName:material.fileName,
          contentType:material.contentType,sizeBytes:material.sizeBytes,note:material.note,createdAt:material.createdAt.toISOString()
        }))
      }
      await tx.commercialProposalVersion.create({data:{proposalId,version:proposal.version,createdById:session.user.id!,snapshot}})
    }
    await tx.commercialProposalInvite.updateMany({where:{proposalId,revokedAt:null},data:{revokedAt:new Date()}})
    const created=await tx.commercialProposalInvite.create({
      data:{proposalId,tokenHash,createdById:session.user.id!,expiresAt:new Date(Date.now()+14*24*60*60*1000)},
      select:{id:true,expiresAt:true}
    })
    await tx.commercialProposal.update({where:{id:proposalId},data:{status:'SHARED'}})
    return created
  })
  const origin=process.env.NEXT_PUBLIC_SITE_URL||new URL(request.url).origin
  return NextResponse.json({url:origin+'/propuesta/'+token,expiresAt:invite.expiresAt},{headers:{'Cache-Control':'private, no-store'}})
}


export async function DELETE(_request:NextRequest,{params}:{params:Promise<{proposalId:string}>}) {
  const session=await auth()
  if(session?.user?.role!=='ADMIN') return NextResponse.json({error:'No autorizado.'},{status:403})
  const {proposalId}=await params
  const proposal=await prisma.commercialProposal.findUnique({where:{id:proposalId},select:{id:true}})
  if(!proposal) return NextResponse.json({error:'No encontramos la propuesta.'},{status:404})
  const result=await prisma.$transaction(async tx=>{
    const revoked=await tx.commercialProposalInvite.updateMany({where:{proposalId,revokedAt:null},data:{revokedAt:new Date()}})
    await tx.commercialProposal.update({where:{id:proposalId},data:{status:'DRAFT'}})
    return revoked.count
  })
  return NextResponse.json({ok:true,revoked:result},{headers:{'Cache-Control':'private, no-store'}})
}
