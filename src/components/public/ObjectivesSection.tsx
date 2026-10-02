import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { DiscoverySituation } from '@/lib/discovery'

export default function ObjectivesSection({
  situations,
}: {
  situations: DiscoverySituation[]
}) {
  if (situations.length === 0) return null

  return (
    <section className="border-y border-gray-100 bg-white">
      <div className="mx-auto max-w-[1380px] px-4 py-14 xl:px-8">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#ED164F]">
            Situaciones y objetivos
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">
            ¿Qué está pasando o qué querés lograr?
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-gray-500">
            Contanos el contexto. Te mostramos opciones para avanzar, sin obligarte a comprar de más.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {situations.map((situation) => (
            <Link
              key={situation.id}
              href={`/productos?mode=situation&situacion=${situation.slug}`}
              className="group flex flex-col gap-3 rounded-[28px] border border-gray-200 bg-[linear-gradient(180deg,#ffffff_0%,#fef8fb_100%)] p-5 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.12)] transition-all hover:-translate-y-0.5 hover:border-[#F7638B]/30 hover:shadow-[0_22px_60px_-42px_rgba(237,22,79,0.14)]"
            >
              {situation.icon && (
                <span className="text-2xl leading-none">{situation.icon}</span>
              )}
              <div className="flex-1">
                <p className="text-base font-black tracking-tight text-gray-950">
                  {situation.name}
                </p>
                {situation.description && (
                  <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-gray-500">
                    {situation.description}
                  </p>
                )}
              </div>
              <span className="flex items-center gap-1 text-xs font-semibold text-[#ED164F] transition-gap group-hover:gap-2">
                Ver opciones <ArrowRight size={12} />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
