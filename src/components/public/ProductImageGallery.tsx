'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { X, ZoomIn } from 'lucide-react'

export default function ProductImageGallery({ images, productName }: { images: string[], productName: string }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [zoomOpen, setZoomOpen] = useState(false)

  // Prevent scroll when zoom modal is open
  useEffect(() => {
    if (zoomOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }
    return () => {
      document.body.style.overflow = 'auto' // Cleanup on unmount
    }
  }, [zoomOpen])

  if (!images || images.length === 0) {
    return (
      <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100 flex items-center justify-center text-6xl">
        🖨️
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Main Image */}
      <div 
        className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 group cursor-zoom-in border border-gray-100"
        onClick={() => setZoomOpen(true)}
      >
        <Image 
          src={images[activeIndex]} 
          alt={`${productName} - Vista principal`}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
        />
        <div className="absolute top-4 right-4 bg-white/80 backdrop-blur p-2 rounded-xl text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-sm">
          <ZoomIn size={20} />
        </div>
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 snap-x hide-scrollbar">
          {images.map((img, i) => (
            <button 
              key={i}
              type="button"
              onClick={() => setActiveIndex(i)}
              className={`
                relative w-20 h-20 rounded-xl overflow-hidden shrink-0 snap-start transition-all border-2
                ${i === activeIndex ? 'border-orange-500 opacity-100 ring-4 ring-orange-50' : 'border-transparent opacity-60 hover:opacity-100'}
              `}
            >
              <Image 
                src={img} 
                alt={`${productName} thumbnail ${i + 1}`} 
                fill
                className="object-cover"
                sizes="80px"
              />
            </button>
          ))}
        </div>
      )}

      {/* Zoom Modal (Lightbox) */}
      {zoomOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 sm:p-8" onClick={() => setZoomOpen(false)}>
          <button 
            type="button"
            className="absolute top-4 right-4 sm:top-8 sm:right-8 bg-white/10 hover:bg-white/20 text-white rounded-full p-3 backdrop-blur transition-colors"
            onClick={(e) => { e.stopPropagation(); setZoomOpen(false) }}
          >
            <X size={24} />
          </button>
          
          <div className="relative w-full max-w-5xl aspect-square sm:aspect-video rounded-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            <Image 
              src={images[activeIndex]} 
              alt={`${productName} zoom`}
              fill
              className="object-contain"
              sizes="100vw"
            />
          </div>
        </div>
      )}
    </div>
  )
}
