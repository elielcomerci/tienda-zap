"use client";

import { useEffect, useRef, useState } from "react";

const phrases = [
  "Zapear es cuestionar lo obvio.",
  "Zapear es encender lo que ya estaba ahí.",
  "Zapear no cambia todo, cambia lo que importa.",
  "Cada zap da fruto.",
  "Lo simple zapea más que lo complejo.",
  "Zapear es mostrar, no fingir.",
  "Zapear no es tendencia, es coherencia.",
  "Cuando zapeás, tu marca se nota."
];

type Typo = { index: number; character: string; phase: "wrong" | "erase" } | null;

export default function FooterStatement() {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [typedLength, setTypedLength] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [lastTypoIndex, setLastTypoIndex] = useState(-1);
  const [typo, setTypo] = useState<Typo>(null);
  const [fontSize, setFontSize] = useState(16);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const fitPhrase = () => {
      const width = container.clientWidth;
      if (!width) return;
      const context = document.createElement("canvas").getContext("2d");
      if (!context) return;
      const styles = window.getComputedStyle(container);
      const baseSize = 100;
      context.font = `600 ${baseSize}px ${styles.fontFamily}`;
      const phrase = phrases[phraseIndex];
      const measuredWidth = context.measureText(`${phrase}|`).width - (phrase.length + 1) * 4.5;
      if (measuredWidth > 0) setFontSize((width / measuredWidth) * baseSize);
    };
    fitPhrase();
    const observer = new ResizeObserver(fitPhrase);
    observer.observe(container);
    document.fonts?.ready.then(fitPhrase);
    return () => observer.disconnect();
  }, [phraseIndex]);

  useEffect(() => {
    const phrase = phrases[phraseIndex];
    let delay: number;
    if (typo) {
      delay = typo.phase === "wrong" ? 680 + Math.random() * 220 : 85 + Math.random() * 35;
      const timeout = window.setTimeout(() => {
        if (typo.phase === "wrong") setTypo({ ...typo, phase: "erase" });
        else { setTypo(null); setTypedLength(typo.index); }
      }, delay);
      return () => window.clearTimeout(timeout);
    }
    const previousCharacter = phrase[typedLength - 1] ?? "";
    if (isDeleting) delay = 75 + Math.random() * 35;
    else if (typedLength === phrase.length) delay = 4800;
    else if (typedLength === 0) delay = 220 + Math.random() * 220;
    else {
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
        const neighbors = row && keyIndex >= 0 ? [row[keyIndex - 1], row[keyIndex + 1]].filter(Boolean) : [];
        if (neighbors.length > 0 && typedLength !== lastTypoIndex && Math.random() < 0.018) {
          const wrongCharacter = neighbors[Math.floor(Math.random() * neighbors.length)] ?? nextCharacter;
          setLastTypoIndex(typedLength);
          setTypo({ index: typedLength, character: nextCharacter === nextCharacter.toUpperCase() ? wrongCharacter.toUpperCase() : wrongCharacter, phase: "wrong" });
        } else setTypedLength((length) => length + 1);
      } else if (!isDeleting) setIsDeleting(true);
      else if (typedLength > 0) setTypedLength((length) => length - 1);
      else { setIsDeleting(false); setLastTypoIndex(-1); setPhraseIndex((current) => (current + 1) % phrases.length); }
    }, delay);
    return () => window.clearTimeout(timeout);
  }, [phraseIndex, typedLength, isDeleting, lastTypoIndex, typo]);

  const phrase = phrases[phraseIndex];
  const visiblePhrase = typo ? `${phrase.slice(0, typo.index)}${typo.phase === "wrong" ? typo.character : ""}` : phrase.slice(0, typedLength);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex h-[clamp(3.5rem,10vw,8rem)] w-full items-end justify-center overflow-hidden px-5 pb-1 md:px-8" aria-label={phrase}>
      <style jsx global>{`@keyframes zapCursorBlink { 50% { opacity: 0; } } .zap-typewriter-cursor { opacity: 1; animation: zapCursorBlink 1s step-end 500ms infinite backwards; } .zap-typewriter-cursor.is-typing { opacity: 1; animation: none; } @media (prefers-reduced-motion: reduce) { .zap-typewriter-cursor { animation: none; opacity: 1; } }`}</style>
      <p ref={containerRef} className="w-full whitespace-nowrap text-center font-semibold leading-none tracking-[-0.045em] text-gray-100" style={{ fontSize: `${fontSize}px` }} aria-live="off">
        {visiblePhrase}<span className={`zap-typewriter-cursor ml-0.5 inline-block ${typedLength < phrase.length || isDeleting ? "is-typing" : ""}`} aria-hidden="true">|</span>
      </p>
    </div>
  );
}
