'use client'

import { useState } from 'react'
import ApparelMockupPreview, {
  type ApparelDesignSelection,
} from '@/components/public/ApparelMockupPreview'
import ProductConfigurator from '@/components/public/ProductConfigurator'
import ProductImageGallery from '@/components/public/ProductImageGallery'
import ProductMediaBlock from '@/components/public/ProductMediaBlock'
import {
  DEFAULT_APPAREL_MOCKUP,
  getApparelMockupConfig,
  hasApparelMockupImages,
} from '@/lib/apparel-mockup'
import { getProductFamilyLabel, getProductModalityLabel, isDevelopment } from '@/lib/catalog-domain'

function normalize(value?: string | null) {
  return (value || '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function isApparelProduct(product: any) {
  const engine = normalize(product.engine)
  const productName = normalize(product.name)
  const productSlug = normalize(product.slug)
  const haystack = `${engine} ${productName} ${productSlug}`

  return ['indumentaria', 'remera', 'camiseta', 'buzo', 'hoodie', 'textil'].some((term) =>
    haystack.includes(term)
  )
}

export default function ProductDetailExperience({
  product,
  inquiryUrl,
}: {
  product: any
  inquiryUrl?: string | null
}) {
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})
  const [apparelDesignSelection, setApparelDesignSelection] =
    useState<ApparelDesignSelection | null>(null)
  const apparelMockup = getApparelMockupConfig(product.mediaList)
  const fallbackImageUrl = selectedImageUrl || product.images?.[0]
  const fallbackApparelMockup =
    !hasApparelMockupImages(apparelMockup) && isApparelProduct(product) && fallbackImageUrl
      ? {
          ...DEFAULT_APPAREL_MOCKUP,
          enabled: true,
          colors: [
            {
              value: 'Base',
              frontImageUrl: fallbackImageUrl,
              backImageUrl: fallbackImageUrl,
            },
          ],
        }
      : null
  const activeApparelMockup = hasApparelMockupImages(apparelMockup)
    ? apparelMockup
    : fallbackApparelMockup
  const showApparelMockup = hasApparelMockupImages(activeApparelMockup)
  const isDevelopment = isDevelopment(product)
  const editorialIncludes = Array.isArray(product.includes) ? product.includes : []
  const editorialConfigurable = Array.isArray(product.configurable) ? product.configurable : []
  const hasEditorialDetail = Boolean(
    product.whatIs || product.purpose || editorialIncludes.length || editorialConfigurable.length
  )

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)] 2xl:gap-12">
      <div className="self-start xl:sticky xl:top-24">
        {showApparelMockup && activeApparelMockup ? (
          <ApparelMockupPreview
            images={product.images}
            productName={product.name}
            selectedImageUrl={selectedImageUrl}
            selectedOptions={selectedOptions}
            config={activeApparelMockup}
            onDesignSelectionChange={setApparelDesignSelection}
          />
        ) : (
          <ProductImageGallery
            images={product.images}
            productName={product.name}
            selectedImageUrl={selectedImageUrl}
          />
        )}
        <ProductMediaBlock
          mediaType={product.mediaType}
          mediaUrl={product.mediaUrl}
          mediaTitle={product.mediaTitle}
          mediaList={product.mediaList}
          productName={product.name}
        />
      </div>

      <div className="space-y-6">
        <section className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.35)] sm:p-7">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="rounded-full bg-[#FEF1F5] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C2103F]">
              {getProductFamilyLabel(product)}
            </span>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-600">
              {getProductModalityLabel(product.modality)}
            </span>
          </div>

          <h1 className="mt-4 max-w-3xl text-3xl font-black tracking-tight text-gray-950 sm:text-5xl">
            {product.name}
          </h1>

          {product.description && (
            <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-600 sm:text-base">
              {product.description}
            </p>
          )}

          {hasEditorialDetail && (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {(product.whatIs || product.purpose) && (
                <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4 sm:col-span-2">
                  {product.whatIs && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Qué es</p>
                      <p className="mt-1 text-sm leading-6 text-gray-800">{product.whatIs}</p>
                    </div>
                  )}
                  {product.purpose && (
                    <div className={product.whatIs ? 'mt-4 border-t border-gray-200 pt-4' : ''}>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Para qué sirve</p>
                      <p className="mt-1 text-sm leading-6 text-gray-800">{product.purpose}</p>
                    </div>
                  )}
                </div>
              )}
              {editorialIncludes.length > 0 && (
                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Incluye</p>
                  <ul className="mt-2 space-y-1.5 text-sm leading-6 text-gray-700">
                    {editorialIncludes.map((item: string) => <li key={item}>• {item}</li>)}
                  </ul>
                </div>
              )}
              {editorialConfigurable.length > 0 && (
                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Podés definir</p>
                  <ul className="mt-2 space-y-1.5 text-sm leading-6 text-gray-700">
                    {editorialConfigurable.map((item: string) => <li key={item}>• {item}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          <dl className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                Tipo
              </dt>
              <dd className="mt-2 text-sm font-semibold text-gray-900">
                {getProductModalityLabel(product.modality)}
              </dd>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                Modalidad
              </dt>
              <dd className="mt-2 text-sm font-semibold text-gray-900">
                {isDevelopment ? 'Hablar con ZAP' : product.modality === 'CONFIGURABLE' ? 'Definir configuración' : 'Agregar al carrito'}
              </dd>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                Siguiente paso
              </dt>
              <dd className="mt-2 text-sm font-semibold text-gray-900">
                {isDevelopment ? 'Contanos tu caso' : 'Elegir y avanzar'}
              </dd>
            </div>
          </dl>
        </section>

        <ProductConfigurator
          product={product}
          inquiryUrl={inquiryUrl}
          onPreviewImageChange={setSelectedImageUrl}
          onSelectionChange={setSelectedOptions}
          apparelDesignSelection={apparelDesignSelection}
        />
        {product.consultationNote && (
          <aside className="rounded-2xl border border-[#4576B9]/20 bg-[#EEF4FC]/60 p-4 text-sm leading-6 text-[#244D80]">
            <span className="font-bold">¿Tu caso necesita algo distinto?</span> {product.consultationNote}
          </aside>
        )}
      </div>
    </div>
  )
}
