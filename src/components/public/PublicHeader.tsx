'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { ChevronDown, Handshake, LayoutDashboard, Percent, ShoppingCart, X } from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'
import { useState, useEffect, useTransition } from 'react'
import { createPublicSellerLead } from '@/lib/actions/leads'

const NAV_HEIGHT = 70

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
            ? 'bg-white/95 backdrop-blur-xl shadow-lg border-b border-gray-100'
            : 'bg-white/70 backdrop-blur-md'
        }`}
        style={{ height: `${NAV_HEIGHT}px` }}
      >
        <div className="mx-auto flex items-center justify-between h-full max-w-[1380px] px-4 xl:px-8">
          {/* Logo — same as zap.com.ar */}
          <Link href="/" className="flex items-center h-full py-3 shrink-0" aria-label="Ir al inicio">
            <img
              src="https://res.cloudinary.com/dip14vkem/image/upload/v1756568241/logo_t37blz.png"
              alt="ZAP Logo"
              className="h-full w-auto object-contain"
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center space-x-6 h-full">
            <ul className="flex items-center space-x-6 h-full">
              
              {/* Desktop link: Productos (Mega Dropdown) */}
              <li className="relative group h-full flex items-center">
                <button 
                  className={`flex items-center gap-1 text-lg font-semibold transition-colors py-2 ${
                    pathname === '/productos' && searchParams.get('mode') !== 'combo' && searchParams.get('mode') !== 'objective'
                      ? 'text-[#ED2C71]'
                      : 'text-[#4576B9] hover:text-[#9951A1]'
                  }`}
                >
                  <span>Productos</span>
                  <ChevronDown size={14} className="transition-transform duration-250 group-hover:rotate-180" />
                </button>
                
                {/* Mega Dropdown Panel (Flat, Solid, Premium Design) */}
                <div className="absolute top-[100%] left-0 pt-2 w-[480px] hidden group-hover:block z-50">
                  <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-5 grid grid-cols-2 gap-5 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 pb-1.5">
                        Categorías Principales
                      </p>
                      <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1">
                        <Link 
                          href="/productos?mode=product" 
                          className="block text-sm font-bold text-gray-800 hover:text-[#ED2C71] p-1.5 rounded-lg hover:bg-[#FEF1F6] transition-all"
                        >
                          Ver todo el catálogo
                        </Link>
                        {categories.map((cat) => (
                          <Link 
                            key={cat.id} 
                            href={`/productos?mode=product&cat=${cat.slug}`} 
                            className="block text-sm font-medium text-gray-600 hover:text-[#ED2C71] p-1.5 rounded-lg hover:bg-[#FEF1F6] transition-all"
                          >
                            {cat.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-[#FEF1F6] via-white to-[#EEF4FC] p-4 rounded-xl flex flex-col justify-between border border-[#F66B9A]/15 shadow-sm">
                      <div>
                        <span className="bg-[#ED2C71] text-white text-[9px] font-bold uppercase px-2 py-0.5 rounded-full shadow-sm shadow-[#ED2C71]/10">
                          Recomendado
                        </span>
                        <h4 className="font-black text-gray-900 text-sm mt-2 leading-snug">
                          Packs Comerciales
                        </h4>
                        <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                          Equipá tu local o lanzamiento completo ahorrando hasta un 25% con combos todo-en-uno listos para producir.
                        </p>
                      </div>
                      <Link 
                        href="/productos?mode=combo" 
                        className="mt-4 bg-white border border-[#4576B9]/20 hover:border-[#ED2C71] text-[#ED2C71] hover:bg-[#ED2C71] hover:text-white text-xs font-bold py-2 px-3 rounded-full text-center transition-all shadow-sm"
                      >
                        Explorar Packs
                      </Link>
                    </div>
                  </div>
                </div>
              </li>

              {/* Desktop link: Packs y Combos (Direct Link to combos view) */}
              <li className="h-full flex items-center">
                <Link
                  href="/productos?mode=combo"
                  className={`relative text-lg transition-colors group ${
                    isLinkActive('/productos?mode=combo')
                      ? 'text-[#ED2C71] font-bold'
                      : 'text-[#4576B9] font-semibold hover:text-[#9951A1]'
                  }`}
                >
                  Packs y Combos
                  <span className="pointer-events-none absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-[#ED2C71] to-[#4576B9] transition-all duration-300 group-hover:w-full" />
                </Link>
              </li>

              {/* Desktop link: Por Objetivo (Dropdown) */}
              <li className="relative group h-full flex items-center">
                <button 
                  className={`flex items-center gap-1 text-lg font-semibold transition-colors py-2 ${
                    searchParams.get('mode') === 'objective'
                      ? 'text-[#ED2C71]'
                      : 'text-[#4576B9] hover:text-[#9951A1]'
                  }`}
                >
                  <span>Por Objetivo</span>
                  <ChevronDown size={14} className="transition-transform duration-250 group-hover:rotate-180" />
                </button>
                
                {/* Objectives Dropdown Panel (Flat, Solid, Premium Design) */}
                <div className="absolute top-[100%] left-0 pt-2 w-[280px] hidden group-hover:block z-50">
                  <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-4 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 pb-1.5">
                      ¿Qué necesitás lograr?
                    </p>
                    <div className="space-y-1 max-h-[250px] overflow-y-auto pr-1">
                      <Link 
                        href="/productos?mode=objective" 
                        className="block text-sm font-bold text-gray-800 hover:text-[#ED2C71] p-2 rounded-lg hover:bg-[#FEF1F6] transition-all"
                      >
                        Todos los objetivos
                      </Link>
                      {intentions.map((intent) => (
                        <Link 
                          key={intent.id} 
                          href={`/productos?mode=objective&intent=${intent.slug}`} 
                          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-[#ED2C71] p-2 rounded-lg hover:bg-[#FEF1F6] transition-all"
                        >
                          {intent.icon && <span className="shrink-0 text-base">{intent.icon}</span>}
                          <span className="truncate">{intent.name}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </li>

              {/* Redesigned & Relocated: Crédito ZAP (Secondary pill styled action before user account) */}
              <li className="h-full flex items-center pr-2">
                <Link
                  href="/credito-zap"
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-bold transition-all hover:scale-105 hover:shadow-sm ${
                    isLinkActive('/credito-zap')
                      ? 'bg-[#EEF4FC] border-[#4576B9] text-[#2F5F9F]'
                      : 'bg-gray-50/80 border-gray-200 text-gray-600 hover:border-[#4576B9]/40 hover:bg-[#EEF4FC]/50 hover:text-[#2F5F9F]'
                  }`}
                >
                  <Percent size={13} className="text-[#4576B9]" />
                  <span>Crédito ZAP</span>
                </Link>
              </li>

              {/* User area */}
              <li className="h-full flex items-center">
                {canOpenAdminPanel && (
                  <Link
                    href="/admin"
                    className="mr-2 flex h-10 w-10 items-center justify-center rounded-full border border-[#F66B9A]/25 bg-[#FEF1F6] text-[#C91F5B] transition-colors hover:bg-[#F66B9A]/20"
                    title="Ir al admin"
                  >
                    <LayoutDashboard size={17} />
                  </Link>
                )}

                {canOpenSellerPanel && (
                  <Link
                    href="/seller"
                    className="mr-2 flex h-10 w-10 items-center justify-center rounded-full border border-[#4576B9]/25 bg-[#EEF4FC] text-[#2F5F9F] transition-colors hover:bg-[#4576B9]/15"
                    title="Ir al panel de vendedores"
                  >
                    <Handshake size={17} />
                  </Link>
                )}

                {user ? (
                  <Link
                    href="/perfil"
                    className="flex items-center gap-2.5 pl-2 pr-4 py-1.5 rounded-full border border-gray-200 bg-white hover:border-[#F66B9A]/30 transition-all"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ED2C71] to-[#4576B9] text-white flex items-center justify-center text-sm font-bold shadow-sm">
                      {user.name?.charAt(0) || 'U'}
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-[10px] font-medium text-gray-400 leading-none mb-0.5">Hola,</span>
                      <span className="text-sm font-bold text-gray-900 leading-none">{user.name?.split(' ')[0] || 'Mi cuenta'}</span>
                    </div>
                  </Link>
                ) : (
                  <Link
                    href="/login"
                    className="group relative overflow-hidden bg-gradient-to-r from-[#ED2C71] to-[#4576B9] text-white text-sm font-bold py-2.5 px-6 rounded-full shadow-lg hover:shadow-[#ED2C71]/30 transition-all duration-300 hover:scale-105"
                  >
                    <span className="relative z-10">Ingresar</span>
                  </Link>
                )}
              </li>

              {/* Cart */}
              <li className="h-full flex items-center">
                <Link
                  href="/carrito"
                  className="relative flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition-colors hover:border-[#F66B9A]/30 hover:bg-[#FEF1F6] hover:text-[#ED2C71]"
                  aria-label="Ir al carrito"
                >
                  <ShoppingCart size={20} />
                  {itemCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#ED2C71] text-[11px] font-bold text-white">
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
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#F66B9A]/25 bg-[#FEF1F6] text-[#C91F5B] shadow-sm"
                aria-label="Ir al admin"
              >
                <LayoutDashboard size={18} />
              </Link>
            )}
            {canOpenSellerPanel && (
              <Link
                href="/seller"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#4576B9]/25 bg-[#EEF4FC] text-[#2F5F9F] shadow-sm"
                aria-label="Ir al panel de vendedores"
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
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#ED2C71] text-[9px] font-bold text-white">
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
                className={`absolute block h-0.5 w-6 bg-gradient-to-r from-[#ED2C71] to-[#4576B9] transition-transform duration-300 ${
                  menuOpen ? 'rotate-45 translate-y-0' : '-translate-y-2'
                }`}
              />
              <span
                className={`absolute block h-0.5 w-6 bg-gradient-to-r from-[#ED2C71] to-[#4576B9] transition-opacity duration-300 ${
                  menuOpen ? 'opacity-0' : 'opacity-100'
                }`}
              />
              <span
                className={`absolute block h-0.5 w-6 bg-gradient-to-r from-[#ED2C71] to-[#4576B9] transition-transform duration-300 ${
                  menuOpen ? '-rotate-45 translate-y-0' : 'translate-y-2'
                }`}
              />
            </button>
          </div>
        </div>
      </header>

      {showReferralBanner && referralSeller && (
        <div className="fixed left-0 right-0 top-[70px] z-40 border-y border-[#4576B9]/15 bg-white/95 px-4 py-2 text-center text-xs font-semibold text-gray-600 shadow-sm backdrop-blur">
          Te está asesorando <span className="text-[#ED2C71]">{referralSeller.name || 'un vendedor ZAP'}</span>
          <button
            type="button"
            onClick={() => {
              setLeadOpen(true)
              setLeadSent(false)
              setLeadError(null)
            }}
            className="ml-3 rounded-full bg-[#ED2C71] px-3 py-1 text-[11px] font-bold text-white"
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
        style={{ background: 'linear-gradient(135deg, #ED2C71 0%, #4576B9 100%)' }}
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

            {/* Packs y Combos */}
            <li>
              <Link
                href="/productos?mode=combo"
                onClick={() => setMenuOpen(false)}
                className="block text-xl font-bold hover:opacity-90 active:scale-[0.98] transition-all"
              >
                Packs y Combos
              </Link>
            </li>

            {/* Collapsible: Por Objetivo */}
            <li className="border-b border-white/10 pb-3">
              <button
                onClick={() => setMobileObjOpen(!mobileObjOpen)}
                className="flex items-center justify-between w-full text-xl font-bold hover:opacity-90 active:scale-[0.98] transition-all text-left"
              >
                <span>Por Objetivo</span>
                <ChevronDown size={20} className={`transition-transform duration-300 ${mobileObjOpen ? 'rotate-180' : ''}`} />
              </button>

              <div className={`overflow-hidden transition-all duration-300 ${mobileObjOpen ? 'max-h-[600px] mt-3 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
                <ul className="pl-4 border-l border-white/20 space-y-2.5">
                  <li>
                    <Link
                      href="/productos?mode=objective"
                      onClick={() => setMenuOpen(false)}
                      className="block text-sm font-semibold text-white/90 hover:text-white active:translate-x-1 transition-all py-1"
                    >
                      Todos los objetivos
                    </Link>
                  </li>
                  {intentions.map((intent) => (
                    <li key={intent.id}>
                      <Link
                        href={`/productos?mode=objective&intent=${intent.slug}`}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 text-sm font-medium text-white/80 hover:text-white active:translate-x-1 transition-all py-1"
                      >
                        {intent.icon && <span className="text-base shrink-0">{intent.icon}</span>}
                        <span>{intent.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </li>

            {/* User area */}
            <li className="pt-4 border-t border-white/10">
              {user ? (
                <div className="flex flex-col gap-3">
                  <Link
                    href="/perfil"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-center bg-white text-[#ED2C71] text-base py-2.5 px-6 rounded-full shadow-lg font-bold hover:bg-pink-50 active:scale-[0.98] transition-all"
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
                      Panel Vendedores
                    </Link>
                  )}
                </div>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-center bg-white text-[#ED2C71] text-base font-bold py-3 px-6 rounded-full shadow-lg active:scale-95 transition-all"
                >
                  ⚡ Ingresar a mi cuenta
                </Link>
              )}
            </li>

            {/* Secondary/Relocated Crédito ZAP on mobile (Outlined styled button at bottom) */}
            <li className="pt-6">
              <Link
                href="/credito-zap"
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-center gap-2 border border-white/40 bg-white/10 text-white text-sm font-bold py-2.5 px-6 rounded-full active:scale-95 hover:bg-white/20 transition-all text-center shadow-sm"
              >
                <Percent size={14} className="text-white" />
                <span>Financiación: Crédito ZAP</span>
              </Link>
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
                  Deja tus datos y {referralSeller.name || 'tu vendedor ZAP'} te escribe.
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
