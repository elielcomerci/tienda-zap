import {auth} from '@/auth'
import {prisma} from '@/lib/prisma'
import {NextRequest,NextResponse} from 'next/server'

export const dynamic='force-dynamic'

export async function POST(req:NextRequest,{params}:{params:Promise<{proposalId:string;stageId:string}>}) {
  const session=await auth()
  if(session?.user?.role!=='ADMIN'||!session.user.id) {
    return NextResponse.json({error:'No autorizado.'},{status:403})
  }

  const {proposalId,stageId}=await params
  try {
    const body=await req.json()
    const message=typeof body.message==='string'?body.message.trim().slice(0,4000):''
    if(!message) return NextResponse.json({error:'Escribí un mensaje antes de enviarlo.'},{status:400})

    const stage=await prisma.commercialProposalStage.findFirst({
      where:{id:stageId,proposalId},
      select:{id:true}
    })
    if(!stage) return NextResponse.json({error:'No encontramos esta etapa.'},{status:404})

    const comment=await prisma.commercialProposalStageComment.create({
      data:{
        stageId,
        authorId:session.user.id,
        authorName:session.user.name||'Equipo ZAP',
        authorEmail:session.user.email||null,
        authorRole:'ADMIN',
        action:null,
        message
      },
      select:{id:true,authorName:true,authorRole:true,message:true,createdAt:true}
    })
    return NextResponse.json({ok:true,comment},{headers:{'Cache-Control':'private, no-store'}})
  } catch(error) {
    console.error('proposal stage admin comment',error)
    return NextResponse.json({error:'No pudimos enviar el mensaje.'},{status:500})
  }
}
