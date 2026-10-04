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
          <p>© {new Date().getFullYear()} ZAP Tienda · Todos los derechos reservados.</p>
        </div>
      </footer>
    )
  }

  return (
    <footer className="relative bg-white py-8 border-t border-gray-100">
      <div className="container mx-auto px-4 text-center">
        <p className="flex items-center justify-center space-x-2 text-sm md:text-base font-medium text-gray-800">
          <span>Hecho con</span>
          <Heart className="w-5 h-5 text-[#ED164F] fill-[#ED164F]" />
          <span>en Parque Leloir</span>
        </p>
        <p className="mt-2 text-xs md:text-sm text-gray-400">
          © {new Date().getFullYear()} - ZAP Agencia Creativa. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  )
}
