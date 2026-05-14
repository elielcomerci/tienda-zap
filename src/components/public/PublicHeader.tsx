'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { LayoutDashboard, Menu, ShoppingCart, X, LogOut } from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'
import { useState, useEffect, useRef } from 'react'

const NAV_HEIGHT = 70

const navLinks = [
  { href: '/productos', label: 'Productos' },
  { href: '/credito-zap', label: 'Crédito ZAP' },
]

export default function PublicHeader({
  user,
}: {
  user?: { name?: string | null; role?: string | null } | null
}) {
  const rawItemCount = useCartStore((state) => state.itemCount())
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [menuOpen, setMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [mounted, setMounted] = useState(false)

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
          <Link href="/" className="flex items-center h-full" aria-label="Ir al inicio">
            <img
              src="https://res.cloudinary.com/dip14vkem/image/upload/v1756568241/logo_t37blz.png"
              alt="ZAP Logo"
              className="h-full w-auto"
              width={NAV_HEIGHT}
              height={NAV_HEIGHT}
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

      {/* Spacer for fixed header */}
      <div style={{ height: `${NAV_HEIGHT}px` }} aria-hidden="true" />
    </>
  )
}
