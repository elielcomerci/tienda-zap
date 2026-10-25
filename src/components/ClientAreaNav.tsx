'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Bell, BriefcaseBusiness, CircleUserRound, FolderOpen, House, ReceiptText } from 'lucide-react'

const links = [
  { label: 'Inicio', href: '/perfil', icon: House, active: (path: string) => path === '/perfil' },
  { label: 'Mis servicios', href: '/perfil/servicios', icon: BriefcaseBusiness, active: (path: string) => path.startsWith('/perfil/servicios') || path.startsWith('/perfil/ordenes') },
  { label: 'Archivos y mensajes', href: '/perfil/archivos', icon: FolderOpen, active: (path: string) => path.startsWith('/perfil/archivos') },
]
const accountLink = { label: 'Mi cuenta', href: '/perfil/cuenta', icon: CircleUserRound, active: (path: string) => path.startsWith('/perfil/cuenta') || path.startsWith('/perfil/creditos') }

export default function ClientAreaNav({ filesEnabled }: { filesEnabled: boolean }) {
  const pathname = usePathname()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!filesEnabled) return
    let active = true
    const loadUnread = async () => {
      try {
        const response = await fetch('/api/client-works/unread?scope=client', { cache: 'no-store' })
        if (!response.ok) return
        const data = await response.json()
        if (active) setUnread(Number.isInteger(data.unread) ? data.unread : 0)
      } catch { /* The navigation remains usable if the count endpoint is temporarily unavailable. */ }
    }
    void loadUnread()
    window.addEventListener('client-work-unread-refresh', loadUnread)
    const interval = window.setInterval(() => void loadUnread(), 30000)
    return () => { active = false; window.clearInterval(interval); window.removeEventListener('client-work-unread-refresh', loadUnread) }
  }, [filesEnabled])

  return (
    <nav aria-label="Área de clientes" className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 py-2.5 [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden">
        {links.map(({ label, href, icon: Icon, active }) => {
          const isActive = active(pathname)
          const className = `inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${isActive ? 'bg-[#FEF1F5] text-[#C2103F]' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-950'}`
          return <Link key={label} href={href} aria-current={isActive ? 'page' : undefined} className={className}>
            <Icon size={16} /><span>{label}</span>{label === 'Archivos y mensajes' && !filesEnabled && <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-gray-500">En preparación</span>}
          </Link>
        })}
        <Link href="/perfil/nodo" aria-current={pathname.startsWith('/perfil/nodo') ? 'page' : undefined} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${pathname.startsWith('/perfil/nodo') ? 'bg-[#FEF1F5] text-[#C2103F]' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-950'}`}><ReceiptText size={16} />NODO ZAP</Link>
        <Link href={accountLink.href} aria-current={accountLink.active(pathname) ? 'page' : undefined} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${accountLink.active(pathname) ? 'bg-[#FEF1F5] text-[#C2103F]' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-950'}`}><CircleUserRound size={16} /><span>{accountLink.label}</span></Link>
        <Link href="/perfil/archivos" aria-label={unread ? `Mensajes sin leer: ${unread}` : 'Mensajes'} className="relative ml-auto inline-flex shrink-0 items-center justify-center rounded-xl p-2 text-gray-600 transition hover:bg-gray-50 hover:text-gray-950">
          <Bell size={18} />
          {unread > 0 && <span aria-live="polite" className="absolute -right-0.5 -top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-[#ED164F] px-1 text-[10px] font-bold leading-4 text-white">{unread > 99 ? '99+' : unread}</span>}
        </Link>
      </div>
    </nav>
  )
}
