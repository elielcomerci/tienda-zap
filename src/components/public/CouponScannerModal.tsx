'use client'

import { useEffect, useRef, useState } from 'react'
import { Scanner } from '@yudiel/react-qr-scanner'
import { Camera, ScanLine, X } from 'lucide-react'

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

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/80 p-4 backdrop-blur-sm sm:p-6">
      <div className="w-full max-w-2xl overflow-hidden rounded-[32px] border border-white/10 bg-gray-950 text-white shadow-[0_30px_90px_-40px_rgba(15,23,42,0.9)]">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-5 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">
              Escaner de cupon
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
              Apunta al QR y capturamos el codigo al instante.
            </h2>
            <p className="mt-2 text-sm leading-7 text-gray-300">
              Usamos la camara trasera si esta disponible. Si el QR trae una URL, intentamos extraer
              el codigo automaticamente.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-200 transition-colors hover:bg-white/10"
            aria-label="Cerrar escaner de cupon"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 p-5 sm:p-6">
          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-black">
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
                  'No pudimos abrir la camara. Revisa permisos del navegador o usa el ingreso manual.'
                )
              }}
              allowMultiple={false}
              components={{ finder: true, onOff: true, torch: true, zoom: false }}
              constraints={{ facingMode: 'environment' }}
              formats={['qr_code']}
              scanDelay={350}
              sound={false}
              styles={{
                container: { width: '100%', minHeight: 360 },
                video: { objectFit: 'cover' },
              }}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-orange-300">
                <Camera size={16} />
                <span className="text-xs font-semibold uppercase tracking-[0.18em]">Camara</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-gray-300">
                Priorizamos la camara trasera para que leer el QR sea mas rapido y mas estable.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-orange-300">
                <ScanLine size={16} />
                <span className="text-xs font-semibold uppercase tracking-[0.18em]">Lectura</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-gray-300">
                Si el codigo trae un link, intentamos quedarnos con el cupón real en vez de la URL completa.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-orange-300">
                <X size={16} />
                <span className="text-xs font-semibold uppercase tracking-[0.18em]">Salida</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-gray-300">
                Si algo falla, sales rapido y sigues con el codigo manual sin perder el checkout.
              </p>
            </div>
          </div>

          {cameraError && (
            <div className="rounded-2xl border border-amber-300/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              {cameraError}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
