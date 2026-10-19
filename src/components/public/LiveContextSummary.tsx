'use client'

import type { DiscoverySituation } from '@/lib/discovery'
import { useExplorationContext } from '@/components/public/ExplorationContextProvider'

type BusinessType = { id: string; name: string; slug: string }

export default function LiveContextSummary({
  businessTypes,
  situations,
}: {
  businessTypes: BusinessType[]
  situations: DiscoverySituation[]
}) {
  const { context, ready, situationsByBusinessType } = useExplorationContext()
  const availableSituations = context.businessTypeSlug ? situationsByBusinessType[context.businessTypeSlug] || situations : situations
  if (!ready || (!context.businessTypeSlug && !context.situationSlug && !context.needSlug)) return null

  const businessType = businessTypes.find((item) => item.slug === context.businessTypeSlug)
  const situation = availableSituations.find((item) => item.slug === context.situationSlug)
  const need = situation?.needs.find((item) => item.slug === context.needSlug)

  const supportingCopy = need
    ? [businessType?.name, situation?.name].filter(Boolean).join(' · ')
    : situation?.description || (businessType ? 'Opciones elegidas según el contexto de tu negocio.' : '')

  return (
    <section aria-live="polite" className="mb-5 border-b border-gray-100 pb-4">
      {supportingCopy && <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">{supportingCopy}</p>}
      <h2 className="text-xl font-bold tracking-tight text-gray-950 sm:text-2xl">
        {need?.name || situation?.name || businessType?.name}
      </h2>
      {need?.description && <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">{need.description}</p>}
    </section>
  )
}
