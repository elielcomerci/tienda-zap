'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Handshake, LayoutDashboard, ShoppingCart } from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'
import { useState, useEffect, useTransition } from 'react'
import { createPublicSellerLead } from '@/lib/actions/leads'

const NAV_HEIGHT = 70

const navLinks = [
  { href: '/productos', label: 'Productos' },
  { href: '/credito-zap', label: 'Crédito ZAP' },
]

export default function PublicHeader({
  user,
  referralSeller,
}: {
  user?: { name?: string | null; role?: string | null } | null
  referralSeller?: { id: string; name?: string | null } | null
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
  const canOpenSellerPanel = user?.role === 'SELLER' || user?.role === 'ADMIN'
  const showReferralBanner = Boolean(referralSeller && !canOpenSellerPanel)

  useEffect(() => { setMounted(true) }, [])

  // Only show cart count after mount to avoid hydration mismatch
  const itemCount = mounted ? rawItemCount : 0

  // Glassmorphism on scroll
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
    if (target.pathname === '/productos') return !currentCat
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
            ? 'bg-white/95 backdrop-blur-xl shadow-lg'
            : 'bg-white/30 backdrop-blur-sm'
        }`}
        style={{ height: `${NAV_HEIGHT}px` }}
      >
        <div className="mx-auto flex items-center justify-between h-full max-w-[1380px] px-4 xl:px-8">
          {/* Logo — same as zap.com.ar */}
          <Link href="/" className="flex items-center h-full py-3" aria-label="Ir al inicio">
            <img
              src="https://res.cloudinary.com/dip14vkem/image/upload/v1756568241/logo_t37blz.png"
              alt="ZAP Logo"
              className="h-full w-auto object-contain"
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center space-x-6 h-full">
            <ul className="flex items-center space-x-6 h-full">
              {navLinks.map((link) => (
                <li key={link.href} className="h-full flex items-center">
                  <Link
                    href={link.href}
                    className={`relative text-lg transition-colors group ${
                      isLinkActive(link.href)
                        ? 'text-[#ED2C71] font-bold'
                        : 'text-[#4576B9] font-semibold hover:text-[#9951A1]'
                    }`}
                  >
                    {link.label}
                    <span className="pointer-events-none absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-[#ED2C71] to-[#4576B9] transition-all duration-300 group-hover:w-full" />
                  </Link>
                </li>
              ))}

              {/* User area */}
              <li className="h-full flex items-center">
                {user?.role === 'ADMIN' && (
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
          Te esta asesorando <span className="text-[#ED2C71]">{referralSeller.name || 'un vendedor ZAP'}</span>
          <button
            type="button"
            onClick={() => {
              setLeadOpen(true)
              setLeadSent(false)
              setLeadError(null)
            }}
            className="ml-3 rounded-full bg-[#ED2C71] px-3 py-1 text-[11px] font-bold text-white"
          >
            Quiero asesoria
          </button>
        </div>
      )}

      {/* Mobile menu — full screen overlay like zap.com.ar */}
      <div
        className={`md:hidden fixed inset-0 z-40 flex flex-col items-center justify-center text-white transition-transform duration-500 ease-in-out ${
          menuOpen ? 'translate-y-0' : '-translate-y-full'
        }`}
        style={{ background: 'linear-gradient(135deg, #ED2C71 0%, #4576B9 100%)' }}
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={() => setMenuOpen(false)}
          className="absolute top-6 right-6 text-white text-3xl leading-none"
          aria-label="Cerrar menú"
        >
          &times;
        </button>

        <ul className="flex flex-col items-center space-y-8 text-center">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="text-2xl font-medium hover:opacity-90 active:scale-95 transition-transform"
              >
                {link.label}
              </Link>
            </li>
          ))}

          <li className="pt-4">
            {user ? (
              <div className="flex flex-col gap-4 items-center">
                <Link
                  href="/perfil"
                  onClick={() => setMenuOpen(false)}
                  className="bg-white text-[#ED2C71] text-xl py-2.5 px-8 rounded-full shadow-lg font-bold"
                >
                  Mi perfil
                </Link>
                {user.role === 'ADMIN' && (
                  <Link
                    href="/admin"
                    onClick={() => setMenuOpen(false)}
                    className="bg-white/20 text-white text-lg py-2 px-8 rounded-full font-bold"
                  >
                    Panel Admin
                  </Link>
                )}
                {canOpenSellerPanel && (
                  <Link
                    href="/seller"
                    onClick={() => setMenuOpen(false)}
                    className="bg-white/20 text-white text-lg py-2 px-8 rounded-full font-bold"
                  >
                    Panel Vendedores
                  </Link>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="bg-white text-[#ED2C71] text-2xl font-semibold py-3 px-8 rounded-full shadow-lg active:scale-95 transition"
              >
                ⚡ Ingresar
              </Link>
            )}
          </li>
        </ul>
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
                  <label className="label">Que necesitas?</label>
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
