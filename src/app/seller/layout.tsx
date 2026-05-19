import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Users, ShoppingCart, Zap } from 'lucide-react'

const sellerNavItems = [
  { href: '/seller/dashboard', label: 'Resumen', icon: LayoutDashboard },
  { href: '/seller/clientes', label: 'Clientes', icon: Users },
  { href: '/seller/ordenes', label: 'Ordenes', icon: ShoppingCart },
]

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (session?.user?.role !== 'SELLER' && session?.user?.role !== 'ADMIN') {
    redirect('/')
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="hidden w-64 flex-col bg-gray-900 text-white md:flex">
        <div className="flex items-center gap-2.5 border-b border-gray-800 px-6 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ED2C71]">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <span className="font-bold text-white">ZAP</span>{' '}
            <span className="text-sm text-gray-400">Vendedores</span>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {sellerNavItems.map((item) => {
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-all"
              >
                <Icon size={18} /> {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="space-y-1 border-t border-gray-800 px-3 py-4">
          <Link
            href="/perfil"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-400 transition-all hover:bg-gray-800 hover:text-white"
          >
            Volver a mi perfil
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur md:hidden">
          <div className="mb-3 flex items-center justify-between">
            <Link href="/seller/dashboard" className="flex items-center gap-2 font-bold text-gray-900">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ED2C71] text-white">
                <Zap size={18} />
              </span>
              ZAP Vendedores
            </Link>
            <Link href="/perfil" className="text-sm font-semibold text-gray-500">
              Perfil
            </Link>
          </div>
          <nav className="grid grid-cols-3 gap-2">
            {sellerNavItems.map((item) => {
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-xs font-semibold text-gray-700"
                >
                  <Icon size={15} /> {item.label}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  )
}
