import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import ClientWorkPortal from '@/components/client-work/ClientWorkPortal'
import AccountSectionNav from '@/components/public/AccountSectionNav'
import { FolderOpen } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Mis trabajos y archivos — ZAP Tienda' }

export default async function PerfilTrabajosPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
      <div><p className="text-sm text-gray-500">Mi cuenta</p><h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-gray-900"><FolderOpen size={24} className="text-[#ED164F]" /> Mis trabajos y archivos</h1><p className="mt-1 text-sm text-gray-500">Tus trabajos, pruebas y archivos finales, separados de pedidos y facturas.</p></div>
      <AccountSectionNav active="work" />
      {process.env.CLIENT_WORK_FILES_ENABLED === 'true' ? <ClientWorkPortal /> : <div className="card p-6 text-sm text-gray-500">El espacio de trabajos y archivos no está disponible por el momento.</div>}
    </div>
  )
}
