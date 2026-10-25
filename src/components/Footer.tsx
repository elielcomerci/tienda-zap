'use client'

import React from 'react'
import { usePathname } from 'next/navigation'

export default function Footer() {
  const pathname = usePathname()
  const isHome = pathname === '/'

  if (isHome) {
    return (
      <footer className="bg-black py-6 border-t border-white/10 text-gray-500 text-xs text-center">
        <div className="container mx-auto px-4">
          <p className="mb-2 text-xs font-medium text-gray-300">Hecho en Parque Leloir</p>
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
        <p className="text-sm font-medium text-gray-800 md:text-base">Hecho en Parque Leloir</p>
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
