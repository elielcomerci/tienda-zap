import {auth} from '@/auth'
import {prisma} from '@/lib/prisma'
import {NextRequest,NextResponse} from 'next/server'

export const dynamic='force-dynamic'
const allowed=new Set(['ACCEPTED','PENDING','QUERY','CHANGES_REQUESTED','REJECTED'])

export async function POST(req:NextRequest,{params}:{params:Promise<{proposalId:string;stageId:string}>}) {
  const session=await auth()
  if(!session?.user?.id) return NextResponse.json({error:'Iniciá sesión.'},{status:401})
  const {proposalId,stageId}=await params
  try {
    const body=await req.json()
    const action=typeof body.action==='string'?body.action:''
    const message=typeof body.message==='string'?body.message.trim().slice(0,4000):''
    if(!allowed.has(action)) return NextResponse.json({error:'Decisión no válida.'},{status:400})
    if(action!=='ACCEPTED'&&!message) return NextResponse.json({error:'Dejanos un comentario para registrar esta decisión.'},{status:400})

    const result=await prisma.$transaction(async tx=>{
      const stage=await tx.commercialProposalStage.findFirst({
        where:{id:stageId,proposalId},
        include:{proposal:{select:{customerId:true,createdById:true,title:true}}}
      })
      if(!stage||stage.proposal.customerId!==session.user.id) throw new Error('NOT_FOUND')
      if(stage.clientWorkId) throw new Error('ALREADY_ACCEPTED')

      let workId:string|null=null
      if(action==='ACCEPTED') {
        const work=await tx.clientWork.create({
          data:{
            userId:session.user.id!,
            createdById:stage.proposal.createdById,
            title:stage.title||stage.proposal.title||'Trabajo ZAP',
            description:[stage.description,stage.scope,stage.deliverables].filter(Boolean).join('\n\n')||null
          },
          select:{id:true}
        })
        const claimed=await tx.commercialProposalStage.updateMany({
          where:{id:stage.id,clientWorkId:null},
          data:{status:action,clientWorkId:work.id}
        })
        if(!claimed.count) {
          await tx.clientWork.delete({where:{id:work.id}})
          const latest=await tx.commercialProposalStage.findUnique({where:{id:stage.id},select:{clientWorkId:true}})
          return {workId:latest?.clientWorkId||null,alreadyAccepted:true}
        }
        workId=work.id
      } else {
        await tx.commercialProposalStage.update({where:{id:stage.id},data:{status:action}})
      }
      await tx.commercialProposalStageComment.create({
        data:{
          stageId,authorId:session.user.id,authorName:session.user.name||null,
          authorEmail:session.user.email||null,authorRole:'CUSTOMER',action,message:message||null
        }
      })
      return {workId,alreadyAccepted:false}
    })
    return NextResponse.json({ok:true,workId:result.workId,alreadyAccepted:result.alreadyAccepted},{headers:{'Cache-Control':'private, no-store'}})
  } catch(error) {
    if(error instanceof Error&&error.message==='NOT_FOUND') return NextResponse.json({error:'No encontramos esta etapa.'},{status:404})
    if(error instanceof Error&&error.message==='ALREADY_ACCEPTED') return NextResponse.json({error:'Esta etapa ya fue aprobada y convertida en trabajo.'},{status:409})
    console.error('proposal stage response',error)
    return NextResponse.json({error:'No pudimos registrar tu decisión.'},{status:500})
  }
}
