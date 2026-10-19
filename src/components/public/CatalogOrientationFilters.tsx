'use client'

import { useRouter } from 'next/navigation'
import type { DiscoverySituation } from '@/lib/discovery'

type BusinessType = { id: string; name: string; slug: string }

export default function CatalogOrientationFilters({
  businessTypes,
  situations,
  businessTypeSlug,
  situationSlug,
  needSlug,
  category,
  query,
  catalogType,
}: {
  businessTypes: BusinessType[]
  situations: DiscoverySituation[]
  businessTypeSlug?: string
  situationSlug?: string
  needSlug?: string
  category?: string
  query?: string
  catalogType?: 'cosa' | 'desarrollo'
}) {
  const router = useRouter()
  const selectedNeed = situationSlug && needSlug ? `${situationSlug}::${needSlug}` : ''

  function navigate(nextBusinessType: string, nextNeed: string) {
    const params = new URLSearchParams()
    params.set('mode', 'product')
    if (nextBusinessType) params.set('rubro', nextBusinessType)
    if (category) params.set('cat', category)
    if (query?.trim()) params.set('q', query.trim())
    if (catalogType) params.set('tipo', catalogType)

    if (nextNeed) {
      const [nextSituationSlug, nextNeedSlug] = nextNeed.split('::')
      if (nextSituationSlug && nextNeedSlug) {
        params.set('situacion', nextSituationSlug)
        params.set('necesidad', nextNeedSlug)
      }
    }

    router.push(`/productos?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="flex flex-wrap items-center gap-2 pb-1" aria-label="Filtros del catálogo">
      <select
        aria-label="Filtrar por rubro"
        value={businessTypeSlug || ''}
        onChange={(event) => navigate(event.target.value, '')}
        className="h-9 max-w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-600 outline-none transition focus:border-[#ED164F] focus:ring-2 focus:ring-[#ED164F]/10"
      >
        <option value="">Rubro</option>
        {businessTypes.map((businessType) => (
          <option key={businessType.id} value={businessType.slug}>{businessType.name}</option>
        ))}
      </select>

      <select
        aria-label="Filtrar por necesidad"
        value={selectedNeed}
        onChange={(event) => navigate(businessTypeSlug || '', event.target.value)}
        className="h-9 max-w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-600 outline-none transition focus:border-[#ED164F] focus:ring-2 focus:ring-[#ED164F]/10"
      >
        <option value="">Necesidad</option>
        {situations.map((situation) => (
          <optgroup key={situation.id} label={situation.name}>
            {situation.needs.map((need) => (
              <option key={need.id} value={`${situation.slug}::${need.slug}`}>{need.name}</option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  )
}
