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
    const expectedVersion=Number(body.expectedVersion)
    if(!Number.isInteger(expectedVersion)||expectedVersion<1) return NextResponse.json({error:'La propuesta cambió. Recargá la página antes de responder.'},{status:409})
    if(!allowed.has(action)) return NextResponse.json({error:'Decisión no válida.'},{status:400})
    if(action!=='ACCEPTED'&&!message) return NextResponse.json({error:'Dejanos un comentario para registrar esta decisión.'},{status:400})

    const result=await prisma.$transaction(async tx=>{
      const versionLock=await tx.commercialProposal.updateMany({where:{id:proposalId,version:expectedVersion,customerId:session.user.id},data:{version:{increment:0}}})
      if(!versionLock.count) {
        const current=await tx.commercialProposal.findUnique({where:{id:proposalId},select:{customerId:true}})
        if(!current||current.customerId!==session.user.id) throw new Error('NOT_FOUND')
        throw new Error('VERSION_CONFLICT')
      }
      const proposal=await tx.commercialProposal.findUnique({where:{id:proposalId},select:{version:true,customerId:true,createdById:true,title:true}})
      const stage=await tx.commercialProposalStage.findFirst({where:{id:stageId,proposalId}})
      if(!proposal||!stage) throw new Error('NOT_FOUND')
      if(stage.clientWorkId) throw new Error('ALREADY_ACCEPTED')

      let workId:string|null=null
      if(action==='ACCEPTED') {
        const work=await tx.clientWork.create({
          data:{
            userId:session.user.id!,
            createdById:proposal.createdById,
            title:stage.title||proposal.title||'Trabajo ZAP',
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
        const updated=await tx.commercialProposalStage.updateMany({where:{id:stage.id,clientWorkId:null},data:{status:action}})
        if(!updated.count) throw new Error('ALREADY_ACCEPTED')
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
    if(error instanceof Error&&error.message==='VERSION_CONFLICT') return NextResponse.json({error:'La propuesta cambió desde que la abriste. Recargá para revisar las condiciones vigentes.'},{status:409})
    if(error instanceof Error&&error.message==='ALREADY_ACCEPTED') return NextResponse.json({error:'Esta etapa ya fue aprobada y convertida en trabajo.'},{status:409})
    console.error('proposal stage response',error)
    return NextResponse.json({error:'No pudimos registrar tu decisión.'},{status:500})
  }
}
