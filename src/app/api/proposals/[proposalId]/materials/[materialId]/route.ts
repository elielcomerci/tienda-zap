import {auth} from '@/auth'
import {prisma} from '@/lib/prisma'
import {deleteR2Object,getR2PrivateBucketName} from '@/lib/r2'
import {NextResponse} from 'next/server'
export const dynamic='force-dynamic'
export async function DELETE(_request:Request,{params}:{params:Promise<{proposalId:string;materialId:string}>}) {
  const session=await auth()
  if(session?.user?.role!=='ADMIN')return NextResponse.json({error:'No autorizado.'},{status:403})
  const {proposalId,materialId}=await params
  const material=await prisma.commercialProposalMaterial.findFirst({where:{id:materialId,proposalId},select:{id:true,objectKey:true}})
  if(!material)return NextResponse.json({error:'No encontramos el material.'},{status:404})
  await prisma.commercialProposalMaterial.delete({where:{id:material.id}})
  if(material.objectKey?.startsWith('proposal-files/'+proposalId+'/'))await deleteR2Object(material.objectKey,getR2PrivateBucketName()).catch(error=>console.error('proposal material delete',error))
  return NextResponse.json({ok:true},{headers:{'Cache-Control':'private, no-store'}})
}
