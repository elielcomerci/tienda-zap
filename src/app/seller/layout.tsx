import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Users, ShoppingCart, LogOut, Zap } from 'lucide-react'

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (session?.user?.role !== 'SELLER' && session?.user?.role !== 'ADMIN') {
    redirect('/')
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 flex-col bg-gray-900 text-white hidden md:flex">
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
          <Link
            href="/seller/dashboard"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-all"
          >
            <LayoutDashboard size={18} /> Resumen
          </Link>
          <Link
            href="/seller/clientes"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-all"
          >
            <Users size={18} /> Mis Clientes
          </Link>
          <Link
            href="/seller/ordenes"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-all"
          >
            <ShoppingCart size={18} /> Órdenes
          </Link>
        </nav>

        <div className="border-t border-gray-800 px-3 py-4 space-y-1">
          <Link
            href="/perfil"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-400 transition-all hover:bg-gray-800 hover:text-white"
          >
            Volver a mi perfil
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
