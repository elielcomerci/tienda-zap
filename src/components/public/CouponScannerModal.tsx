'use client'

import { useEffect, useRef, useState } from 'react'
import { Scanner } from '@yudiel/react-qr-scanner'
import { X } from 'lucide-react'

export default function CouponScannerModal({
  open,
  onClose,
  onDetected,
}: {
  open: boolean
  onClose: () => void
  onDetected: (rawValue: string) => void
}) {
  const [cameraError, setCameraError] = useState('')
  const lastDetectedRef = useRef('')

  useEffect(() => {
    if (!open) {
      setCameraError('')
      lastDetectedRef.current = ''
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={(e) => {
        // Close on backdrop click
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {/* Close button — always visible, top-right, outside the card */}
      <button
        type="button"
        onClick={onClose}
        className="fixed top-4 right-4 z-[60] flex h-12 w-12 items-center justify-center rounded-full bg-white text-gray-900 shadow-xl transition-transform hover:scale-110 active:scale-95"
        aria-label="Cerrar escáner"
      >
        <X size={24} />
      </button>

      <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-gray-950 text-white shadow-2xl">
        {/* Header — compact */}
        <div className="px-5 pt-5 pb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#F66B9A]">
            Escáner de cupón
          </p>
          <p className="mt-1 text-sm text-gray-300">
            Apuntá al QR para capturar el código.
          </p>
        </div>

        {/* Scanner view — constrained height */}
        <div className="mx-5 overflow-hidden rounded-2xl border border-white/10 bg-black">
          <Scanner
            onScan={(detectedCodes) => {
              const rawValue = detectedCodes.find((code) => code.rawValue?.trim())?.rawValue?.trim()
              if (!rawValue || lastDetectedRef.current === rawValue) return
              lastDetectedRef.current = rawValue
              onDetected(rawValue)
            }}
            onError={(error) => {
              console.error('Coupon scanner error:', error)
              setCameraError(
                'No pudimos abrir la cámara. Revisá permisos o usá el ingreso manual.'
              )
            }}
            allowMultiple={false}
            components={{ finder: true, onOff: true, torch: true, zoom: false }}
            constraints={{ facingMode: 'environment' }}
            formats={['qr_code']}
            scanDelay={350}
            sound={false}
            styles={{
              container: { width: '100%', maxHeight: 280 },
              video: { objectFit: 'cover' },
            }}
          />
        </div>

        {/* Error or hint */}
        <div className="px-5 py-4">
          {cameraError ? (
            <div className="rounded-xl border border-amber-300/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              {cameraError}
            </div>
          ) : (
            <p className="text-center text-xs text-gray-500">
              Si no funciona, cerrá y usá el ingreso manual.
            </p>
          )}
        </div>

        {/* Bottom close button — always accessible */}
        <div className="px-5 pb-5">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            Cerrar escáner
          </button>
        </div>
      </div>
    </div>
  )
}
