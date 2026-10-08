'use client'

import { useState } from 'react'
import HomeHero from '@/components/public/HomeHero'
import ContextBridgeBanner from '@/components/public/ContextBridgeBanner'
import CatalogEntrySection from '@/components/public/CatalogEntrySection'

type BusinessTypeItem = {
  id: string
  name: string
  slug: string
}

type SituationItem = {
  id: string
  name: string
  slug: string
  icon?: string | null
}

type CatalogTypeItem = {
  catalogType: 'COSA' | 'DESARROLLO'
}

export default function HomeLandingSections({
  businessTypes,
  situations,
  products,
}: {
  businessTypes: BusinessTypeItem[]
  situations: SituationItem[]
  products: CatalogTypeItem[]
}) {
  const [selectedRubro, setSelectedRubro] = useState('')

  const currentRubro = businessTypes.find((businessType) => businessType.slug === selectedRubro)

  return (
    <>
      <HomeHero
        businessTypes={businessTypes}
        situations={situations}
        selectedRubro={selectedRubro}
        onSelectedRubroChange={setSelectedRubro}
      />

      {/* Separador editorial entre el Hero y el catálogo. */}
      <section
        aria-label="Conocé más sobre ZAP"
        className="relative overflow-hidden bg-gradient-to-r from-[#ED164F] via-[#C52C78] to-[#4576B9] text-white"
      >
        <div className="mx-auto max-w-[1380px] px-5 py-10 sm:px-8 sm:py-12 lg:py-14">
          <ContextBridgeBanner
            businessTypeName={currentRubro?.name}
            businessTypeSlug={selectedRubro || undefined}
          />
        </div>
      </section>

      <CatalogEntrySection products={products} />
    </>
  )
}
