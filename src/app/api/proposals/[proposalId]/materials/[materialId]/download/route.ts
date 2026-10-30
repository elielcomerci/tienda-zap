import {auth} from '@/auth'
import {prisma} from '@/lib/prisma'
import {createPresignedR2DownloadUrl} from '@/lib/r2'
import {NextRequest,NextResponse} from 'next/server'

export const dynamic='force-dynamic'

export async function GET(_request:NextRequest,{params}:{params:Promise<{proposalId:string;materialId:string}>}) {
  const session=await auth()
  if(!session?.user?.id) return NextResponse.json({error:'Iniciá sesión.'},{status:401})
  const {proposalId,materialId}=await params
  const material=await prisma.commercialProposalMaterial.findFirst({
    where:{id:materialId,proposalId,objectKey:{not:null}},
    select:{objectKey:true,fileName:true,proposal:{select:{customerId:true}}}
  })
  if(!material?.objectKey) return NextResponse.json({error:'Archivo no encontrado.'},{status:404})
  if(session.user.role!=='ADMIN'&&material.proposal.customerId!==session.user.id) return NextResponse.json({error:'Archivo no encontrado.'},{status:404})
  try {
    const url=await createPresignedR2DownloadUrl({objectKey:material.objectKey,fileName:material.fileName})
    return NextResponse.redirect(url,{headers:{'Cache-Control':'private, no-store'}})
  } catch(error) {
    console.error('proposal file download',error)
    return NextResponse.json({error:'No pudimos preparar la descarga.'},{status:500})
  }
}
