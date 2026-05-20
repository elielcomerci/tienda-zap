'use client'

import { useEffect, useState } from 'react'
import { X, Tag, Sparkles } from 'lucide-react'
import { getWelcomePromoDetails } from '@/lib/actions/welcome-promo'

export default function WelcomePromoModal() {
  const [promo, setPromo] = useState<any>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 1. Verificar si hay cookie de promo
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`
      const parts = value.split(`; ${name}=`)
      if (parts.length === 2) return parts.pop()?.split(';').shift()
      return null
    }

    const promoCode = getCookie('zap_welcome_promo')
    if (!promoCode) {
      setIsLoading(false)
      return
    }

    // 2. Verificar si ya la vió para no molestar en cada carga de página
    const hasSeen = localStorage.getItem(`has_seen_promo_${promoCode}`)
    if (hasSeen) {
      setIsLoading(false)
      return
    }

    // 3. Consultar datos de la promo en el servidor
    getWelcomePromoDetails(promoCode).then((data) => {
      if (data) {
        setPromo(data)
        setIsOpen(true)
      }
      setIsLoading(false)
    }).catch(() => {
      setIsLoading(false)
    })
  }, [])

  const handleClose = () => {
    setIsOpen(false)
    if (promo?.code) {
      localStorage.setItem(`has_seen_promo_${promo.code}`, 'true')
    }
  }

  if (!isOpen || !promo) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" 
        onClick={handleClose} 
      />
      
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        
        {/* Header Decorativo */}
        <div className="bg-gradient-to-br from-gray-900 to-black p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
            <button 
              onClick={handleClose}
              className="rounded-full bg-white/10 p-1.5 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          {promo.logoUrl ? (
            <img 
              src={promo.logoUrl} 
              alt="Partner Logo" 
              className="mx-auto mb-4 max-h-16 object-contain"
            />
          ) : (
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-white/90">
              <Sparkles size={32} />
            </div>
          )}

          <h2 className="text-2xl font-black text-white balance leading-tight">
            {promo.title || '¡Beneficio Exclusivo!'}
          </h2>
          
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-orange-500/20 border border-orange-500/30 px-4 py-1.5 text-orange-400">
            <Tag size={16} />
            <span className="font-bold tracking-wide uppercase text-sm">
              {promo.discountKind === 'PERCENTAGE' 
                ? `${promo.discountValue}% OFF` 
                : `$${promo.discountValue.toLocaleString('es-AR')} OFF`}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          <p className="text-center text-lg text-gray-700 font-medium">
            {promo.message || `Tenés un beneficio especial aplicable a toda tu compra. El código ${promo.code} ya fue guardado en tu sesión y se aplicará en el checkout.`}
          </p>

          {promo.presenterName && (
            <p className="mt-4 rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-center text-sm font-semibold text-orange-900">
              Beneficio acercado por {promo.presenterName}.
            </p>
          )}

          <div className="mt-8">
            <button 
              onClick={handleClose}
              className="w-full rounded-2xl bg-orange-500 py-3.5 px-4 text-center font-bold text-white shadow-lg shadow-orange-500/20 transition-all hover:bg-orange-600 hover:-translate-y-0.5"
            >
              Aceptar y Continuar
            </button>
          </div>

          {promo.conditions && (
            <p className="mt-4 text-center text-xs text-gray-400 balance">
              {promo.conditions}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
