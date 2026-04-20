import Link from 'next/link'
import PublicHeader from '@/components/public/PublicHeader'
import { auth } from '@/auth'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <PublicHeader user={session?.user || null} />
      <main className="flex-1">{children}</main>
      <footer className="mt-16 bg-gray-900 py-10 text-gray-400">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,0.9fr)]">
          <div>
            <div className="text-lg font-bold text-white">
              ZAP <span className="text-orange-500">Tienda</span>
            </div>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-gray-400">
              Impresion y grafica para negocios que necesitan resolver rapido y comprar con mas
              claridad.
            </p>
            <p className="mt-4 text-xs text-gray-500">
              (c) {new Date().getFullYear()} ZAP Imprenta. Todos los derechos reservados.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white">Tienda</p>
            <div className="mt-4 flex flex-col gap-3 text-sm">
              <Link href="/productos" className="transition-colors hover:text-white">
                Productos
              </Link>
              <Link href="/carrito" className="transition-colors hover:text-white">
                Carrito
              </Link>
              <Link href="/perfil" className="transition-colors hover:text-white">
                Mi cuenta
              </Link>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white">
              Credito ZAP
            </p>
            <div className="mt-4 flex flex-col gap-3 text-sm">
              <Link href="/credito-zap" className="transition-colors hover:text-white">
                Resumen general
              </Link>
              <Link href="/credito-zap#como-funciona" className="transition-colors hover:text-white">
                Como funciona
              </Link>
              <Link href="/credito-zap#quienes-somos" className="transition-colors hover:text-white">
                Quienes somos
              </Link>
              <Link href="/credito-zap#como-trabajamos" className="transition-colors hover:text-white">
                Como trabajamos
              </Link>
              <Link href="/credito-zap#privacidad" className="transition-colors hover:text-white">
                Privacidad
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
