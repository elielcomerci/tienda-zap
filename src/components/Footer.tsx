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
  const [isDeleting, setIsDeleting] = useState(false);
  const [lastTypoIndex, setLastTypoIndex] = useState(-1);
  const [typo, setTypo] = useState<{ index: number; character: string; phase: "wrong" | "erase" } | null>(null);

  useEffect(() => {
    const phrase = zapearPhrases[phraseIndex];
    let delay: number;

    if (typo) {
      delay = typo.phase === "wrong"
        ? 260 + Math.random() * 260
        : 85 + Math.random() * 75;

      const typoTimeout = window.setTimeout(() => {
        if (typo.phase === "wrong") {
          setTypo({ ...typo, phase: "erase" });
        } else {
          setTypo(null);
          setTypedLength(typo.index);
        }
      }, delay);

      return () => window.clearTimeout(typoTimeout);
    }

    const previousCharacter = phrase[typedLength - 1] ?? "";

    if (isDeleting) {
      delay = 38 + Math.random() * 48;
      if (previousCharacter === " ") delay += 75 + Math.random() * 95;
    } else if (typedLength === phrase.length) {
      delay = 4800;
    } else if (typedLength === 0) {
      delay = 220 + Math.random() * 220;
    } else {
      delay = 58 + Math.random() * 82;
      if (previousCharacter === " ") delay += 65 + Math.random() * 105;
      if ([",", ";", ":"].includes(previousCharacter)) delay += 240 + Math.random() * 260;
      if ([".", "?", "!"].includes(previousCharacter)) delay += 420 + Math.random() * 420;
      if (Math.random() < 0.045) delay += 180 + Math.random() * 320;
    }

    const timeout = window.setTimeout(() => {
      if (!isDeleting && typedLength < phrase.length) {
        const nextCharacter = phrase[typedLength];
        const rows = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];
        const row = rows.find((keys) => keys.includes(nextCharacter.toLowerCase()));
        const keyIndex = row?.indexOf(nextCharacter.toLowerCase()) ?? -1;
        const neighbors = row && keyIndex >= 0
          ? [row[keyIndex - 1], row[keyIndex + 1]].filter(Boolean)
          : [];

        // Un error ocasional con una tecla vecina, seguido de corrección.
        if (neighbors.length > 0 && typedLength !== lastTypoIndex && Math.random() < 0.018) {
          const wrongCharacter = neighbors[Math.floor(Math.random() * neighbors.length)] ?? nextCharacter;
          setLastTypoIndex(typedLength);
          setTypo({
            index: typedLength,
            character: nextCharacter === nextCharacter.toUpperCase()
              ? wrongCharacter.toUpperCase()
              : wrongCharacter,
            phase: "wrong"
          });
        } else {
          setTypedLength((length) => length + 1);
        }
      } else if (!isDeleting) {
        setIsDeleting(true);
      } else if (typedLength > 0) {
        setTypedLength((length) => length - 1);
      } else {
        setIsDeleting(false);
        setLastTypoIndex(-1);
        setPhraseIndex((current) => (current + 1) % zapearPhrases.length);
      }
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [phraseIndex, typedLength, isDeleting, lastTypoIndex, typo]);

  if (isHome) {
    return (
      <footer className="bg-black py-7 border-t border-white/10 text-gray-500 text-xs text-center">
        <style jsx global>{`@keyframes zapCursorBlink { 50% { opacity: 0; } } .zap-typewriter-cursor { opacity: 1; animation: zapCursorBlink 1s step-end 500ms infinite backwards; } .zap-typewriter-cursor.is-typing { opacity: 1; animation: none; } @media (prefers-reduced-motion: reduce) { .zap-typewriter-cursor { animation: none; opacity: 1; } }`}</style>
        <div className="container mx-auto px-4">
          <p className="mb-2 text-xs font-medium text-gray-300">Hecho con ❤️ en Parque Leloir</p>
          <p key={phraseIndex} className="mb-4 min-h-6 text-sm font-medium leading-6 text-gray-200 transition-opacity duration-700 md:text-base" aria-label={zapearPhrases[phraseIndex]} aria-live="off">
            {typo ? `${zapearPhrases[phraseIndex].slice(0, typo.index)}${typo.character}` : zapearPhrases[phraseIndex].slice(0, typedLength)}<span className={`zap-typewriter-cursor ml-0.5 inline-block ${typedLength < zapearPhrases[phraseIndex].length || isDeleting ? "is-typing" : ""}`} aria-hidden="true">|</span>
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
      <style jsx global>{`@keyframes zapCursorBlink { 50% { opacity: 0; } } .zap-typewriter-cursor { opacity: 1; animation: zapCursorBlink 1s step-end 500ms infinite backwards; } .zap-typewriter-cursor.is-typing { opacity: 1; animation: none; } @media (prefers-reduced-motion: reduce) { .zap-typewriter-cursor { animation: none; opacity: 1; } }`}</style>
      <div className="container mx-auto px-4 text-center">
        <p className="text-sm font-medium text-gray-800 md:text-base">Hecho con ❤️ en Parque Leloir</p>
        <p key={phraseIndex} className="mt-3 mb-4 min-h-6 text-sm font-medium leading-6 text-gray-700 transition-opacity duration-700 md:text-base" aria-live="polite">
          {typo ? `${zapearPhrases[phraseIndex].slice(0, typo.index)}${typo.character}` : zapearPhrases[phraseIndex].slice(0, typedLength)}<span className={`zap-typewriter-cursor ml-0.5 inline-block ${typedLength < zapearPhrases[phraseIndex].length || isDeleting ? "is-typing" : ""}`} aria-hidden="true">|</span>
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
