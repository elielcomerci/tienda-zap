'use client'

import type { ReactNode } from 'react'
import { useExplorationContext } from '@/components/public/ExplorationContextProvider'

type OfferEntry = {
  order: number
  businessType: { slug: string }
  situation: { slug: string }
  need: { slug: string }
}

export default function ProductRelevanceItem({
  children,
  offerEntries,
  sortOrder,
}: {
  children: ReactNode
  offerEntries: OfferEntry[]
  sortOrder: number
}) {
  const { context } = useExplorationContext()
  const entries = offerEntries || []
  const matches = entries.filter((entry) =>
    (!context.businessTypeSlug || entry.businessType.slug === context.businessTypeSlug) &&
    (!context.situationSlug || entry.situation.slug === context.situationSlug) &&
    (!context.needSlug || entry.need.slug === context.needSlug)
  )
  const sameSituation = entries.filter((entry) =>
    (!context.businessTypeSlug || entry.businessType.slug === context.businessTypeSlug) &&
    (!context.needSlug || entry.need.slug === context.needSlug) &&
    (!context.situationSlug || entry.situation.slug === context.situationSlug)
  )
  const exactRank = matches.length ? 0 : context.situationSlug && entries.some((entry) =>
    (!context.businessTypeSlug || entry.businessType.slug === context.businessTypeSlug) &&
    entry.situation.slug === context.situationSlug
  ) ? 1 : context.businessTypeSlug && entries.some((entry) => entry.businessType.slug === context.businessTypeSlug) ? 2 : 3
  const order = exactRank * 1000000 + (matches.length ? Math.min(...matches.map((entry) => entry.order > 0 ? entry.order : 99999)) : sameSituation.length ? Math.min(...sameSituation.map((entry) => entry.order > 0 ? entry.order : 99999)) : sortOrder)
  return <div style={{ order }} className="min-w-0">{children}</div>
}
