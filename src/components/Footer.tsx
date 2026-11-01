'use client'

import React, { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

const zapearPhrases = [
  "Zapear es cuestionar lo obvio.",
  "Zapear es encender lo que ya estaba ahí.",
  "Zapear no cambia todo, cambia lo que importa.",
  "Cada zap da fruto.",
  "Lo simple zapea más que lo complejo.",
  "Zapear es mostrar, no fingir.",
  "Zapear no es tendencia, es coherencia.",
  "Cuando zapeás, tu marca se nota."
]

export default function Footer() {
  const pathname = usePathname()
  const isHome = pathname === '/'
  const [phraseIndex, setPhraseIndex] = useState(0)

  useEffect(() => {
    const interval = window.setInterval(() => {
      setPhraseIndex((current) => (current + 1) % zapearPhrases.length)
    }, 12000)

    return () => window.clearInterval(interval)
  }, [])

  if (isHome) {
    return (
      <footer className="bg-black py-7 border-t border-white/10 text-gray-500 text-xs text-center">
        <div className="container mx-auto px-4">
          <p className="mb-2 text-xs font-medium text-gray-300">Hecho en Parque Leloir</p>
          <p key={phraseIndex} className="mb-4 min-h-6 text-sm font-medium leading-6 text-gray-200 transition-opacity duration-700 md:text-base" aria-live="polite">
            {zapearPhrases[phraseIndex]}
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
        <p className="text-sm font-medium text-gray-800 md:text-base">Hecho en Parque Leloir</p>
        <p key={phraseIndex} className="mt-3 mb-4 min-h-6 text-sm font-medium leading-6 text-gray-700 transition-opacity duration-700 md:text-base" aria-live="polite">
          {zapearPhrases[phraseIndex]}
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
