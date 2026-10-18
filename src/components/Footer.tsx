'use client'

import React from 'react'
import { Heart } from 'lucide-react'
import { usePathname } from 'next/navigation'

export default function Footer() {
  const pathname = usePathname()
  const isHome = pathname === '/'

  if (isHome) {
    return (
      <footer className="bg-black py-6 border-t border-white/10 text-gray-500 text-xs text-center">
        <div className="container mx-auto px-4">
          <p className="mb-2 flex items-center justify-center gap-2 text-xs font-medium text-gray-300">
            <span>Hecho con</span>
            <Heart aria-hidden="true" className="h-4 w-4 shrink-0 fill-[#ED164F] text-[#ED164F]" />
            <span>en Parque Leloir</span>
          </p>
          <p>© {new Date().getFullYear()} ZAP Tienda · Todos los derechos reservados.</p>
          <p className="mt-3">
            <a href="/politica-devoluciones" className="underline underline-offset-4 hover:text-white">Política de devoluciones</a>
          </p>
        </div>
      </footer>
    )
  }

  return (
    <footer className="relative bg-white py-8 border-t border-gray-100">
      <div className="container mx-auto px-4 text-center">
        <p className="flex items-center justify-center gap-2 text-sm md:text-base font-medium text-gray-800">
          <span>Hecho con</span>
          <Heart aria-hidden="true" className="h-5 w-5 shrink-0 fill-[#ED164F] text-[#ED164F]" />
          <span>en Parque Leloir</span>
        </p>
        <p className="mt-2 text-xs md:text-sm text-gray-400">
          © {new Date().getFullYear()} - ZAP Agencia Creativa. Todos los derechos reservados.
        </p>
        <p className="mt-3 text-xs text-gray-500">
          <a href="/politica-devoluciones" className="underline underline-offset-4 hover:text-gray-800">Política de devoluciones</a>
        </p>
      </div>
    </footer>
  )
}
