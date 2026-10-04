'use client'

import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronDown } from 'lucide-react'

interface BusinessTypeItem {
  id: string
  name: string
  slug: string
}

interface SituationItem {
  id: string
  name: string
  slug: string
  icon?: string | null
}

export default function HomeHero({
  businessTypes = [],
  situations = [],
}: {
  businessTypes: BusinessTypeItem[]
  situations: SituationItem[]
}) {
  const [selectedRubro, setSelectedRubro] = useState<string>(
    () => businessTypes[0]?.slug ?? 'gastronomia'
  )
  const [selectedSituacion, setSelectedSituacion] = useState<string>(
    () => situations[0]?.slug ?? ''
  )
  const [filteredSituations, setFilteredSituations] = useState<SituationItem[]>(situations)
  const [isRubroOpen, setIsRubroOpen] = useState(false)
  const [isSituacionOpen, setIsSituacionOpen] = useState(false)

  // Re-fetch situations filtered by rubro whenever rubro changes
  useEffect(() => {
    if (!selectedRubro) return
    fetch(`/api/situaciones?rubro=${selectedRubro}`)
      .then((r) => r.json())
      .then((data: SituationItem[]) => {
        setFilteredSituations(data)
        // Reset to first valid situation for this rubro
        if (data.length > 0) {
          setSelectedSituacion(data[0].slug)
        }
      })
      .catch(() => {
        // On error keep current situations
      })
  }, [selectedRubro])

  const heroRef = useRef<HTMLDivElement>(null)
  const situacionBtnRef = useRef<HTMLButtonElement>(null)

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (heroRef.current && !heroRef.current.contains(event.target as Node)) {
        setIsRubroOpen(false)
        setIsSituacionOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Shrink situacion font-size to always fit on one line
  useLayoutEffect(() => {
    const btn = situacionBtnRef.current
    if (!btn) return

    // Force single-line before measuring (critical: without this,
    // scrollWidth returns the widest wrapped line, not the full text width)
    btn.style.fontSize = ''
    btn.style.whiteSpace = 'nowrap'

    const h1 = btn.closest('h1')
    if (!h1) return

    const available = h1.offsetWidth
    const naturalWidth = btn.scrollWidth

    if (naturalWidth > available) {
      const computedSize = parseFloat(window.getComputedStyle(btn).fontSize)
      const ratio = available / naturalWidth
      // 0.9 breathing room so it doesn't touch the edges
      btn.style.fontSize = `${Math.floor(computedSize * ratio * 0.9)}px`
    }
    // Keep nowrap so the scaled text never wraps either
    btn.style.whiteSpace = 'nowrap'
  }, [selectedSituacion])

  const currentRubro = businessTypes.find((b) => b.slug === selectedRubro) || {
    name: 'gastronomía',
    slug: 'gastronomia',
  }
  const currentSituacion = filteredSituations.find((s) => s.slug === selectedSituacion) ||
    filteredSituations[0] || { name: 'estoy por abrir', slug: 'estoy-por-abrir' }

  // Format names to lowercase without trailing punctuation for inline sentence flow
  const formatRubroName = (name: string) => name.toLowerCase()
  const formatSituacionName = (name: string) => name.toLowerCase()

  return (
    <section ref={heroRef} className="relative bg-white pt-10 pb-16 sm:pt-16 sm:pb-24">
      <div className="mx-auto max-w-[1380px] px-4 xl:px-8">
        <div className="max-w-4xl">
          {/* Label */}
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] text-gray-800 mb-6 sm:mb-8">
            TIENDA ZAP
          </p>

          {/* Desktop & Tablet: Inline Interactive Headline */}
          <div className="hidden sm:block">
            <h1 className="text-5xl md:text-6xl lg:text-[76px] font-black tracking-tight text-gray-950 leading-[1.15]">
              <span>Tengo un negocio de </span>
              <span className="relative inline-block align-baseline">
                <button
                  type="button"
                  onClick={() => {
                    setIsRubroOpen(!isRubroOpen)
                    setIsSituacionOpen(false)
                  }}
                  className="border-b-[4px] border-[#ED164F] pb-0.5 inline-flex items-center gap-1.5 cursor-pointer text-gray-950 hover:opacity-85 transition-opacity"
                  aria-expanded={isRubroOpen}
                >
                  <span>{formatRubroName(currentRubro.name)}</span>
                  <ChevronDown
                    size={22}
                    className={`transition-transform duration-200 text-gray-950 ${
                      isRubroOpen ? 'rotate-180' : ''
                    }`}
                    strokeWidth={3}
                  />
                </button>

                {/* Rubro Dropdown Popover */}
                {isRubroOpen && (
                  <div className="absolute top-[calc(100%+8px)] left-0 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 z-50 animate-in fade-in zoom-in-95 duration-150 text-sm font-normal tracking-normal leading-normal" style={{ fontSize: '14px', fontWeight: 400, letterSpacing: 'normal', lineHeight: 1.5 }}>
                    <p className="px-3 py-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      Elegí tu rubro
                    </p>
                    <div className="max-h-64 overflow-y-auto space-y-1">
                      {businessTypes.map((bt) => (
                        <button
                          key={bt.id}
                          type="button"
                          onClick={() => {
                            setSelectedRubro(bt.slug)
                            setIsRubroOpen(false)
                          }}
                          className={`w-full text-left px-3 py-2.5 text-sm rounded-xl transition-colors ${
                            selectedRubro === bt.slug
                              ? 'bg-[#FEF1F5] text-[#ED164F] font-bold'
                              : 'text-gray-800 font-medium hover:bg-gray-50'
                          }`}
                        >
                          {bt.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </span>
              <span> y </span>
              <br />
              <span className="relative inline-block align-baseline">
                <button
                  ref={situacionBtnRef}
                  type="button"
                  onClick={() => {
                    setIsSituacionOpen(!isSituacionOpen)
                    setIsRubroOpen(false)
                  }}
                  className="border-b-[4px] border-[#ED164F] pb-0.5 inline-flex items-center gap-1.5 cursor-pointer text-gray-950 hover:opacity-85 transition-opacity whitespace-nowrap"
                  aria-expanded={isSituacionOpen}
                >
                  <span>{formatSituacionName(currentSituacion.name)}</span>
                  <ChevronDown
                    size={22}
                    className={`transition-transform duration-200 text-gray-950 ${
                      isSituacionOpen ? 'rotate-180' : ''
                    }`}
                    strokeWidth={3}
                  />
                </button>
                <span>.</span>

                {/* Situacion Dropdown Popover */}
                {isSituacionOpen && (
                  <div className="absolute top-[calc(100%+8px)] left-0 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 z-50 animate-in fade-in zoom-in-95 duration-150 text-sm font-normal tracking-normal leading-normal" style={{ fontSize: '14px', fontWeight: 400, letterSpacing: 'normal', lineHeight: 1.5 }}>
                    <p className="px-3 py-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      ¿Qué está pasando?
                    </p>
                    <div className="max-h-64 overflow-y-auto space-y-1">
                      {filteredSituations.map((sit) => (
                        <button
                          key={sit.id}
                          type="button"
                          onClick={() => {
                            setSelectedSituacion(sit.slug)
                            setIsSituacionOpen(false)
                          }}
                          className={`w-full text-left px-3 py-2.5 text-sm rounded-xl transition-colors ${
                            selectedSituacion === sit.slug
                              ? 'bg-[#FEF1F5] text-[#ED164F] font-bold'
                              : 'text-gray-800 font-medium hover:bg-gray-50'
                          }`}
                        >
                          {sit.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </span>
            </h1>
          </div>

          {/* Mobile UI: Clean standard form dropdowns */}
          <div className="sm:hidden space-y-4">
            <h1 className="text-3xl font-black tracking-tight text-gray-950 leading-tight">
              Tengo un negocio de{' '}
              <span className="text-[#ED164F]">{formatRubroName(currentRubro.name)}</span> y{' '}
              <span className="text-[#ED164F]">{formatSituacionName(currentSituacion.name)}</span>.
            </h1>
            <div className="grid gap-3 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Rubro
                </label>
                <select
                  value={selectedRubro}
                  onChange={(e) => setSelectedRubro(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-gray-300 bg-white text-base font-semibold text-gray-900 focus:border-[#ED164F] focus:outline-none"
                >
                  {businessTypes.map((bt) => (
                    <option key={bt.id} value={bt.slug}>
                      {bt.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Situación actual
                </label>
                <select
                  value={selectedSituacion}
                  onChange={(e) => setSelectedSituacion(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-gray-300 bg-white text-base font-semibold text-gray-900 focus:border-[#ED164F] focus:outline-none"
                >
                  {filteredSituations.map((sit) => (
                    <option key={sit.id} value={sit.slug}>
                      {sit.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Subtitle */}
          <p className="mt-8 text-base sm:text-lg text-gray-500 max-w-xl leading-relaxed">
            Elegí tu rubro y qué está pasando. Te mostramos solo lo que tiene sentido para vos.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-wrap items-center gap-6">
            <Link
              href={`/productos?mode=situation&situacion=${selectedSituacion}&rubro=${selectedRubro}`}
              className="inline-flex items-center gap-2 rounded-xl bg-[#ED164F] px-8 py-3.5 text-base font-bold text-white transition-all hover:bg-[#C2103F] active:scale-[0.98] shadow-sm"
            >
              Ver qué me conviene <ArrowRight size={18} />
            </Link>
            <Link
              href="/productos?mode=product"
              className="text-base font-semibold text-gray-950 underline underline-offset-4 hover:text-[#ED164F] transition-colors"
            >
              Ya sé qué necesito
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
