'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Menu, ShoppingCart, X, Zap } from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'
import { useState } from 'react'

export default function PublicHeader({
  user,
}: {
  user?: { name?: string | null } | null
}) {
  const itemCount = useCartStore((state) => state.itemCount())
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [menuOpen, setMenuOpen] = useState(false)

  const navLinks = [
    { href: '/productos', label: 'Productos' },
    { href: '/productos?cat=cartelearia', label: 'Carteleria' },
    { href: '/productos?cat=banners', label: 'Banners' },
    { href: '/productos?cat=stickers', label: 'Stickers' },
    { href: '/credito-zap', label: 'Credito ZAP' },
  ]

  const isLinkActive = (href: string) => {
    const target = new URL(href, 'https://zap.local')
    if (target.pathname !== pathname) return false

    const targetCat = target.searchParams.get('cat')
    const currentCat = searchParams.get('cat')

    if (targetCat) {
      return currentCat === targetCat
    }

    if (target.pathname === '/productos') {
      return !currentCat
    }

    return true
  }

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-[74px] max-w-[1380px] items-center justify-between gap-4 px-4 xl:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500 shadow-sm shadow-orange-200">
            <Zap size={20} className="text-white" />
          </div>
          <div>
            <p className="text-xl font-black tracking-tight text-gray-950">ZAP</p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              Impresion comercial
            </p>
          </div>
        </Link>

        <nav className="hidden items-center rounded-full border border-gray-200 bg-white p-1 shadow-sm lg:flex">
          {navLinks.map((link) => {
            const active = isLinkActive(link.href)

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                  active
                    ? 'bg-gray-950 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-950'
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <Link
              href="/perfil"
              className="hidden items-center gap-3 rounded-full border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:border-orange-200 hover:text-orange-600 md:flex"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-xs font-bold uppercase text-orange-600">
                {user.name ? user.name.charAt(0) : 'U'}
              </div>
              <div className="text-left leading-tight">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                  Cuenta
                </span>
                <span className="block text-sm text-gray-800">Mi perfil</span>
              </div>
            </Link>
          ) : (
            <Link
              href="/login"
              className="hidden rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:border-orange-200 hover:text-orange-600 md:inline-flex"
            >
              Ingresar
            </Link>
          )}

          <Link
            href="/carrito"
            className="relative flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600"
            aria-label="Ir al carrito"
          >
            <ShoppingCart size={21} />
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[11px] font-bold text-white">
                {itemCount > 9 ? '9+' : itemCount}
              </span>
            )}
          </Link>

          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition-colors hover:bg-gray-50 lg:hidden"
            onClick={() => setMenuOpen((previous) => !previous)}
            aria-label={menuOpen ? 'Cerrar menu' : 'Abrir menu'}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="space-y-1 border-t border-gray-200 bg-white px-4 py-4 lg:hidden">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`block rounded-2xl px-4 py-3 text-sm font-semibold transition-colors ${
                isLinkActive(link.href)
                  ? 'bg-gray-950 text-white'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-orange-600'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  )
}
