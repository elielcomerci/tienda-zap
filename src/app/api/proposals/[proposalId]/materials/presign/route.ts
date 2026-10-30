import {auth} from '@/auth'
import {prisma} from '@/lib/prisma'
import {createPresignedR2UploadUrl,getR2PrivateBucketName} from '@/lib/r2'
import {MAX_CLIENT_FILE_SIZE_BYTES,validateClientFile} from '@/lib/client-work-files'
import {NextRequest,NextResponse} from 'next/server'

export const dynamic='force-dynamic'

async function canAccess(proposalId:string,userId:string,role:string) {
  const proposal=await prisma.commercialProposal.findFirst({where:role==='ADMIN'?{id:proposalId}:{id:proposalId,customerId:userId},select:{id:true}})
  return !!proposal
}

export async function POST(request:NextRequest,{params}:{params:Promise<{proposalId:string}>}) {
  const session=await auth()
  if(!session?.user?.id) return NextResponse.json({error:'Iniciá sesión para adjuntar archivos.'},{status:401})
  const {proposalId}=await params
  if(!await canAccess(proposalId,session.user.id,session.user.role||'CUSTOMER')) return NextResponse.json({error:'No tenés acceso a esta propuesta.'},{status:404})
  try {
    const body=await request.json()
    const validation=validateClientFile({fileName:String(body.fileName||''),contentType:String(body.contentType||'application/octet-stream'),sizeBytes:Number(body.sizeBytes)})
    if(!validation.ok) return NextResponse.json({error:validation.error},{status:400})
    const objectKey=`proposal-file-uploads/${proposalId}/${crypto.randomUUID()}-${validation.fileName}`
    const signedUrl=await createPresignedR2UploadUrl({objectKey,contentType:validation.contentType,bucketName:getR2PrivateBucketName()})
    return NextResponse.json({signedUrl,objectKey,fileName:validation.fileName,contentType:validation.contentType,sizeBytes:Number(body.sizeBytes),maxSizeBytes:MAX_CLIENT_FILE_SIZE_BYTES},{headers:{'Cache-Control':'private, no-store'}})
  } catch(error) {
    console.error('proposal file presign',error)
    return NextResponse.json({error:'No pudimos preparar la subida.'},{status:500})
  }
}
