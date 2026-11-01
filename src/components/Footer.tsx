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
  const [typedLength, setTypedLength] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const phrase = zapearPhrases[phraseIndex]
    let delay: number

    if (isDeleting) {
      const previousCharacter = phrase[typedLength - 1] ?? ""
      delay = 42 + ((typedLength * 13 + previousCharacter.charCodeAt(0)) % 28)
      if (previousCharacter === " ") delay += 55
    } else if (typedLength === phrase.length) {
      delay = 4800
    } else {
      const nextCharacter = phrase[typedLength]
      delay = 78 + ((typedLength * 17 + nextCharacter.charCodeAt(0) * 3) % 58)
      if (nextCharacter === " ") delay += 65
      if ([",", ";", ":"].includes(nextCharacter)) delay += 280
      if ([".", "?", "!"].includes(nextCharacter)) delay += 520
    }

    const timeout = window.setTimeout(() => {
      if (!isDeleting && typedLength < phrase.length) {
        setTypedLength((length) => length + 1)
      } else if (!isDeleting) {
        setIsDeleting(true)
      } else if (typedLength > 0) {
        setTypedLength((length) => length - 1)
      } else {
        setIsDeleting(false)
        setPhraseIndex((current) => (current + 1) % zapearPhrases.length)
      }
    }, delay)

    return () => window.clearTimeout(timeout)
  }, [phraseIndex, typedLength, isDeleting])

  if (isHome) {
    return (
      <footer className="bg-black py-7 border-t border-white/10 text-gray-500 text-xs text-center">
        <style jsx global>{`@keyframes zapCursorBlink { 50% { opacity: 0; } } .zap-typewriter-cursor { animation: zapCursorBlink 1s steps(2, start) infinite; }`}</style>
        <div className="container mx-auto px-4">
          <p className="mb-2 text-xs font-medium text-gray-300">Hecho con ❤️ en Parque Leloir</p>
          <p key={phraseIndex} className="mb-4 min-h-6 text-sm font-medium leading-6 text-gray-200 transition-opacity duration-700 md:text-base" aria-label={zapearPhrases[phraseIndex]} aria-live="off">
            {zapearPhrases[phraseIndex].slice(0, typedLength)}<span className="zap-typewriter-cursor ml-0.5 inline-block" aria-hidden="true">|</span>
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
      <style jsx global>{`@keyframes zapCursorBlink { 50% { opacity: 0; } } .zap-typewriter-cursor { animation: zapCursorBlink 1s steps(2, start) infinite; }`}</style>
      <div className="container mx-auto px-4 text-center">
        <p className="text-sm font-medium text-gray-800 md:text-base">Hecho con ❤️ en Parque Leloir</p>
        <p key={phraseIndex} className="mt-3 mb-4 min-h-6 text-sm font-medium leading-6 text-gray-700 transition-opacity duration-700 md:text-base" aria-live="polite">
          {zapearPhrases[phraseIndex].slice(0, typedLength)}<span className="zap-typewriter-cursor ml-0.5 inline-block" aria-hidden="true">|</span>
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
