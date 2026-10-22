'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BriefcaseBusiness, CircleUserRound, FileKey2, FolderOpen, House, ReceiptText } from 'lucide-react'

const links = [
  { label: 'Inicio', href: '/perfil', icon: House, active: (path: string) => path === '/perfil' },
  { label: 'Mis servicios', href: '/perfil#servicios', icon: BriefcaseBusiness, active: (path: string) => path.startsWith('/perfil/ordenes') },
  { label: 'Archivos y mensajes', href: '/perfil#archivos', icon: FolderOpen, active: () => false },
  { label: 'Facturación', href: '/perfil/fiscal', icon: ReceiptText, active: (path: string) => path.startsWith('/perfil/fiscal') },
  { label: 'Integraciones', href: '/perfil/integraciones', icon: FileKey2, active: (path: string) => path.startsWith('/perfil/integraciones') },
  { label: 'Mi cuenta', href: '/perfil#cuenta', icon: CircleUserRound, active: (path: string) => path.startsWith('/perfil/creditos') },
]

export default function ClientAreaNav({ filesEnabled }: { filesEnabled: boolean }) {
  const pathname = usePathname()

  return (
    <nav aria-label="Área de clientes" className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 py-2.5 [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden">
        {links.map(({ label, href: baseHref, icon: Icon, active }) => {
          const href = label === 'Archivos y mensajes' && !filesEnabled ? null : baseHref
          const isActive = active(pathname)
          const className = `inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${isActive ? 'bg-[#FEF1F5] text-[#C2103F]' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-950'}`
          const content = <><Icon size={16} /><span>{label}</span>{!href && <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-gray-500">Pronto</span>}</>
          return href
            ? <Link key={label} href={href} aria-current={isActive ? 'page' : undefined} className={className}>{content}</Link>
            : <span key={label} aria-disabled="true" className={`${className} cursor-not-allowed opacity-65`}>{content}</span>
        })}
      </div>
    </nav>
  )
}
