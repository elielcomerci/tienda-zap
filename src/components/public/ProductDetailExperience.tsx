'use client'

import { useState } from 'react'
import ApparelMockupPreview, {
  type ApparelDesignSelection,
} from '@/components/public/ApparelMockupPreview'
import ProductConfigurator from '@/components/public/ProductConfigurator'
import ProductImageGallery from '@/components/public/ProductImageGallery'
import ProductMediaBlock from '@/components/public/ProductMediaBlock'
import { getApparelMockupConfig, hasApparelMockupImages } from '@/lib/apparel-mockup'

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
  const showApparelMockup = hasApparelMockupImages(apparelMockup)

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)] 2xl:gap-12">
      <div className="self-start xl:sticky xl:top-24">
        {showApparelMockup && apparelMockup ? (
          <ApparelMockupPreview
            images={product.images}
            productName={product.name}
            selectedImageUrl={selectedImageUrl}
            selectedOptions={selectedOptions}
            config={apparelMockup}
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
            <span className="rounded-full bg-[#FEF1F6] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C91F5B]">
              {product.category.name}
            </span>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-600">
              {product.category.isService ? 'Servicio' : 'Producto'}
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

          <dl className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                Tipo
              </dt>
              <dd className="mt-2 text-sm font-semibold text-gray-900">
                {product.category.isService ? 'Servicio coordinado' : 'Pieza producida'}
              </dd>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                Modalidad
              </dt>
              <dd className="mt-2 text-sm font-semibold text-gray-900">
                Pedido online o consulta guiada
              </dd>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                Siguiente paso
              </dt>
              <dd className="mt-2 text-sm font-semibold text-gray-900">
                Configurar y agregar
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
      </div>
    </div>
  )
}
