'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import ProductImagePlaceholder from '@/components/public/ProductImagePlaceholder'

export default function ProductImageGallery({
  images,
  productName,
  selectedImageUrl,
}: {
  images: string[]
  productName: string
  selectedImageUrl?: string | null
}) {
  const selectedImage = typeof selectedImageUrl === 'string' ? selectedImageUrl.trim() : ''
  const safeImages = useMemo(() => {
    const baseImages = images.filter((image) => typeof image === 'string' && image.trim().length > 0)
    return selectedImage && !baseImages.includes(selectedImage)
      ? [selectedImage, ...baseImages]
      : baseImages
  }, [images, selectedImage])
  const [activeIndex, setActiveIndex] = useState(0)
  const [zoomOpen, setZoomOpen] = useState(false)
  const thumbnailsRef = useRef<HTMLDivElement>(null)
  const touchStartXRef = useRef<number | null>(null)
  const didSwipeRef = useRef(false)
  const galleryRef = useRef<HTMLDivElement>(null)
  const [keyboardReady, setKeyboardReady] = useState(true)

  const goToImage = (index: number) => {
    if (safeImages.length === 0) return
    setActiveIndex(Math.max(0, Math.min(index, safeImages.length - 1)))
  }

  useEffect(() => {
    if (!keyboardReady && !zoomOpen) return
    const handleGalleryKeys = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return
      if (event.key === 'Escape' && zoomOpen) {
        event.preventDefault()
        setZoomOpen(false)
        return
      }
      if (safeImages.length < 2) return
      const target = event.target as HTMLElement | null
      if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        goToImage(activeIndex - 1)
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        goToImage(activeIndex + 1)
      } else if (event.key === 'Home') {
        event.preventDefault()
        goToImage(0)
      } else if (event.key === 'End') {
        event.preventDefault()
        goToImage(safeImages.length - 1)
      }
    }
    window.addEventListener('keydown', handleGalleryKeys)
    return () => window.removeEventListener('keydown', handleGalleryKeys)
  }, [keyboardReady, zoomOpen, safeImages.length, activeIndex])

  useEffect(() => {
    galleryRef.current?.focus({ preventScroll: true })
    setKeyboardReady(true)
  }, [])

  useEffect(() => {
    if (zoomOpen) {
      const previousOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') setZoomOpen(false)
      }
      window.addEventListener('keydown', handleEscape)
      return () => {
        window.removeEventListener('keydown', handleEscape)
        document.body.style.overflow = previousOverflow
      }
    } else {
      document.body.style.overflow = 'auto'
    }
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [zoomOpen])

  useEffect(() => {
    if (activeIndex > safeImages.length - 1) setActiveIndex(0)
  }, [activeIndex, safeImages.length])

  useEffect(() => {
    if (!selectedImage) return
    const selectedIndex = safeImages.indexOf(selectedImage)
    if (selectedIndex >= 0) setActiveIndex(selectedIndex)
  }, [safeImages, selectedImage])

  useEffect(() => {
    const activeThumbnail = thumbnailsRef.current?.querySelector<HTMLElement>(
      '[data-gallery-index="' + activeIndex + '"]'
    )
    activeThumbnail?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [activeIndex])

  if (safeImages.length === 0) {
    return (
      <div className="aspect-square overflow-hidden rounded-[32px] border border-gray-200 bg-white shadow-[0_24px_70px_-48px_rgba(15,23,42,0.35)]">
        <ProductImagePlaceholder label={'Imagen de ' + productName} />
      </div>
    )
  }

  return (
    <div
      ref={galleryRef}
      role="group"
      aria-label={'Galería de imágenes de ' + productName}
      tabIndex={0}
      onMouseEnter={() => setKeyboardReady(true)}
      onFocusCapture={() => setKeyboardReady(true)}
      onBlurCapture={() => setKeyboardReady(false)}
      className="mx-auto w-full max-w-[560px] min-w-0 space-y-4 overflow-hidden rounded-[32px] border border-gray-200 bg-white p-3 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ED164F]/40 sm:p-4"
    >
      <div className="flex items-center justify-between px-1">
        <div>
          <p className="text-sm font-semibold text-gray-900">Vista del producto</p>
          <p className="text-xs uppercase tracking-[0.16em] text-gray-500">
            Revisá detalles y terminaciones
          </p>
        </div>
        {safeImages.length > 1 && (
          <p className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600" aria-live="polite">
            {activeIndex + 1} / {safeImages.length}
          </p>
        )}
      </div>

      <div className="relative">
        <button
          type="button"
          className="group relative block aspect-square w-full min-w-0 cursor-zoom-in overflow-hidden rounded-[28px] border border-gray-100 bg-[#F7F7F8] p-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FEF1F5]"
          onTouchStart={(event) => {
            touchStartXRef.current = event.changedTouches[0]?.clientX ?? null
            didSwipeRef.current = false
          }}
          onTouchEnd={(event) => {
            const startX = touchStartXRef.current
            const endX = event.changedTouches[0]?.clientX
            touchStartXRef.current = null
            if (startX === null || typeof endX !== 'number' || Math.abs(endX - startX) < 45) return
            didSwipeRef.current = true
            goToImage(activeIndex + (endX < startX ? 1 : -1))
          }}
          onClick={() => {
            if (didSwipeRef.current) {
              didSwipeRef.current = false
              return
            }
            setZoomOpen(true)
          }}
          aria-label={'Ampliar imagen ' + (activeIndex + 1) + ' de ' + productName}
        >
          <img
            src={safeImages[activeIndex]}
            alt={productName + ' - Vista ' + (activeIndex + 1)}
            className="absolute inset-0 h-full w-full object-contain transition-opacity duration-200"
            loading="eager"
            draggable={false}
          />
        </button>
        {safeImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={(event) => { event.stopPropagation(); goToImage(activeIndex - 1) }}
              disabled={activeIndex === 0}
              aria-label="Imagen anterior"
              className="group absolute left-0 top-1/2 z-10 flex h-24 w-8 -translate-y-1/2 items-center justify-center bg-transparent text-gray-800 transition hover:bg-white/10 disabled:pointer-events-none disabled:opacity-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#ED164F] sm:w-10"
            >
              <span className="flex h-16 w-1 items-center justify-center rounded-full bg-white/75 shadow-[0_1px_6px_rgba(0,0,0,0.45)] backdrop-blur-sm transition-all group-hover:w-1.5" aria-hidden="true" />
              <ChevronLeft size={1} className="sr-only" />
            </button>
            <button
              type="button"
              onClick={(event) => { event.stopPropagation(); goToImage(activeIndex + 1) }}
              disabled={activeIndex === safeImages.length - 1}
              aria-label="Imagen siguiente"
              className="group absolute right-0 top-1/2 z-10 flex h-24 w-8 -translate-y-1/2 items-center justify-center bg-transparent text-gray-800 transition hover:bg-white/10 disabled:pointer-events-none disabled:opacity-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#ED164F] sm:w-10"
            >
              <span className="flex h-16 w-1 items-center justify-center rounded-full bg-white/75 shadow-[0_1px_6px_rgba(0,0,0,0.45)] backdrop-blur-sm transition-all group-hover:w-1.5" aria-hidden="true" />
              <ChevronRight size={1} className="sr-only" />
            </button>
          </>
        )}
      </div>

      {safeImages.length > 1 && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => goToImage(activeIndex - 1)}
            disabled={activeIndex === 0}
            aria-label="Desplazar imágenes hacia atrás"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FEF1F5]"
          >
            <ChevronLeft size={18} />
          </button>

          <div
            ref={thumbnailsRef}
            aria-label={'Miniaturas de ' + productName}
            className="flex min-w-0 flex-1 snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain scroll-smooth py-1 [scrollbar-width:thin]"
          >
            {safeImages.map((img, i) => (
              <button
                key={img + i}
                data-gallery-index={i}
                type="button"
                onClick={() => goToImage(i)}
                aria-label={'Ver imagen ' + (i + 1) + ' de ' + safeImages.length}
                aria-current={i === activeIndex ? 'true' : undefined}
                className={
                  'relative aspect-square w-[68px] shrink-0 snap-center overflow-hidden rounded-xl border-2 bg-[#F7F7F8] transition sm:w-[76px] ' +
                  (i === activeIndex
                    ? 'border-[#ED164F] shadow-sm ring-2 ring-[#FEF1F5]'
                    : 'border-transparent opacity-75 hover:border-gray-300 hover:opacity-100')
                }
              >
                <img
                  src={img}
                  alt=""
                  className="h-full w-full object-contain p-1.5"
                  loading="lazy"
                  draggable={false}
                />
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => goToImage(activeIndex + 1)}
            disabled={activeIndex === safeImages.length - 1}
            aria-label="Desplazar imágenes hacia adelante"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FEF1F5]"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {zoomOpen && (
        <button
          type="button"
          className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center overflow-hidden bg-black/80 p-3 text-left backdrop-blur-md sm:p-8"
          onClick={() => setZoomOpen(false)}
          aria-label={'Cerrar imagen ampliada de ' + productName}
        >
          <span className="flex h-[min(82dvh,760px)] w-[min(88vw,1000px)] max-h-full max-w-full items-center justify-center rounded-2xl bg-black/10 p-2 sm:p-4">
            <img
              src={safeImages[activeIndex]}
              alt={productName + ' ampliado'}
              className="h-full w-full object-contain shadow-[0_28px_90px_-24px_rgba(0,0,0,0.75)]"
              draggable={false}
            />
          </span>
        </button>
      )}
    </div>
  )
}
