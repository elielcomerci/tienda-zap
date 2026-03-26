'use client'

import Link from 'next/link'
import { ShoppingCart, Zap, User, Menu, X } from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'
import { useState } from 'react'
import { Session } from 'next-auth'

export default function PublicHeader({ session }: { session: Session | null }) {
  const itemCount = useCartStore((s) => s.itemCount())
  const [menuOpen, setMenuOpen] = useState(false)

  const navLinks = [
    { href: '/productos', label: 'Productos' },
    { href: '/productos?cat=cartelearia', label: 'Cartelería' },
    { href: '/productos?cat=banners', label: 'Banners' },
    { href: '/productos?cat=stickers', label: 'Stickers' },
  ]

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-xl shrink-0">
          <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
            <Zap size={18} className="text-white" />
          </div>
          <span>ZAP</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm text-gray-600 hover:text-orange-500 transition-colors font-medium">
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {session ? (
            session?.user?.role === 'ADMIN' ? (
              <Link href="/admin" className="btn-secondary !py-2 !px-3 !text-xs">Panel admin</Link>
            ) : (
              <Link href="/perfil" className="p-2 rounded-xl hover:bg-orange-50 transition-colors" title="Mi perfil">
                <User size={20} className="text-orange-500" />
              </Link>
            )
          ) : (
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-orange-500 transition-colors">
              Ingresar
            </Link>
          )}

          <Link href="/carrito" className="relative p-2 rounded-xl hover:bg-orange-50 transition-colors">
            <ShoppingCart size={22} className="text-gray-700" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center font-bold">
                {itemCount > 9 ? '9+' : itemCount}
              </span>
            )}
          </Link>

          <button className="md:hidden p-2 rounded-xl hover:bg-gray-100" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <nav className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)}
              className="block py-2 text-sm font-medium text-gray-700 hover:text-orange-500">
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  )
}
