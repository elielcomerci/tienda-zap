import Link from 'next/link'
import { FolderOpen, Home, ReceiptText, UserRound, Wallet, Package } from 'lucide-react'

const sections = [
  { href: '/perfil', label: 'Mi cuenta', icon: Home, key: 'home' },
  { href: '/perfil/ordenes', label: 'Mis pedidos', icon: Package, key: 'orders' },
  { href: '/perfil/trabajos', label: 'Mis trabajos y archivos', icon: FolderOpen, key: 'work' },
  { href: '/perfil/creditos', label: 'Crédito ZAP', icon: Wallet, key: 'credits' },
  { href: '/perfil/facturacion', label: 'Facturación', icon: ReceiptText, key: 'billing' },
  { href: '/perfil/datos', label: 'Mis datos', icon: UserRound, key: 'data' },
]

export default function AccountSectionNav({ active }: { active?: string }) {
  return (
    <nav aria-label="Secciones de mi cuenta" className="flex flex-wrap gap-2">
      {sections.map(({ href, label, icon: Icon, key }) => (
        <Link
          key={key}
          href={href}
          aria-current={active === key ? 'page' : undefined}
          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
            active === key
              ? 'border-[#ED164F] bg-[#FEF1F5] text-[#ED164F]'
              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900'
          }`}
        >
          <Icon size={16} />
          {label}
        </Link>
      ))}
    </nav>
  )
}
