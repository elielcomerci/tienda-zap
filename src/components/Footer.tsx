'use client'

import React, { useEffect, useRef, useState } from 'react'
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
  const [lastTypoIndex, setLastTypoIndex] = useState(-1)
  const [typo, setTypo] = useState<{ index: number; character: string; phase: "wrong" | "erase" } | null>(null)
  const phraseRef = useRef<HTMLParagraphElement>(null)
  const [phraseFontSize, setPhraseFontSize] = useState(16)

  useEffect(() => {
    const element = phraseRef.current
    if (!element) return

    const fitPhrase = () => {
      const width = element.clientWidth
      if (!width) return
      const canvas = document.createElement("canvas")
      const context = canvas.getContext("2d")
      if (!context) return
      const styles = window.getComputedStyle(element)
      const baseSize = 100
      context.font = `600 ${baseSize}px ${styles.fontFamily}`
      const measuredWidth = context.measureText(`${zapearPhrases[phraseIndex]}|`).width - (zapearPhrases[phraseIndex].length + 1) * 4.5
      if (measuredWidth > 0) setPhraseFontSize(Math.max(10, (width / measuredWidth) * baseSize))
    }

    fitPhrase()
    const observer = new ResizeObserver(fitPhrase)
    observer.observe(element)
    return () => observer.disconnect()
  }, [phraseIndex])

  useEffect(() => {
    const phrase = zapearPhrases[phraseIndex]
    let delay: number

    if (typo) {
      delay = typo.phase === "wrong" ? 680 + Math.random() * 220 : 85 + Math.random() * 35
      const typoTimeout = window.setTimeout(() => {
        if (typo.phase === "wrong") setTypo({ ...typo, phase: "erase" })
        else {
          setTypo(null)
          setTypedLength(typo.index)
        }
      }, delay)
      return () => window.clearTimeout(typoTimeout)
    }

    const previousCharacter = phrase[typedLength - 1] ?? ''
    if (isDeleting) delay = 75 + Math.random() * 35
    else if (typedLength === phrase.length) delay = 4800
    else if (typedLength === 0) delay = 220 + Math.random() * 220
    else {
      delay = 58 + Math.random() * 82
      if (previousCharacter === ' ') delay += 65 + Math.random() * 105
      if ([',', ';', ':'].includes(previousCharacter)) delay += 240 + Math.random() * 260
      if (['.', '?', '!'].includes(previousCharacter)) delay += 420 + Math.random() * 420
      if (Math.random() < 0.045) delay += 180 + Math.random() * 320
    }

    const timeout = window.setTimeout(() => {
      if (!isDeleting && typedLength < phrase.length) {
        const nextCharacter = phrase[typedLength]
        const rows = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm']
        const row = rows.find((keys) => keys.includes(nextCharacter.toLowerCase()))
        const keyIndex = row?.indexOf(nextCharacter.toLowerCase()) ?? -1
        const neighbors = row && keyIndex >= 0 ? [row[keyIndex - 1], row[keyIndex + 1]].filter(Boolean) : []
        if (neighbors.length > 0 && typedLength !== lastTypoIndex && Math.random() < 0.018) {
          const wrongCharacter = neighbors[Math.floor(Math.random() * neighbors.length)] ?? nextCharacter
          setLastTypoIndex(typedLength)
          setTypo({
            index: typedLength,
            character: nextCharacter === nextCharacter.toUpperCase() ? wrongCharacter.toUpperCase() : wrongCharacter,
            phase: "wrong"
          })
        } else setTypedLength((length) => length + 1)
      } else if (!isDeleting) setIsDeleting(true)
      else if (typedLength > 0) setTypedLength((length) => length - 1)
      else {
        setIsDeleting(false)
        setLastTypoIndex(-1)
        setPhraseIndex((current) => (current + 1) % zapearPhrases.length)
      }
    }, delay)
    return () => window.clearTimeout(timeout)
  }, [phraseIndex, typedLength, isDeleting, lastTypoIndex, typo])

  const phrase = zapearPhrases[phraseIndex]
  const visiblePhrase = typo
    ? `${phrase.slice(0, typo.index)}${typo.phase === 'wrong' ? typo.character : ''}`
    : phrase.slice(0, typedLength)
  const cursor = <span className={`zap-typewriter-cursor ml-0.5 inline-block ${typedLength < phrase.length || isDeleting ? 'is-typing' : ''}`} aria-hidden="true">|</span>

  const legalLinks = (
    <nav aria-label="Información legal" className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
      <a href="/privacidad" className="underline underline-offset-4 transition hover:opacity-100 opacity-70">Política de privacidad</a>
      <a href="/politica-devoluciones" className="underline underline-offset-4 transition hover:opacity-100 opacity-70">Política de devoluciones</a>
    </nav>
  )

  if (isHome) {
    return (
      <footer className="border-t border-white/10 bg-black text-gray-400">
        <style jsx global>{`@keyframes zapCursorBlink { 50% { opacity: 0; } } .zap-typewriter-cursor { opacity: 1; animation: zapCursorBlink 1s step-end 500ms infinite backwards; } .zap-typewriter-cursor.is-typing { opacity: 1; animation: none; } @media (prefers-reduced-motion: reduce) { .zap-typewriter-cursor { animation: none; opacity: 1; } }`}</style>
        <div className="container mx-auto px-5 py-9 md:px-8 md:py-11">
          <div className="flex w-full flex-col items-center gap-4 text-center">
            <p className="text-sm font-medium text-gray-200">Hecho con ❤️ en Parque Leloir</p>
            <p key={phraseIndex} ref={phraseRef} className="min-h-[1.1em] w-full whitespace-nowrap text-center font-semibold leading-none tracking-[-0.045em] text-gray-100" style={{ fontSize: `${phraseFontSize}px` }} aria-label={phrase} aria-live="off">
              {visiblePhrase}{cursor}
            </p>
          </div>
          <div className="mt-7 flex flex-col items-center gap-3 border-t border-white/10 pt-5 text-center text-gray-400">
            <p className="text-xs">© {new Date().getFullYear()} ZAP Tienda. Todos los derechos reservados.</p>
            {legalLinks}
          </div>
        </div>
      </footer>
    )
  }

  return (
    <footer className="relative border-t border-gray-100 bg-white text-gray-500">
      <style jsx global>{`@keyframes zapCursorBlink { 50% { opacity: 0; } } .zap-typewriter-cursor { opacity: 1; animation: zapCursorBlink 1s step-end 500ms infinite backwards; } .zap-typewriter-cursor.is-typing { opacity: 1; animation: none; } @media (prefers-reduced-motion: reduce) { .zap-typewriter-cursor { animation: none; opacity: 1; } }`}</style>
      <div className="container mx-auto px-5 py-9 md:px-8 md:py-11">
        <div className="flex w-full flex-col items-center gap-4 text-center">
          <p className="text-sm font-medium text-gray-800">Hecho con ❤️ en Parque Leloir</p>
          <p key={phraseIndex} ref={phraseRef} className="min-h-[1.1em] w-full whitespace-nowrap text-center font-semibold leading-none tracking-[-0.045em] text-gray-900" style={{ fontSize: `${phraseFontSize}px` }} aria-label={phrase} aria-live="off">
            {visiblePhrase}{cursor}
          </p>
        </div>
        <div className="mt-7 flex flex-col items-center gap-3 border-t border-gray-100 pt-5 text-center">
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} ZAP Tienda. Todos los derechos reservados.</p>
          <div className="text-gray-500">{legalLinks}</div>
        </div>
      </div>
    </footer>
  )
}
