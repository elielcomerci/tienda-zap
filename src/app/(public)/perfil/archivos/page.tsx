import { redirect } from 'next/navigation'
import { FolderOpen, MessageCircle } from 'lucide-react'
import { auth } from '@/auth'
import ClientWorkPortal from '@/components/client-work/ClientWorkPortal'

export const dynamic = 'force-dynamic'
export default async function ArchivosPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const enabled = process.env.CLIENT_WORK_FILES_ENABLED === 'true'
  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-10">
    <div><p className="text-xs font-bold uppercase tracking-[.16em] text-sky-700">Mi espacio</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-gray-950">Archivos compartidos</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">Intercambiá material con ZAP y encontrá los archivos organizados por trabajo. También podés conversar y revisar entregas en cada espacio.</p></div>
    {!enabled ? <section className="mt-7 rounded-2xl border border-sky-200 bg-white p-6 sm:p-8"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-700"><FolderOpen size={23}/></span><h2 className="mt-4 text-lg font-semibold text-gray-950">Este espacio todavía no está habilitado</h2><p className="mt-2 max-w-xl text-sm leading-6 text-gray-600">Por ahora, coordiná el envío de archivos directamente con el equipo de ZAP.</p><a href="https://wa.me/541125832323?text=Hola%2C%20necesito%20coordinar%20el%20env%C3%ADo%20de%20archivos%20a%20ZAP." target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#ED164F] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#d81245]"><MessageCircle size={16}/> Contactar a ZAP</a></section> : <section className="mt-7 rounded-2xl border border-gray-200 bg-white p-5 sm:p-7"><ClientWorkPortal /></section>}
  </main>
}
