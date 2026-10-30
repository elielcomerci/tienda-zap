import {auth} from '@/auth'
import {prisma} from '@/lib/prisma'
import {copyR2Object,deleteR2Object,getR2ObjectMetadata,getR2PrivateBucketName} from '@/lib/r2'
import {MAX_CLIENT_FILE_SIZE_BYTES,validateClientFile} from '@/lib/client-work-files'
import {NextRequest,NextResponse} from 'next/server'

export const dynamic='force-dynamic'

export async function POST(request:NextRequest,{params}:{params:Promise<{proposalId:string}>}) {
  const session=await auth()
  if(!session?.user?.id) return NextResponse.json({error:'Iniciá sesión para adjuntar archivos.'},{status:401})
  const {proposalId}=await params
  const proposal=await prisma.commercialProposal.findFirst({
    where:session.user.role==='ADMIN'?{id:proposalId}:{id:proposalId,customerId:session.user.id},
    select:{id:true}
  })
  if(!proposal) return NextResponse.json({error:'No encontramos esta propuesta.'},{status:404})
  const bucket=getR2PrivateBucketName()
  let stagingKey:string|null=null
  let finalKey:string|null=null
  try {
    const body=await request.json().catch(()=>null)
    if(!body||typeof body!=='object'||Array.isArray(body)) return NextResponse.json({error:'El body debe ser JSON válido.'},{status:400})
    const validation=validateClientFile({fileName:String(body.fileName||''),contentType:String(body.contentType||'application/octet-stream'),sizeBytes:Number(body.sizeBytes)})
    if(!validation.ok) return NextResponse.json({error:validation.error},{status:400})
    const expectedPrefix=`proposal-file-uploads/${proposalId}/`
    stagingKey=typeof body.objectKey==='string'?body.objectKey:''
    if(!stagingKey.startsWith(expectedPrefix)||stagingKey.includes('..')||stagingKey.includes('\\\\')) return NextResponse.json({error:'La referencia del archivo no es válida.'},{status:400})
    const metadata=await getR2ObjectMetadata(stagingKey,bucket)
    if(metadata.ContentLength!==Number(body.sizeBytes)||!metadata.ContentLength||metadata.ContentLength>MAX_CLIENT_FILE_SIZE_BYTES) {
      await deleteR2Object(stagingKey,bucket).catch(()=>undefined)
      return NextResponse.json({error:'El archivo no coincide con el tamaño declarado.'},{status:400})
    }
    if(metadata.ContentType&&metadata.ContentType.split(';')[0].trim().toLowerCase()!==validation.contentType) {
      await deleteR2Object(stagingKey,bucket).catch(()=>undefined)
      return NextResponse.json({error:'El tipo de archivo no coincide con el declarado.'},{status:400})
    }
    finalKey=`proposal-files/${proposalId}/${crypto.randomUUID()}-${validation.fileName}`
    await copyR2Object(stagingKey,finalKey,bucket)
    const verified=await getR2ObjectMetadata(finalKey,bucket)
    if(verified.ContentLength!==Number(body.sizeBytes)||verified.ContentType?.split(';')[0].trim().toLowerCase()!==validation.contentType) {
      await deleteR2Object(finalKey,bucket).catch(()=>undefined)
      await deleteR2Object(stagingKey,bucket).catch(()=>undefined)
      return NextResponse.json({error:'No pudimos verificar el archivo guardado.'},{status:502})
    }
    const material=await prisma.commercialProposalMaterial.create({
      data:{
        proposalId,kind:'FILE',
        label:typeof body.label==='string'?body.label.trim().slice(0,180)||validation.fileName:validation.fileName,
        objectKey:finalKey,fileName:validation.fileName,contentType:validation.contentType,sizeBytes:Number(body.sizeBytes),
        note:typeof body.note==='string'?body.note.trim().slice(0,1000)||null:null,
        uploadedById:session.user.id,uploadedByName:session.user.name||null,uploadedByRole:session.user.role||'CUSTOMER'
      },
      select:{id:true,kind:true,label:true,fileName:true,contentType:true,sizeBytes:true,note:true,uploadedByName:true,uploadedByRole:true,createdAt:true}
    })
    await deleteR2Object(stagingKey,bucket).catch(error=>console.error('proposal staging cleanup',error))
    return NextResponse.json({ok:true,material},{headers:{'Cache-Control':'private, no-store'}})
  } catch(error) {
    if(stagingKey) await deleteR2Object(stagingKey,bucket).catch(()=>undefined)
    if(finalKey) {
      const exists=await prisma.commercialProposalMaterial.findFirst({where:{objectKey:finalKey},select:{id:true}}).catch(()=>null)
      if(!exists) await deleteR2Object(finalKey,bucket).catch(()=>undefined)
    }
    console.error('proposal file complete',error)
    return NextResponse.json({error:'No pudimos confirmar el archivo.'},{status:500})
  }
}
