import Link from 'next/link'

import type { ExplorationContext } from '@/lib/exploration-context'

export default function ExplorationContextIndicator({
  context,
  businessTypeName,
  situationName,
  needName,
}: {
  context: ExplorationContext
  businessTypeName?: string | null
  situationName?: string | null
  needName?: string | null
}) {
  const labels = [businessTypeName, situationName, needName].filter(Boolean)
  if (labels.length === 0) return null

  const situationHref = context.businessTypeSlug
    ? `/productos?mode=situation&rubro=${encodeURIComponent(context.businessTypeSlug)}`
    : '/productos?mode=situation'

  const needHref =
    context.businessTypeSlug && context.situationSlug
      ? `/productos?mode=situation&rubro=${encodeURIComponent(context.businessTypeSlug)}&situacion=${encodeURIComponent(context.situationSlug)}`
      : situationHref

  return (
    <details className="group relative mb-5">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-600 shadow-sm transition-colors hover:border-gray-300 hover:text-gray-900">
        <span>Explorando {labels.join(' · ')}</span>
        <span className="text-gray-400 transition-transform group-open:rotate-180">⌄</span>
      </summary>

      <div className="absolute left-0 top-full z-30 mt-2 w-[min(320px,calc(100vw-2rem))] rounded-2xl border border-gray-200 bg-white p-3 shadow-xl">
        <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">
          Cambiar contexto
        </p>
        <div className="mt-1 grid gap-1">
          <Link href="/productos?mode=rubro" className="rounded-xl px-2 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            Cambiar rubro
          </Link>
          <Link href={situationHref} className="rounded-xl px-2 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            Cambiar situación
          </Link>
          {context.situationSlug && (
            <Link href={needHref} className="rounded-xl px-2 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              Cambiar necesidad
            </Link>
          )}
        </div>
      </div>
    </details>
  )
}
