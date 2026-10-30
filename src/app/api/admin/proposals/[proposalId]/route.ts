import {auth} from '@/auth'
import {prisma} from '@/lib/prisma'
import {NextRequest,NextResponse} from 'next/server'

export const dynamic='force-dynamic'
const clean=(value:unknown,max=12000)=>typeof value==='string'?value.trim().slice(0,max)||null:null

export async function PATCH(request:NextRequest,{params}:{params:Promise<{proposalId:string}>}) {
  const session=await auth()
  if(session?.user?.role!=='ADMIN'||!session.user.id) return NextResponse.json({error:'No autorizado.'},{status:403})
  const {proposalId}=await params
  try {
    const body=await request.json()
    const stages=Array.isArray(body.stages)?body.stages.slice(0,12):[]
    const rootAmount=body.amount===''||body.amount==null?null:Number(body.amount)
    if(rootAmount!==null&&(!Number.isFinite(rootAmount)||rootAmount<0)) return NextResponse.json({error:'El importe general es inválido.'},{status:400})
    if(stages.some((stage:any)=>!clean(stage.title,180))) return NextResponse.json({error:'Cada etapa necesita un nombre.'},{status:400})
    for(const stage of stages) {
      if(stage.amount!==''&&stage.amount!=null&&(!Number.isFinite(Number(stage.amount))||Number(stage.amount)<0)) return NextResponse.json({error:'Hay un importe de etapa inválido.'},{status:400})
    }
    const updated=await prisma.$transaction(async tx=>{
      const current=await tx.commercialProposal.findUnique({where:{id:proposalId},include:{stages:true}})
      if(!current) throw new Error('NOT_FOUND')
      const existingById=new Map(current.stages.map(stage=>[stage.id,stage]))
      let nextPosition=current.stages.reduce((max,item)=>Math.max(max,item.position),-1)+1
      for(const input of stages) {
        const data={
          title:clean(input.title,180)!,
          description:clean(input.description),scope:clean(input.scope),deliverables:clean(input.deliverables),
          timeline:clean(input.timeline,2000),conditions:clean(input.conditions),paymentTerms:clean(input.paymentTerms),
          amount:input.amount===''||input.amount==null?null:Number(input.amount),currency:'ARS'
        }
        if(input.id) {
          const existing=existingById.get(String(input.id))
          if(!existing) throw new Error('INVALID_STAGE')
          if(existing.clientWorkId) {
            const same=existing.title===data.title&&existing.description===data.description&&existing.scope===data.scope&&existing.deliverables===data.deliverables&&existing.timeline===data.timeline&&existing.conditions===data.conditions&&existing.paymentTerms===data.paymentTerms&&Number(existing.amount??0)===Number(data.amount??0)
            if(!same) throw new Error('ACCEPTED_STAGE_LOCKED')
            continue
          }
          await tx.commercialProposalStage.update({where:{id:existing.id},data})
        } else {
          const created=await tx.commercialProposalStage.create({data:{proposalId,position:nextPosition++,...data}})
          existingById.set(created.id,created)
        }
      }
      const proposal=await tx.commercialProposal.update({
        where:{id:proposalId},
        data:{
          title:clean(body.title,180)||'Propuesta ZAP',
          summary:clean(body.summary),diagnosis:clean(body.diagnosis),solution:clean(body.solution),
          scope:clean(body.scope),deliverables:clean(body.deliverables),timeline:clean(body.timeline),
          conditions:clean(body.conditions),paymentTerms:clean(body.paymentTerms),
          amount:rootAmount,
          status:current.status==='SHARED'?'DRAFT':current.status,
          version:{increment:1}
        },
        include:{stages:{orderBy:{position:'asc'}},materials:{orderBy:{sortOrder:'asc'}}}
      })
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
      await tx.commercialProposalInvite.updateMany({where:{proposalId,revokedAt:null},data:{revokedAt:new Date()}})
      return proposal
    })
    return NextResponse.json({ok:true,proposal:{id:updated.id,version:updated.version}},{headers:{'Cache-Control':'private, no-store'}})
  } catch(error) {
    if(error instanceof Error&&error.message==='NOT_FOUND') return NextResponse.json({error:'No encontramos la propuesta.'},{status:404})
    if(error instanceof Error&&error.message==='INVALID_STAGE') return NextResponse.json({error:'Una etapa no pertenece a esta propuesta.'},{status:400})
    if(error instanceof Error&&error.message==='ACCEPTED_STAGE_LOCKED') return NextResponse.json({error:'Una etapa ya aprobada y convertida en trabajo no se puede modificar.'},{status:409})
    console.error('proposal update',error)
    return NextResponse.json({error:'No pudimos guardar la nueva versión.'},{status:500})
  }
}
