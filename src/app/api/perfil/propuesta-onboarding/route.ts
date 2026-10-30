import {auth} from '@/auth'
import {prisma} from '@/lib/prisma'
import {NextRequest,NextResponse} from 'next/server'

export const dynamic='force-dynamic'
const taxOptions=new Set(['RESPONSABLE_INSCRIPTO','MONOTRIBUTO','EXENTO','NO_ESTOY_SEGURO','OTRA'])
const objectiveOptions=new Set(['CONSEGUIR_CLIENTES','ORDENAR_NEGOCIO','MEJORAR_MARCA','MEJORAR_PRESENCIA','AUTOMATIZAR_PROCESOS','DESARROLLAR_SISTEMAS','OTRO'])

export async function POST(request:NextRequest) {
  const session=await auth()
  if(!session?.user?.id) return NextResponse.json({error:'Iniciá sesión para continuar.'},{status:401})
  try {
    const body=await request.json()
    const name=typeof body.name==='string'?body.name.trim().slice(0,120):''
    const taxSituation=typeof body.taxSituation==='string'?body.taxSituation:''
    const objectives:string[]=Array.isArray(body.objectives)?[...new Set<string>(body.objectives.filter((value:unknown):value is string=>typeof value==='string'&&objectiveOptions.has(value)))].slice(0,7):[]
    if(name.length<2) return NextResponse.json({error:'Indicá tu nombre y apellido.'},{status:400})
    if(!taxOptions.has(taxSituation)) return NextResponse.json({error:'Seleccioná tu situación fiscal.'},{status:400})
    if(objectives.length===0) return NextResponse.json({error:'Elegí al menos un objetivo.'},{status:400})
    await prisma.$transaction([
      prisma.user.update({where:{id:session.user.id},data:{name}}),
      prisma.proposalClientOnboarding.upsert({
        where:{userId:session.user.id},
        create:{userId:session.user.id,taxSituation,objectives,completedAt:new Date()},
        update:{taxSituation,objectives,completedAt:new Date()}
      })
    ])
    const callback=typeof body.callbackUrl==='string'&&body.callbackUrl.startsWith('/')&&!body.callbackUrl.startsWith('//')&&!body.callbackUrl.includes('\\')&&!/%5c/i.test(body.callbackUrl)&&!/[\u0000-\u001f\u007f]/.test(body.callbackUrl)?body.callbackUrl:'/perfil'
    return NextResponse.json({ok:true,callbackUrl:callback},{headers:{'Cache-Control':'private, no-store'}})
  } catch(error) {
    console.error('proposal onboarding',error)
    return NextResponse.json({error:'No pudimos guardar tus datos.'},{status:500})
  }
}
