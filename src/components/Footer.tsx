'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import FooterStatement from '@/components/FooterStatement'

export default function Footer() {
  const pathname = usePathname()
  const isHome = pathname === '/'

  const legalLinks = (
    <nav aria-label="Información legal" className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
      <a href="/privacidad" className="underline underline-offset-4 transition hover:opacity-100 opacity-70">Política de privacidad</a>
      <a href="/politica-devoluciones" className="underline underline-offset-4 transition hover:opacity-100 opacity-70">Política de devoluciones</a>
    </nav>
  )

  return (
    <footer className={isHome ? "relative z-[60] isolate border-t border-white/10 bg-black text-gray-400" : "relative z-[60] isolate border-t border-gray-100 bg-white text-gray-500"}>
      <div className="container mx-auto px-5 pb-[clamp(6rem,16vw,12rem)] pt-9 md:px-8 md:pt-11">
        <div className="flex w-full flex-col items-center gap-4 text-center">
          <p className={isHome ? "text-sm font-medium text-gray-200" : "text-sm font-medium text-gray-800"}>Hecho con ❤️ en Parque Leloir</p>
        </div>
        <div className={isHome ? "mt-7 flex flex-col items-center gap-3 border-t border-white/10 pt-5 text-center text-gray-400" : "mt-7 flex flex-col items-center gap-3 border-t border-gray-100 pt-5 text-center"}>
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} ZAP Tienda. Todos los derechos reservados.</p>
          <div className={isHome ? "" : "text-gray-500"}>{legalLinks}</div>
        </div>
      </div>
      <div className={isHome ? "" : "[&_.text-gray-100]:!text-gray-900"}>
        <FooterStatement />
      </div>
    </footer>
  )
}
