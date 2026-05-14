import Link from 'next/link'
import PublicHeader from '@/components/public/PublicHeader'
import { auth } from '@/auth'
import { Heart } from 'lucide-react'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <PublicHeader user={session?.user || null} />
      <main className="flex-1">{children}</main>

      {/* Footer — matches zap.com.ar */}
      <footer className="relative bg-white py-8 mt-16">
        <div className="mx-auto max-w-6xl px-4">
          {/* Top section — links */}
          <div className="grid gap-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,0.9fr)] pb-8 border-b border-gray-100">
            <div>
              <Link href="/" className="inline-block">
                <img
                  src="https://res.cloudinary.com/dip14vkem/image/upload/v1756568241/logo_t37blz.png"
                  alt="ZAP Logo"
                  className="h-12 w-auto"
                />
              </Link>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-gray-500">
                Diseño, gráfica y producción para marcas que necesitan verse bien en cada punto de
                contacto.
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-900">Tienda</p>
              <div className="mt-4 flex flex-col gap-3 text-sm">
                <Link href="/productos" className="text-gray-500 transition-colors hover:text-[#ED2C71]">
                  Productos
                </Link>
                <Link href="/carrito" className="text-gray-500 transition-colors hover:text-[#ED2C71]">
                  Carrito
                </Link>
                <Link href="/perfil" className="text-gray-500 transition-colors hover:text-[#ED2C71]">
                  Mi cuenta
                </Link>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-900">
                Crédito ZAP
              </p>
              <div className="mt-4 flex flex-col gap-3 text-sm">
                <Link href="/credito-zap" className="text-gray-500 transition-colors hover:text-[#ED2C71]">
                  Resumen general
                </Link>
                <Link href="/credito-zap#como-funciona" className="text-gray-500 transition-colors hover:text-[#ED2C71]">
                  Cómo funciona
                </Link>
              </div>
            </div>
          </div>

          {/* Bottom — copyright, same as zap.com.ar Footer.tsx */}
          <div className="pt-6 text-center">
            <p className="flex items-center justify-center space-x-2 text-sm font-medium text-gray-600">
              <span>Hecho con</span>
              <Heart className="w-4 h-4 text-red-500" />
              <span>en Mar del Plata</span>
            </p>
            <p className="mt-2 text-xs text-gray-400">
              © {new Date().getFullYear()} ZAP Agencia Creativa. Todos los derechos reservados.
            </p>
          </div>
        </div>

        {/* Subtle gradient accent at bottom — same as zap.com.ar */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#ED2C71]/5 via-[#9951A1]/3 to-transparent pointer-events-none" />
      </footer>
    </div>
  )
}
