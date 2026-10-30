import {auth} from '@/auth'
import {prisma} from '@/lib/prisma'
import {redirect} from 'next/navigation'
import ClientWorkPortal from '@/components/client-work/ClientWorkPortal'

export const dynamic='force-dynamic'
export const metadata={title:'Trabajos y archivos | ZAP Admin'}

export default async function AdminClientWorksPage() {
  const session=await auth()
  if(session?.user?.role!=='ADMIN') redirect('/login')
  const filesEnabled=process.env.CLIENT_WORK_FILES_ENABLED==='true'
  const users=await prisma.user.findMany({
    where:{role:'CUSTOMER',isBanned:false},
    orderBy:[{name:'asc'},{email:'asc'}],
    select:{id:true,name:true,email:true}
  })
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold tracking-tight text-gray-900">Trabajos y archivos</h1><p className="mt-2 text-sm text-gray-500">Un espacio privado para intercambiar materiales y conversar con cada cliente.</p></div>
    {!filesEnabled&&<p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">La carga de archivos sigue desactivada hasta completar la validación de R2. Los trabajos y las conversaciones están disponibles.</p>}
    <ClientWorkPortal admin users={users} filesEnabled={filesEnabled}/>
  </div>
}
