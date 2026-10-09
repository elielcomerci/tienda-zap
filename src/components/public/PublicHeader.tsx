'use client'

import Link from 'next/link'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { ChevronDown, Handshake, LayoutDashboard, LogOut, ShoppingCart, X } from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'
import { useState, useEffect, useTransition } from 'react'
import { createPublicSellerLead } from '@/lib/actions/leads'
import { signOut } from 'next-auth/react'
import { buildProductsUrl } from '@/lib/exploration-context'
import { useExplorationContext } from '@/components/public/ExplorationContextProvider'

const NAV_HEIGHT = 70

/** Mismos slugs que ObjectivesSection — editá en un solo lugar */
const FEATURED_SITUATION_SLUGS = [
  'estoy-por-abrir',
  'quiero-vender-mas',
  'quiero-que-mis-clientes-vuelvan',
  'quiero-que-me-encuentren',
  'quiero-renovar-la-marca-o-el-espacio',
  'tengo-un-evento',
]

export default function PublicHeader({
  user,
  referralSeller,
  categories = [],
  intentions = [],
  businessTypes = [],
}: {
  user?: { name?: string | null; role?: string | null } | null
  referralSeller?: { id: string; name?: string | null } | null
  categories?: { id: string; name: string; slug: string }[]
  intentions?: { id: string; name: string; slug: string; icon: string | null; needs?: { id: string; name: string; slug: string }[] }[]
  businessTypes?: { id: string; name: string; slug: string }[]
}) {
  const rawItemCount = useCartStore((state) => state.itemCount())
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isProductArea = pathname === '/productos' || pathname.startsWith('/productos/')
  const { context: explorationContext, setContext, clearContext, ready: contextReady } = useExplorationContext()
  const router = useRouter()
  const currentSituation = intentions.find((item) => item.slug === explorationContext.situationSlug)
  const cartHref = buildProductsUrl(explorationContext).replace(/^\/productos/, '/carrito')
  const [menuOpen, setMenuOpen] = useState(false)
  const [leadOpen, setLeadOpen] = useState(false)
  const [leadError, setLeadError] = useState<string | null>(null)
  const [leadSent, setLeadSent] = useState(false)
  const [isLeadPending, startLeadTransition] = useTransition()
  const [isScrolled, setIsScrolled] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)

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

  // Close open menus on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        setAccountOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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
        className={`sticky w-full top-0 z-50 transition-all duration-300 ${
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
              
              <li className="h-full flex items-center"><Link href={buildProductsUrl({ ...explorationContext, mode: explorationContext.mode || 'rubro' })} className="text-sm font-semibold text-gray-900 hover:text-[#ED164F]">Explorar</Link></li>
              <li className="h-full flex items-center"><a href="https://zap.com.ar" target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-gray-900 hover:text-[#ED164F]">Hablemos</a></li>
              {/* User area */}
              <li className="relative h-full flex items-center">
                {user ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setAccountOpen((open) => !open)}
                      className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 hover:text-[#ED164F] transition-colors"
                      aria-expanded={accountOpen}
                      aria-haspopup="menu"
                    >
                      <span>{user.name?.split(' ')[0] || 'Mi cuenta'}</span>
                      <ChevronDown size={13} className={`transition-transform ${accountOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {accountOpen && (
                      <div className="absolute right-0 top-[calc(100%-4px)] pt-3 w-56 z-50">
                        <div className="rounded-2xl border border-gray-200 bg-white p-2 shadow-xl">
                          <div className="px-3 py-2 border-b border-gray-100 mb-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Mi cuenta</p>
                            <p className="mt-0.5 truncate text-sm font-semibold text-gray-900">{user.name || 'Usuario'}</p>
                          </div>

                          <Link
                            href="/perfil"
                            onClick={() => setAccountOpen(false)}
                            className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-[#FEF1F5] hover:text-[#ED164F] transition-colors"
                          >
                            Mi perfil
                          </Link>

                          {canOpenAdminPanel && (
                            <Link
                              href="/admin"
                              onClick={() => setAccountOpen(false)}
                              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-[#FEF1F5] hover:text-[#ED164F] transition-colors"
                            >
                              <LayoutDashboard size={15} />
                              Panel Admin
                            </Link>
                          )}

                          {canOpenSellerPanel && (
                            <Link
                              href="/seller"
                              onClick={() => setAccountOpen(false)}
                              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-[#EEF4FC] hover:text-[#2F5F9F] transition-colors"
                            >
                              <Handshake size={15} />
                              Panel Asesores
                            </Link>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setAccountOpen(false)
                              void signOut({ callbackUrl: '/' })
                            }}
                            className="mt-1 flex w-full items-center gap-2 rounded-xl border-t border-gray-100 px-3 py-2.5 pt-3 text-left text-sm font-semibold text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                          >
                            <LogOut size={15} />
                            Cerrar sesión
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    href="/login"
                    className="text-sm font-semibold text-gray-900 hover:text-[#ED164F] transition-colors"
                  >
                    Ingresar
                  </Link>
                )}
              </li>

              <li className="h-full flex items-center"><button type="button" onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={menuOpen} className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-700 hover:border-gray-400">{menuOpen ? <X size={18} /> : <span className="text-xl">☰</span>}</button></li>
              {/* Cart */}
              <li className="h-full flex items-center">
                <Link
                  href={cartHref}
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
              href={cartHref}
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

      <div className={'fixed inset-0 z-[60] flex flex-col w-full h-full text-white transition-all duration-300 md:inset-auto md:right-4 md:top-[78px] md:w-[420px] md:h-auto md:max-h-[calc(100vh-96px)] md:rounded-2xl md:shadow-2xl ' + (menuOpen ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none')}
        style={{ background: 'linear-gradient(135deg, #ED164F 0%, #4576B9 100%)' }} role="dialog" aria-modal="true" aria-label="Menú ZAP Tienda">
        <div className="flex items-center justify-between px-6 h-[70px] border-b border-white/10 shrink-0"><span className="text-lg font-bold">ZAP Tienda</span><button type="button" onClick={() => setMenuOpen(false)} className="w-10 h-10 flex items-center justify-center" aria-label="Cerrar menú"><X size={24} /></button></div>
        <div className="flex-1 overflow-y-auto px-6 pt-6 pb-8 md:max-h-[calc(100vh-170px)]"><div className="mx-auto flex max-w-sm flex-col gap-6">
          <nav aria-label="Navegación principal" className="grid gap-4 text-lg font-bold">
            <Link href={buildProductsUrl({ ...explorationContext, mode: 'rubro' })} onClick={() => setMenuOpen(false)}>Explorar soluciones →</Link>
            <Link href={buildProductsUrl({ ...explorationContext, mode: 'product' }, { tipo: undefined, cat: undefined })} onClick={() => setMenuOpen(false)}>Ver todo</Link>
            <a href="https://zap.com.ar" target="_blank" rel="noopener noreferrer" onClick={() => setMenuOpen(false)}>Hablemos ↗</a>
          </nav>
          {contextReady && (explorationContext.businessTypeSlug || explorationContext.situationSlug || explorationContext.needSlug) && <section className="border-t border-white/20 pt-5">
            <div className="mb-3 flex items-start justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Tu negocio</p><p className="mt-1 text-sm font-semibold text-white/90">Ajustá el contexto cuando quieras.</p></div><button type="button" onClick={() => { clearContext(); setMenuOpen(false) }} className="text-xs font-semibold underline underline-offset-2">Empezar de nuevo</button></div>
            <label className="mb-1 block text-xs font-semibold text-white/80" htmlFor="zap-context-rubro">Rubro</label>
            <select id="zap-context-rubro" value={explorationContext.businessTypeSlug || ''} onChange={(event) => setContext({ mode: 'rubro', businessTypeSlug: event.target.value || undefined, situationSlug: undefined, needSlug: undefined })} className="mb-3 w-full rounded-xl border border-white/20 bg-white px-3 py-2.5 text-sm font-semibold text-gray-900"><option value="">Elegir rubro</option>{businessTypes.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}</select>
            <label className="mb-1 block text-xs font-semibold text-white/80" htmlFor="zap-context-situacion">Qué está pasando</label>
            <select id="zap-context-situacion" value={explorationContext.situationSlug || ''} onChange={(event) => setContext({ mode: 'situation', businessTypeSlug: explorationContext.businessTypeSlug, situationSlug: event.target.value || undefined, needSlug: undefined })} className="mb-3 w-full rounded-xl border border-white/20 bg-white px-3 py-2.5 text-sm font-semibold text-gray-900"><option value="">Elegir situación</option>{intentions.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}</select>
            {currentSituation?.needs && currentSituation.needs.length > 0 && <><label className="mb-1 block text-xs font-semibold text-white/80" htmlFor="zap-context-necesidad">Qué necesitás resolver</label><select id="zap-context-necesidad" value={explorationContext.needSlug || ''} onChange={(event) => setContext({ ...explorationContext, needSlug: event.target.value || undefined })} className="w-full rounded-xl border border-white/20 bg-white px-3 py-2.5 text-sm font-semibold text-gray-900"><option value="">Ver todas las necesidades</option>{currentSituation.needs.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}</select></>}
            <Link href={buildProductsUrl({ ...explorationContext, mode: explorationContext.situationSlug ? 'situation' : 'rubro' })} onClick={() => setMenuOpen(false)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#ED164F]">Ver opciones →</Link>
          </section>}
          {!user ? <Link href="/login" onClick={() => setMenuOpen(false)} className="border-t border-white/20 pt-4 text-sm font-semibold">Ingresar a mi cuenta →</Link> : <div className="border-t border-white/20 pt-4 flex flex-col gap-3 text-sm font-semibold"><Link href="/perfil" onClick={() => setMenuOpen(false)}>Mi perfil →</Link>{canOpenAdminPanel && <Link href="/admin" onClick={() => setMenuOpen(false)}>Panel Admin →</Link>}{canOpenSellerPanel && <Link href="/seller" onClick={() => setMenuOpen(false)}>Panel Asesores →</Link>}<button type="button" onClick={() => { setMenuOpen(false); void signOut({ callbackUrl: '/' }) }} className="text-left text-white/80">Cerrar sesión</button></div>}
        </div></div>
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
