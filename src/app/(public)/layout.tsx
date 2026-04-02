import Link from 'next/link'
import PublicHeader from '@/components/public/PublicHeader'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <footer className="bg-gray-900 text-gray-400 py-10 mt-16">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-white font-bold text-lg">ZAP <span className="text-orange-500">Tienda</span></div>
          <p className="text-sm">© {new Date().getFullYear()} ZAP Imprenta. Todos los derechos reservados.</p>
          <div className="flex gap-4 text-sm">
            <Link href="/productos" className="hover:text-white transition-colors">Productos</Link>
            <Link href="/carrito" className="hover:text-white transition-colors">Carrito</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
