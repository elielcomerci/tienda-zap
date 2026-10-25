'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ContactRound, FileCheck2, FilePlus2, Gauge, KeyRound, Settings2, Wrench } from 'lucide-react'

const links = [
  { label: 'Resumen', href: '/perfil/nodo', icon: Gauge, exact: true },
  { label: 'Emitir', href: '/perfil/nodo/emitir', icon: FilePlus2 },
  { label: 'Comprobantes', href: '/perfil/nodo/comprobantes', icon: FileCheck2 },
  { label: 'Clientes y productos', href: '/perfil/nodo/clientes', icon: ContactRound },
  { label: 'Integraciones', href: '/perfil/nodo/integraciones', icon: KeyRound },
  { label: 'Herramientas', href: '/perfil/nodo/herramientas', icon: Wrench },
  { label: 'Configuración', href: '/perfil/nodo/configuracion', icon: Settings2 },
]

export default function NodoNav() {
  const pathname = usePathname()

  return (
    <nav aria-label="Navegación de NODO ZAP" className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-3 py-2 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {links.map(({ label, href, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${active ? 'bg-[#FEF1F5] text-[#C2103F]' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-950'}`}
            >
              <Icon size={16} />{label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
