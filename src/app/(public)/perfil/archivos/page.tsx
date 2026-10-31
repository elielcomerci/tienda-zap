import {auth} from '@/auth'
import {redirect} from 'next/navigation'
import ClientWorkPortal from '@/components/client-work/ClientWorkPortal'

export const dynamic='force-dynamic'

export default async function ArchivosPage() {
  const session=await auth()
  if(!session?.user?.id) redirect('/login')
  const filesEnabled=process.env.CLIENT_WORK_FILES_ENABLED==='true'
  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-10">
    <div><p className="text-xs font-bold uppercase tracking-[.16em] text-sky-700">Mi espacio</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-gray-950">Tus trabajos con ZAP</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">Cada etapa aprobada se convierte en un espacio de trabajo. Ahí podés seguir la conversación y consultar los materiales compartidos.</p></div>
    {!filesEnabled&&<p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">La carga de archivos está en validación. Tus trabajos y conversaciones siguen disponibles.</p>}
    <section className="mt-7 rounded-2xl border border-gray-200 bg-white p-5 sm:p-7"><ClientWorkPortal filesEnabled={filesEnabled}/></section>
  </main>
}
