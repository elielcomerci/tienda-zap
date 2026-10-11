import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import ClientWorkPortal from '@/components/client-work/ClientWorkPortal'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Trabajos y archivos | ZAP Admin' }

export default async function AdminClientWorksPage() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') redirect('/login')
  if (process.env.CLIENT_WORK_FILES_ENABLED !== 'true') {
    return <div className="space-y-3"><h1 className="text-2xl font-bold text-gray-900">Trabajos y archivos</h1><p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">El módulo está desactivado hasta aplicar el SQL y completar las pruebas de seguridad del almacenamiento compartido.</p></div>
  }
  const users = await prisma.user.findMany({
    where: { role: 'CUSTOMER', isBanned: false },
    orderBy: [{ name: 'asc' }, { email: 'asc' }],
    select: { id: true, name: true, email: true },
  })
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold tracking-tight text-gray-900">Trabajos y archivos</h1>
      <p className="mt-2 text-sm text-gray-500">Un espacio privado para intercambiar materiales con cada cliente, independientemente de sus pedidos.</p></div>
    <ClientWorkPortal admin users={users} />
  </div>
}
