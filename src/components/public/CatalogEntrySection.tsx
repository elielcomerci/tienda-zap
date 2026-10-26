import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

const entryPaths = [
  { group: 'VENTAS', title: 'Quiero vender y conseguir más clientes', description: 'Publicidad, páginas y herramientas para convertir interés en consultas o ventas.' },
  { group: 'MARCA', title: 'Quiero que mi marca se vea y comunique mejor', description: 'Identidad, diseño y piezas para que el negocio se vea y se entienda como merece.' },
  { group: 'EXPERIENCIA', title: 'Necesito una experiencia digital que funcione mejor', description: 'Web, atención e integraciones para conectar mejor con tus clientes.' },
] as const

export default function CatalogEntrySection() {
  return (
    <section aria-labelledby="zap-entry-title" className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-[1380px] px-4 py-16 xl:px-8">
        <div className="mb-8 max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#ED164F]">Elegí por lo que necesitás</p>
          <h2 id="zap-entry-title" className="mt-3 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">¿Qué querés resolver?</h2>
        </div>
        <div className="grid gap-4 border-t border-gray-900 pt-5 md:grid-cols-3">
          {entryPaths.map((entry, index) => (
            <Link key={entry.group} href={`/productos?grupo=${entry.group}`} className="group flex min-h-56 flex-col justify-between rounded-2xl border border-gray-200 p-6 transition-colors hover:border-[#ED164F] hover:bg-gray-50 sm:p-7">
              <div>
                <span className="text-sm font-semibold text-gray-400">0{index + 1}</span>
                <h3 className="mt-5 text-2xl font-black leading-tight tracking-tight text-gray-950 group-hover:text-[#ED164F]">{entry.title}</h3>
                <p className="mt-3 text-sm leading-6 text-gray-600">{entry.description}</p>
              </div>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-gray-950 group-hover:text-[#ED164F]">Ver soluciones <ArrowRight size={17} /></span>
            </Link>
          ))}
        </div>
        <div className="mt-8 flex flex-col gap-3 border-t border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div><h3 className="text-base font-bold text-gray-950">¿Tenés un proyecto más específico?</h3><p className="mt-1 text-sm text-gray-600">Lo evaluamos según el problema, el alcance y lo que necesitás resolver.</p></div>
          <Link href="/productos?grupo=PROYECTOS" className="inline-flex shrink-0 items-center gap-2 text-sm font-bold text-gray-950 transition-colors hover:text-[#ED164F]">Contanos tu proyecto <ArrowRight size={17} /></Link>
        </div>
      </div>
    </section>
  )
}
