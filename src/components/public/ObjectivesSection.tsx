import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { DiscoverySituation } from '@/lib/discovery'

/**
 * Situaciones destacadas en la home.
 * Editá esta lista para cambiar cuáles se muestran (máx. 6).
 * Usá los slugs exactos de la base de datos.
 */
const FEATURED_SITUATION_SLUGS: string[] = [
  'estoy-por-abrir',
  'quiero-vender-mas',
  'quiero-que-vuelvan',
  'quiero-que-me-encuentren',
  'quiero-renovar-la-marca-o-el-espacio',
  'tengo-un-evento',
]

export default function ObjectivesSection({
  situations,
}: {
  situations: DiscoverySituation[]
}) {
  if (situations.length === 0) return null

  // Filtra y ordena según FEATURED_SITUATION_SLUGS; descarta los que no existen en DB
  const featured = FEATURED_SITUATION_SLUGS
    .map((slug) => situations.find((s) => s.slug === slug))
    .filter((s): s is DiscoverySituation => s !== undefined)

  // Si la constante no matchea nada, muestra las primeras 6 de la DB
  const displayed = featured.length > 0 ? featured : situations.slice(0, 6)

  return (
    <section className="border-y border-gray-100 bg-white">
      <div className="mx-auto max-w-[1380px] px-4 py-14 xl:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
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
          <Link
            href="/productos?mode=situation"
            className="shrink-0 text-sm font-semibold text-[#ED164F] hover:text-[#C2103F]"
          >
            Ver todas las situaciones <ArrowRight size={14} className="inline" />
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayed.map((situation) => (
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
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
