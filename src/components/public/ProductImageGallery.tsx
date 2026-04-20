'use client'

import { useEffect, useState } from 'react'
import { X, ZoomIn } from 'lucide-react'

export default function ProductImageGallery({
  images,
  productName,
}: {
  images: string[]
  productName: string
}) {
  const safeImages = images.filter((image) => typeof image === 'string' && image.trim().length > 0)
  const [activeIndex, setActiveIndex] = useState(0)
  const [zoomOpen, setZoomOpen] = useState(false)

  useEffect(() => {
    if (zoomOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }

    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [zoomOpen])

  useEffect(() => {
    if (activeIndex > safeImages.length - 1) {
      setActiveIndex(0)
    }
  }, [activeIndex, safeImages.length])

  if (safeImages.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-[32px] border border-gray-200 bg-white text-3xl font-semibold text-gray-300 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.35)]">
        IMG
      </div>
    )
  }

  return (
    <div className="space-y-4 rounded-[32px] border border-gray-200 bg-white p-3 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.35)] sm:p-4">
      <div className="flex items-center justify-between px-1">
        <div>
          <p className="text-sm font-semibold text-gray-900">Vista del producto</p>
          <p className="text-xs uppercase tracking-[0.16em] text-gray-500">
            Revisa detalles y terminaciones
          </p>
        </div>
        {safeImages.length > 1 && (
          <p className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
            {activeIndex + 1} / {safeImages.length}
          </p>
        )}
      </div>

      <button
        type="button"
        className="group relative aspect-square cursor-zoom-in overflow-hidden rounded-[28px] border border-gray-100 bg-gray-100"
        onClick={() => setZoomOpen(true)}
        aria-label={`Ampliar imagen principal de ${productName}`}
      >
        <img
          src={safeImages[activeIndex]}
          alt={`${productName} - Vista principal`}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          loading="eager"
        />
        <div className="pointer-events-none absolute right-4 top-4 rounded-2xl bg-white/88 p-2.5 text-gray-700 opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
          <ZoomIn size={20} />
        </div>
      </button>

      {safeImages.length > 1 && (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
          {safeImages.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveIndex(i)}
              aria-label={`Ver imagen ${i + 1} de ${productName}`}
              className={`
                relative aspect-square overflow-hidden rounded-2xl border-2 transition-all
                ${
                  i === activeIndex
                    ? 'border-orange-500 shadow-md shadow-orange-100/70 ring-4 ring-orange-50'
                    : 'border-transparent opacity-70 hover:opacity-100'
                }
              `}
            >
              <img
                src={img}
                alt={`${productName} thumbnail ${i + 1}`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}

      {zoomOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-sm sm:p-8"
          onClick={() => setZoomOpen(false)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-3 text-white backdrop-blur transition-colors hover:bg-white/20 sm:right-8 sm:top-8"
            onClick={(event) => {
              event.stopPropagation()
              setZoomOpen(false)
            }}
          >
            <X size={24} />
          </button>

          <div
            className="relative aspect-square w-full max-w-5xl overflow-hidden rounded-lg sm:aspect-video"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={safeImages[activeIndex]}
              alt={`${productName} zoom`}
              className="h-full w-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  )
}
