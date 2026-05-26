'use client'

import { useEffect, useState } from 'react'
import { Sparkles, Tag, X } from 'lucide-react'
import { getWelcomePromoDetails } from '@/lib/actions/welcome-promo'

export default function WelcomePromoModal() {
  const [promo, setPromo] = useState<any>(null)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`
      const parts = value.split(`; ${name}=`)
      if (parts.length === 2) return parts.pop()?.split(';').shift()
      return null
    }

    const promoCode = getCookie('zap_welcome_promo')
    if (!promoCode) return

    const hasSeen = localStorage.getItem(`has_seen_promo_${promoCode}`)
    if (hasSeen) return

    getWelcomePromoDetails(promoCode)
      .then((data) => {
        if (data) {
          setPromo(data)
          setIsOpen(true)
        }
      })
      .catch(() => {})
  }, [])

  const handleClose = () => {
    setIsOpen(false)
    if (promo?.code) {
      localStorage.setItem(`has_seen_promo_${promo.code}`, 'true')
    }
  }

  if (!isOpen || !promo) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={handleClose} />

      <section className="relative flex max-h-[min(92svh,760px)] w-full max-w-md animate-in flex-col overflow-hidden rounded-3xl bg-white shadow-2xl fade-in zoom-in-95 duration-300">
        <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-gray-900 to-black px-6 py-5 text-center sm:px-8 sm:py-7 [@media(max-height:720px)]:py-4">
          <div className="absolute right-0 top-0 p-4">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-full bg-white/10 p-1.5 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
              aria-label="Cerrar beneficio"
            >
              <X size={18} />
            </button>
          </div>

          {promo.logoUrl ? (
            <img
              src={promo.logoUrl}
              alt="Logo del beneficio"
              className="mx-auto mb-3 max-h-14 object-contain sm:max-h-16 [@media(max-height:720px)]:max-h-10"
            />
          ) : (
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white/90 sm:h-16 sm:w-16 [@media(max-height:720px)]:h-11 [@media(max-height:720px)]:w-11">
              <Sparkles size={32} />
            </div>
          )}

          <h2 className="text-xl font-black leading-tight text-white balance sm:text-2xl [@media(max-height:720px)]:text-lg">
            {promo.title || 'Beneficio exclusivo'}
          </h2>

          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/20 px-4 py-1.5 text-orange-400 [@media(max-height:720px)]:mt-2">
            <Tag size={16} />
            <span className="text-sm font-bold uppercase tracking-wide">
              {promo.discountKind === 'PERCENTAGE'
                ? `${promo.discountValue}% OFF`
                : `$${promo.discountValue.toLocaleString('es-AR')} OFF`}
            </span>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="px-6 py-6 sm:px-8 sm:py-7 [@media(max-height:720px)]:py-5">
            <p className="text-center text-base font-medium leading-7 text-gray-700 sm:text-lg sm:leading-8 [@media(max-height:720px)]:text-sm [@media(max-height:720px)]:leading-6">
              {promo.message ||
                `Tenes un beneficio especial aplicable a toda tu compra. El codigo ${promo.code} ya fue guardado en tu sesion y se aplicara en el checkout.`}
            </p>

            {promo.recipientLabel && (
              <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-center [@media(max-height:720px)]:py-2.5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
                  Cupon preparado para
                </p>
                <p className="mt-1 text-base font-black text-gray-900">{promo.recipientLabel}</p>
                {promo.recipientName && promo.recipientBusiness && (
                  <p className="mt-0.5 text-sm font-semibold text-gray-500">
                    {promo.recipientBusiness}
                  </p>
                )}
              </div>
            )}

            {promo.presenterName && (
              <p className="mt-4 rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-center text-sm font-semibold text-orange-900 [@media(max-height:720px)]:py-2.5">
                Beneficio acercado por {promo.presenterName}.
              </p>
            )}

            {promo.conditions && (
              <p className="mt-4 text-center text-xs leading-5 text-gray-400 balance">
                {promo.conditions}
              </p>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-gray-100 bg-white/95 px-6 py-4 backdrop-blur sm:px-8">
          <button
            type="button"
            onClick={handleClose}
            className="w-full rounded-2xl bg-orange-500 px-4 py-3.5 text-center font-bold text-white shadow-lg shadow-orange-500/20 transition-all hover:-translate-y-0.5 hover:bg-orange-600"
          >
            Aceptar y continuar
          </button>
        </div>
      </section>
    </div>
  )
}
