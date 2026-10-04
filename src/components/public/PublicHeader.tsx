'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { ChevronDown, Handshake, LayoutDashboard, ShoppingCart, X } from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'
import { useState, useEffect, useTransition } from 'react'
import { createPublicSellerLead } from '@/lib/actions/leads'

const NAV_HEIGHT = 70

/** Mismos slugs que ObjectivesSection — editá en un solo lugar */
const FEATURED_SITUATION_SLUGS = [
  'estoy-por-abrir',
  'quiero-vender-mas',
  'quiero-que-vuelvan',
  'quiero-que-me-encuentren',
  'quiero-renovar-la-marca-o-el-espacio',
  'tengo-un-evento',
]

export default function PublicHeader({
  user,
  referralSeller,
  categories = [],
  intentions = [],
}: {
  user?: { name?: string | null; role?: string | null } | null
  referralSeller?: { id: string; name?: string | null } | null
  categories?: { id: string; name: string; slug: string }[]
  intentions?: { id: string; name: string; slug: string; icon: string | null }[]
}) {
  const rawItemCount = useCartStore((state) => state.itemCount())
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [menuOpen, setMenuOpen] = useState(false)
  const [leadOpen, setLeadOpen] = useState(false)
  const [leadError, setLeadError] = useState<string | null>(null)
  const [leadSent, setLeadSent] = useState(false)
  const [isLeadPending, startLeadTransition] = useTransition()
  const [isScrolled, setIsScrolled] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Mobile submenu accordions state
  const [mobileProdOpen, setMobileProdOpen] = useState(false)
  const [mobileObjOpen, setMobileObjOpen] = useState(false)

  const canOpenAdminPanel = user?.role === 'ADMIN'
  const canOpenSellerPanel = user?.role === 'SELLER' || canOpenAdminPanel
  const showReferralBanner = Boolean(referralSeller && !canOpenSellerPanel)

  useEffect(() => { setMounted(true) }, [])

  // Only show cart count after mount to avoid hydration mismatch
  const itemCount = mounted ? rawItemCount : 0

  // Glassmorphism on scroll (kept as part of ZAP's aesthetic guidelines for scroll states)
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 10)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Lock scroll when mobile menu open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  // Reset mobile submenus when main menu closes
  useEffect(() => {
    if (!menuOpen) {
      setMobileProdOpen(false)
      setMobileObjOpen(false)
    }
  }, [menuOpen])

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const isLinkActive = (href: string) => {
    const target = new URL(href, 'https://zap.local')
    if (target.pathname !== pathname) return false
    
    const targetCat = target.searchParams.get('cat')
    const currentCat = searchParams.get('cat')
    if (targetCat) return currentCat === targetCat
    
    const targetMode = target.searchParams.get('mode')
    const currentMode = searchParams.get('mode')
    if (targetMode) return currentMode === targetMode
    
    if (target.pathname === '/productos') {
      return !currentCat && !currentMode
    }
    
    return true
  }

  const handleLeadSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    setLeadError(null)

    startLeadTransition(async () => {
      const result = await createPublicSellerLead(formData)
      if (result?.error) {
        setLeadError(result.error)
        return
      }
      setLeadSent(true)
    })
  }

  return (
    <>
      <header
        className={`fixed w-full top-0 left-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-white shadow-sm border-b border-gray-200'
            : 'bg-white border-b border-gray-100'
        }`}
        style={{ height: `${NAV_HEIGHT}px` }}
      >
        <div className="mx-auto flex items-center justify-between h-full max-w-[1380px] px-4 xl:px-8">
          {/* Logo — exact text typography from prototype */}
          <Link href="/" className="flex items-center gap-2 shrink-0 py-3" aria-label="Ir al inicio">
            <span className="text-2xl font-black tracking-tight text-gray-950">ZAP</span>
            <span className="text-2xl font-normal text-gray-800">Tienda</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center space-x-8 h-full">
            <ul className="flex items-center space-x-8 h-full">
              
              {/* Desktop link: Productos */}
              <li className="relative group h-full flex items-center">
                <Link 
                  href="/productos?mode=product"
                  className={`flex items-center gap-1 text-sm font-semibold transition-colors py-2 ${
                    pathname === '/productos' && searchParams.get('mode') !== 'combo' && searchParams.get('mode') !== 'situation'
                      ? 'text-[#ED164F]'
                      : 'text-gray-900 hover:text-[#ED164F]'
                  }`}
                >
                  <span>Productos</span>
                  <ChevronDown size={14} className="transition-transform duration-250 group-hover:rotate-180 text-gray-500" />
                </Link>
                
                <div className="absolute top-[100%] left-0 pt-2 w-[260px] hidden group-hover:block z-50">
                  <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-4 space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 pb-1.5 mb-2">
                      Categorías
                    </p>
                    <Link 
                      href="/productos?mode=product" 
                      className="block text-sm font-bold text-gray-900 hover:text-[#ED164F] p-1.5 rounded-lg hover:bg-[#FEF1F5] transition-all"
                    >
                      Ver todo el catálogo
                    </Link>
                    <div className="max-h-[240px] overflow-y-auto pr-1 space-y-0.5">
                      {categories.map((cat) => (
                        <Link 
                          key={cat.id} 
                          href={`/productos?mode=product&cat=${cat.slug}`} 
                          className="block text-sm font-medium text-gray-600 hover:text-[#ED164F] p-1.5 rounded-lg hover:bg-[#FEF1F5] transition-all"
                        >
                          {cat.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </li>

              {/* Desktop link: Packs */}
              <li className="h-full flex items-center">
                <Link
                  href="/productos?mode=combo"
                  className={`text-sm font-semibold transition-colors ${
                    isLinkActive('/productos?mode=combo')
                      ? 'text-[#ED164F]'
                      : 'text-gray-900 hover:text-[#ED164F]'
                  }`}
                >
                  Packs
                </Link>
              </li>

              {/* Desktop link: Situaciones */}
              <li className="relative group h-full flex items-center">
                <Link 
                  href="/productos?mode=situation"
                  className={`flex items-center gap-1 text-sm font-semibold transition-colors py-2 ${
                    searchParams.get('mode') === 'situation'
                      ? 'text-[#ED164F]'
                      : 'text-gray-900 hover:text-[#ED164F]'
                  }`}
                >
                  <span>Situaciones</span>
                  <ChevronDown size={14} className="transition-transform duration-250 group-hover:rotate-180 text-gray-500" />
                </Link>
                
                <div className="absolute top-[100%] left-0 pt-2 w-[260px] hidden group-hover:block z-50">
                  <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-4 space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                    {intentions
                      .filter((i) => FEATURED_SITUATION_SLUGS.includes(i.slug))
                      .sort((a, b) => FEATURED_SITUATION_SLUGS.indexOf(a.slug) - FEATURED_SITUATION_SLUGS.indexOf(b.slug))
                      .map((intent) => (
                        <Link 
                          key={intent.id} 
                          href={`/productos?mode=situation&situacion=${intent.slug}`}
                          className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-[#ED164F] p-2 rounded-lg hover:bg-[#FEF1F5] transition-all"
                        >
                          {intent.icon && <span className="shrink-0 text-base">{intent.icon}</span>}
                          <span className="truncate">{intent.name}</span>
                        </Link>
                      ))
                    }
                    <div className="border-t border-gray-100 pt-1 mt-1">
                      <Link 
                        href="/productos?mode=situation"
                        className="block text-sm font-bold text-[#ED164F] hover:text-[#C2103F] p-2 rounded-lg hover:bg-[#FEF1F5] transition-all"
                      >
                        Ver todas las situaciones →
                      </Link>
                    </div>
                  </div>
                </div>
              </li>

              {/* User area */}
              <li className="h-full flex items-center">
                {canOpenAdminPanel && (
                  <Link
                    href="/admin"
                    className="mr-3 flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-700 hover:text-[#ED164F] transition-colors"
                    title="Ir al admin"
                  >
                    <LayoutDashboard size={15} />
                  </Link>
                )}

                {user ? (
                  <Link
                    href="/perfil"
                    className="text-sm font-semibold text-gray-900 hover:text-[#ED164F] transition-colors"
                  >
                    {user.name?.split(' ')[0] || 'Mi cuenta'}
                  </Link>
                ) : (
                  <Link
                    href="/login"
                    className="text-sm font-semibold text-gray-900 hover:text-[#ED164F] transition-colors"
                  >
                    Ingresar
                  </Link>
                )}
              </li>

              {/* Cart */}
              <li className="h-full flex items-center">
                <Link
                  href="/carrito"
                  className="relative flex items-center text-gray-900 hover:text-[#ED164F] transition-colors"
                  aria-label="Ir al carrito"
                >
                  <ShoppingCart size={20} />
                  {itemCount > 0 && (
                    <span className="absolute -right-2.5 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#ED164F] text-[10px] font-bold text-white">
                      {itemCount > 9 ? '9+' : itemCount}
                    </span>
                  )}
                </Link>
              </li>
            </ul>
          </nav>

          {/* Mobile: cart + hamburger */}
          <div className="flex items-center gap-2 md:hidden">
            {canOpenAdminPanel && (
              <Link
                href="/admin"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#F7638B]/25 bg-[#FEF1F5] text-[#C2103F] shadow-sm"
                aria-label="Ir al admin"
              >
                <LayoutDashboard size={18} />
              </Link>
            )}
            {canOpenSellerPanel && (
              <Link
                href="/seller"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#4576B9]/25 bg-[#EEF4FC] text-[#2F5F9F] shadow-sm"
                aria-label="Ir al panel de asesores"
              >
                <Handshake size={18} />
              </Link>
            )}
            <Link
              href="/carrito"
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm"
              aria-label="Ir al carrito"
            >
              <ShoppingCart size={18} />
              {itemCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#ED164F] text-[9px] font-bold text-white">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </Link>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="relative w-10 h-10 flex items-center justify-center"
              aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            >
              <span
                className={`absolute block h-0.5 w-6 bg-gradient-to-r from-[#ED164F] to-[#4576B9] transition-transform duration-300 ${
                  menuOpen ? 'rotate-45 translate-y-0' : '-translate-y-2'
                }`}
              />
              <span
                className={`absolute block h-0.5 w-6 bg-gradient-to-r from-[#ED164F] to-[#4576B9] transition-opacity duration-300 ${
                  menuOpen ? 'opacity-0' : 'opacity-100'
                }`}
              />
              <span
                className={`absolute block h-0.5 w-6 bg-gradient-to-r from-[#ED164F] to-[#4576B9] transition-transform duration-300 ${
                  menuOpen ? '-rotate-45 translate-y-0' : 'translate-y-2'
                }`}
              />
            </button>
          </div>
        </div>
      </header>

      {showReferralBanner && referralSeller && (
        <div className="fixed left-0 right-0 top-[70px] z-40 border-y border-[#4576B9]/15 bg-white/95 px-4 py-2 text-center text-xs font-semibold text-gray-600 shadow-sm backdrop-blur">
          Te está asesorando <span className="text-[#ED164F]">{referralSeller.name || 'un asesor ZAP'}</span>
          <button
            type="button"
            onClick={() => {
              setLeadOpen(true)
              setLeadSent(false)
              setLeadError(null)
            }}
            className="ml-3 rounded-full bg-[#ED164F] px-3 py-1 text-[11px] font-bold text-white"
          >
            Quiero asesoría
          </button>
        </div>
      )}

      {/* Mobile menu — full screen overlay, highly scrollable and clean */}
      <div
        className={`md:hidden fixed inset-0 z-[60] flex flex-col w-full h-full text-white transition-all duration-500 ease-in-out ${
          menuOpen ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
        }`}
        style={{ background: 'linear-gradient(135deg, #ED164F 0%, #4576B9 100%)' }}
        role="dialog"
        aria-modal="true"
      >
        {/* Top bar with logo and close button */}
        <div className="flex items-center justify-between px-6 h-[70px] border-b border-white/10 shrink-0">
          <Link href="/" onClick={() => setMenuOpen(false)} aria-label="Ir al inicio" className="flex items-center h-full py-3 shrink-0">
            <img
              src="https://res.cloudinary.com/dip14vkem/image/upload/v1756568241/logo_t37blz.png"
              alt="ZAP Logo"
              className="h-full w-auto object-contain brightness-0 invert"
            />
          </Link>
          <button
            onClick={() => setMenuOpen(false)}
            className="w-10 h-10 flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-transform"
            aria-label="Cerrar menú"
          >
            <X size={26} strokeWidth={2.5} />
          </button>
        </div>

        {/* Scrollable menu content with padded bottom for home indicators */}
        <div className="flex-1 overflow-y-auto px-6 pt-8 pb-16">
          <ul className="flex flex-col space-y-5 text-left max-w-sm mx-auto">
            <li>
              <Link
                href="/"
                onClick={() => setMenuOpen(false)}
                className="block text-xl font-bold hover:opacity-90 active:scale-[0.98] transition-all"
              >
                Inicio
              </Link>
            </li>

            {/* Collapsible: Productos */}
            <li className="border-b border-white/10 pb-3">
              <button
                onClick={() => setMobileProdOpen(!mobileProdOpen)}
                className="flex items-center justify-between w-full text-xl font-bold hover:opacity-90 active:scale-[0.98] transition-all text-left"
              >
                <span>Productos</span>
                <ChevronDown size={20} className={`transition-transform duration-300 ${mobileProdOpen ? 'rotate-180' : ''}`} />
              </button>
              
              <div className={`overflow-hidden transition-all duration-300 ${mobileProdOpen ? 'max-h-[800px] mt-3 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
                <ul className="pl-4 border-l border-white/20 space-y-2.5">
                  <li>
                    <Link
                      href="/productos?mode=product"
                      onClick={() => setMenuOpen(false)}
                      className="block text-sm font-semibold text-white/90 hover:text-white active:translate-x-1 transition-all py-1"
                    >
                      Ver todo el catálogo
                    </Link>
                  </li>
                  {categories.map((cat) => (
                    <li key={cat.id}>
                      <Link
                        href={`/productos?mode=product&cat=${cat.slug}`}
                        onClick={() => setMenuOpen(false)}
                        className="block text-sm font-medium text-white/80 hover:text-white active:translate-x-1 transition-all py-1"
                      >
                        {cat.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </li>

            {/* Packs */}
            <li>
              <Link
                href="/productos?mode=combo"
                onClick={() => setMenuOpen(false)}
                className="block text-xl font-bold hover:opacity-90 active:scale-[0.98] transition-all"
              >
                Packs
              </Link>
            </li>

            {/* Situaciones — móvil */}
            <li className="border-b border-white/10 pb-3">
              <button
                onClick={() => setMobileObjOpen(!mobileObjOpen)}
                className="flex items-center justify-between w-full text-xl font-bold hover:opacity-90 active:scale-[0.98] transition-all text-left"
              >
                <span>Situaciones</span>
                <ChevronDown size={20} className={`transition-transform duration-300 ${mobileObjOpen ? 'rotate-180' : ''}`} />
              </button>

              <div className={`overflow-hidden transition-all duration-300 ${mobileObjOpen ? 'max-h-[600px] mt-3 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
                <ul className="pl-4 border-l border-white/20 space-y-2.5">
                  {intentions
                    .filter((i) => FEATURED_SITUATION_SLUGS.includes(i.slug))
                    .sort((a, b) => FEATURED_SITUATION_SLUGS.indexOf(a.slug) - FEATURED_SITUATION_SLUGS.indexOf(b.slug))
                    .map((intent) => (
                      <li key={intent.id}>
                        <Link
                          href={`/productos?mode=situation&situacion=${intent.slug}`}
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2 text-sm font-medium text-white/80 hover:text-white active:translate-x-1 transition-all py-1"
                        >
                          {intent.icon && <span className="text-base shrink-0">{intent.icon}</span>}
                          <span>{intent.name}</span>
                        </Link>
                      </li>
                    ))
                  }
                  <li>
                    <Link
                      href="/productos?mode=situation"
                      onClick={() => setMenuOpen(false)}
                      className="block text-sm font-bold text-white/90 hover:text-white active:translate-x-1 transition-all py-1"
                    >
                      Ver todas las situaciones →
                    </Link>
                  </li>
                </ul>
              </div>
            </li>

            {/* Link back to zap.com.ar */}
            <li className="pt-2">
              <a
                href="https://zap.com.ar"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMenuOpen(false)}
                className="block text-base font-bold text-white/90 hover:text-white hover:opacity-80 active:scale-[0.98] transition-all"
              >
                ¿Necesitás algo que no aparece acá? <span className="underline underline-offset-2">Hablemos →</span>
              </a>
            </li>

            {/* User area */}
            <li className="pt-4 border-t border-white/10">
              {user ? (
                <div className="flex flex-col gap-3">
                  <Link
                    href="/perfil"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-center bg-white text-[#ED164F] text-base py-2.5 px-6 rounded-full shadow-lg font-bold hover:bg-pink-50 active:scale-[0.98] transition-all"
                  >
                    Mi perfil
                  </Link>
                  {canOpenAdminPanel && (
                    <Link
                      href="/admin"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center justify-center bg-white/20 text-white text-base py-2 px-6 rounded-full font-bold hover:bg-white/30 active:scale-[0.98] transition-all"
                    >
                      Panel Admin
                    </Link>
                  )}
                  {canOpenSellerPanel && (
                    <Link
                      href="/seller"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center justify-center bg-white/20 text-white text-base py-2 px-6 rounded-full font-bold hover:bg-white/30 active:scale-[0.98] transition-all"
                    >
                      Panel Asesores
                    </Link>
                  )}
                </div>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-center bg-white text-[#ED164F] text-base font-bold py-3 px-6 rounded-full shadow-lg active:scale-95 transition-all"
                >
                  ⚡ Ingresar a mi cuenta
                </Link>
              )}
            </li>

          </ul>
        </div>
      </div>

      {leadOpen && referralSeller && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-gray-950/50 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-black text-gray-900">Te contactamos</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Deja tus datos y {referralSeller.name || 'tu asesor ZAP'} te escribe.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLeadOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100"
                aria-label="Cerrar"
              >
                &times;
              </button>
            </div>

            {leadSent ? (
              <div className="rounded-xl bg-green-50 p-4 text-sm font-semibold text-green-700">
                Listo, recibimos tus datos. Te vamos a contactar pronto.
              </div>
            ) : (
              <form onSubmit={handleLeadSubmit} className="space-y-3">
                <input type="hidden" name="sellerId" value={referralSeller.id} />
                {leadError && (
                  <div className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{leadError}</div>
                )}
                <div>
                  <label className="label">Nombre</label>
                  <input name="name" required className="input" placeholder="Tu nombre" />
                </div>
                <div>
                  <label className="label">WhatsApp</label>
                  <input name="phone" required className="input" placeholder="223..." />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input name="email" type="email" className="input" placeholder="tu@email.com" />
                </div>
                <div>
                  <label className="label">¿Qué necesitás?</label>
                  <textarea name="interest" rows={3} className="input resize-none" placeholder="Contanos brevemente..." />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setLeadOpen(false)} className="btn-secondary">Cancelar</button>
                  <button type="submit" disabled={isLeadPending} className="btn-primary">
                    {isLeadPending ? 'Enviando...' : 'Enviar'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Spacer for fixed header */}
      <div style={{ height: `${NAV_HEIGHT + (showReferralBanner ? 34 : 0)}px` }} aria-hidden="true" />
    </>
  )
}
