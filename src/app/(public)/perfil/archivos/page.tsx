import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, FolderOpen, MessageCircle } from 'lucide-react'
import { auth } from '@/auth'
import ClientWorkPortal from '@/components/client-work/ClientWorkPortal'

export const dynamic = 'force-dynamic'
export default async function ArchivosPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const enabled = process.env.CLIENT_WORK_FILES_ENABLED === 'true'
  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-10">
    <Link href="/perfil" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900"><ArrowLeft size={16}/> Mi espacio</Link>
    <div className="mt-5"><p className="text-xs font-bold uppercase tracking-[.16em] text-sky-700">Archivos, entregas y mensajes</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-gray-950">Material y entregas</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">Compartí archivos con ZAP, consultá las entregas y conversá dentro de cada trabajo. Las aprobaciones formales todavía no están disponibles en el portal.</p></div>
    {!enabled ? <section className="mt-7 rounded-2xl border border-sky-200 bg-white p-6 sm:p-8"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-700"><FolderOpen size={23}/></span><h2 className="mt-4 text-lg font-semibold text-gray-950">Estamos preparando este espacio</h2><p className="mt-2 max-w-xl text-sm leading-6 text-gray-600">La carga y descarga de archivos todavía no está habilitada para esta cuenta. Mientras tanto, podés coordinar la entrega de material directamente con el equipo de ZAP.</p><a href="https://wa.me/541125832323" target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#ED164F] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#d81245]"><MessageCircle size={16}/> Contactar a ZAP</a></section> : <section className="mt-7 rounded-2xl border border-gray-200 bg-white p-5 sm:p-7"><ClientWorkPortal /><div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-5"><p className="text-sm text-gray-500">¿Necesitás ayuda sobre un trabajo?</p><a href="https://wa.me/541125832323" target="_blank" rel="noreferrer" className="text-sm font-semibold text-[#c2103f] hover:underline">Contactar a ZAP</a></div></section>}
  </main>
}
