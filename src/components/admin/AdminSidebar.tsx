'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Percent,
  ShoppingCart,
  Tag,
  Wallet,
  X,
  Zap,
} from 'lucide-react'
import { useState } from 'react'
import { signOut } from 'next-auth/react'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/productos', label: 'Productos', icon: Package },
  { href: '/admin/categorias', label: 'Categorias', icon: Tag },
  { href: '/admin/ordenes', label: 'Ordenes', icon: ShoppingCart },
  { href: '/admin/creditos', label: 'Creditos', icon: Wallet },
  { href: '/admin/financiacion', label: 'Financiacion', icon: Percent },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href)

  return (
    <>
      <button
        className="fixed left-4 top-4 z-50 rounded-xl bg-white p-2 shadow-md lg:hidden"
        onClick={() => setOpen(!open)}
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-40 flex h-full w-64 flex-col bg-gray-900 text-white transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="flex items-center gap-2.5 border-b border-gray-800 px-6 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <span className="font-bold text-white">ZAP</span>{' '}
            <span className="text-sm text-gray-400">Admin</span>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const active = isActive(item.href, item.exact)

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  active
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="space-y-1 border-t border-gray-800 px-3 py-4">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-400 transition-all hover:bg-gray-800 hover:text-white"
          >
            <Zap size={18} />
            Ver tienda
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-400 transition-all hover:bg-gray-800 hover:text-red-400"
          >
            <LogOut size={18} />
            Cerrar sesion
          </button>
        </div>
      </aside>
    </>
  )
}
