import Link from 'next/link'
import { ArrowRight, BriefcaseBusiness } from 'lucide-react'

type BusinessType = { id: string; name: string; slug: string }

export default function BusinessTypesSection({ businessTypes }: { businessTypes: BusinessType[] }) {
  if (businessTypes.length === 0) return null

  return (
    <section className="border-y border-gray-100 bg-white">
      <div className="mx-auto max-w-[1380px] px-4 py-14 xl:px-8">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#ED164F]">Por rubro</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">¿Qué tipo de negocio tenés?</h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-gray-500">
              Entrá por tu realidad de negocio y encontrá ofertas que pueden tener sentido en ese contexto.
            </p>
          </div>
          <Link href="/productos?mode=rubro" className="shrink-0 text-sm font-semibold text-[#ED164F] hover:text-[#C2103F]">
            Ver todos los rubros <ArrowRight size={14} className="inline" />
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {businessTypes.map((businessType) => (
            <Link
              key={businessType.id}
              href={`/productos?mode=rubro&rubro=${businessType.slug}`}
              className="group flex items-center gap-4 rounded-[24px] border border-gray-200 bg-gray-50/70 p-5 transition-all hover:-translate-y-0.5 hover:border-[#F7638B]/30 hover:bg-[#FEF1F5] hover:shadow-[0_18px_50px_-38px_rgba(237,22,79,0.16)]"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#ED164F] shadow-sm"><BriefcaseBusiness size={20} /></span>
              <span className="min-w-0 flex-1 text-base font-black text-gray-950 group-hover:text-[#C2103F]">{businessType.name}</span>
              <ArrowRight size={16} className="shrink-0 text-gray-400 transition-transform group-hover:translate-x-1 group-hover:text-[#ED164F]" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
