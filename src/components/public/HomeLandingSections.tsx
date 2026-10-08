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

type ProductSnippet = {
  id: string
  name: string
  slug: string
  description: string | null
  images: string[]
  price: number
  modality: 'CONFIGURABLE' | 'DIRECTO' | 'CONSULTAR'
  catalogType: 'COSA' | 'DESARROLLO'
  engine: 'IMPRESOS_PACKAGING' | 'PRESENCIA_FISICA' | 'TEXTIL' | 'DIGITAL' | 'CAMPANAS' | null
  variants: { price: number }[]
  quoterConfig: unknown | null
}

export default function HomeLandingSections({
  businessTypes,
  situations,
  products,
}: {
  businessTypes: BusinessTypeItem[]
  situations: SituationItem[]
  products: ProductSnippet[]
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

      {/* Separador editorial entre el Hero (01) y el catálogo (02). */}
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
