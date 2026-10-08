'use client'

import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import Link from 'next/link'
import { buildProductsUrl } from '@/lib/exploration-context'
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
  selectedRubro,
  onSelectedRubroChange,
}: {
  businessTypes: BusinessTypeItem[]
  situations: SituationItem[]
  selectedRubro: string
  onSelectedRubroChange: (slug: string) => void
}) {
  // No asumimos ningún rubro al entrar. La animación solo demuestra las opciones:
  // el valor real del selector permanece vacío hasta que la persona elige.
  const [selectedSituacion, setSelectedSituacion] = useState<string>('')
  const [demoRubroIndex, setDemoRubroIndex] = useState<number | null>(null)

  useEffect(() => {
    if (businessTypes.length === 0) return

    let index = 0
    let interval: ReturnType<typeof setInterval> | undefined

    const start = setTimeout(() => {
      setDemoRubroIndex(0)

      interval = setInterval(() => {
        index += 1

        if (index >= businessTypes.length) {
          if (interval) clearInterval(interval)
          setDemoRubroIndex(null)
          return
        }

        setDemoRubroIndex(index)
      }, 700)
    }, 350)

    return () => {
      clearTimeout(start)
      if (interval) clearInterval(interval)
    }
  }, [businessTypes])
  const [filteredSituations, setFilteredSituations] = useState<SituationItem[]>(situations)
  const [isSituationsLoading, setIsSituationsLoading] = useState(false)
  const [isRubroOpen, setIsRubroOpen] = useState(false)
  const [isSituacionOpen, setIsSituacionOpen] = useState(false)

  // Re-fetch situations filtered by rubro whenever rubro changes
  useEffect(() => {
    if (!selectedRubro) {
      setFilteredSituations(situations)
      setSelectedSituacion('')
      setIsSituationsLoading(false)
      return
    }

    setSelectedSituacion('')
    setFilteredSituations([])
    setIsSituationsLoading(true)

    const controller = new AbortController()
    fetch(`/api/situaciones?rubro=${encodeURIComponent(selectedRubro)}`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error('No se pudieron cargar las situaciones')
        return r.json()
      })
      .then((data: SituationItem[]) => {
        setFilteredSituations(data)
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === 'AbortError') return
        setFilteredSituations([])
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsSituationsLoading(false)
      })

    return () => controller.abort()
  }, [selectedRubro, situations])

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

  const currentRubro = businessTypes.find((b) => b.slug === selectedRubro)
  const currentSituacion = filteredSituations.find((s) => s.slug === selectedSituacion)

  const demoRubro = demoRubroIndex !== null ? businessTypes[demoRubroIndex] : null

  // El texto animado es solo una demostración. Nunca modifica selectedRubro.
  const visibleRubroName = selectedRubro
    ? currentRubro?.name ?? ''
    : demoRubro?.name ?? 'elegí tu rubro'

  const visibleSituacionName = selectedSituacion
    ? currentSituacion?.name ?? ''
    : 'qué está pasando'

  // Ajusta la situación al ancho disponible y vuelve a medir al cambiar el viewport.
  useLayoutEffect(() => {
    const btn = situacionBtnRef.current
    if (!btn) return

    const fitSituation = () => {
      btn.style.fontSize = ''
      btn.style.whiteSpace = 'nowrap'

      const h1 = btn.closest('h1')
      if (!h1) return

      const available = h1.clientWidth
      const naturalWidth = btn.scrollWidth

      if (naturalWidth > available) {
        const computedSize = parseFloat(window.getComputedStyle(btn).fontSize)
        const ratio = available / naturalWidth
        // Deja un pequeño margen para que el texto no quede pegado al borde.
        btn.style.fontSize = `${Math.floor(computedSize * ratio * 0.9)}px`
      }
    }

    fitSituation()
    window.addEventListener('resize', fitSituation)
    return () => window.removeEventListener('resize', fitSituation)
  }, [selectedSituacion, selectedRubro, visibleSituacionName])

  // Format names to lowercase for inline sentence flow
  const formatRubroName = (name: string) => name.toLowerCase()
  const formatSituacionName = (name: string) => name.toLowerCase()

  return (
    <section ref={heroRef} className="relative bg-white pt-10 pb-16 sm:pt-16 sm:pb-24">
      <div className="mx-auto max-w-[1380px] px-4 xl:px-8">
        <div className="max-w-4xl">
          {/* Desktop & Tablet: Inline Interactive Headline */}
          <div className="hidden sm:block">
            <h1 className="text-[clamp(2.25rem,5.5vw,4.75rem)] font-black tracking-tight text-gray-950 leading-[1.15]">
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
                  <span
                    key={visibleRubroName}
                    className="inline-block animate-in fade-in duration-300"
                  >
                    {formatRubroName(visibleRubroName)}
                  </span>
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
                            onSelectedRubroChange(bt.slug)
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
            </h1>

            <h1 className="text-[clamp(2.25rem,5.5vw,4.75rem)] font-black tracking-tight text-gray-950 leading-[1.15]">
              <span>y </span>
              <br />
              <span className="relative inline-block align-baseline whitespace-nowrap">
                <button
                  ref={situacionBtnRef}
                  type="button"
                  onClick={() => {
                    if (!selectedRubro) return
                    setIsSituacionOpen(!isSituacionOpen)
                    setIsRubroOpen(false)
                  }}
                  disabled={!selectedRubro || isSituationsLoading}
                  className="border-b-[4px] border-[#ED164F] pb-0.5 inline-flex items-center gap-1.5 cursor-pointer text-gray-950 hover:opacity-85 transition-opacity whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-70"
                  aria-expanded={isSituacionOpen}
                >
                  <span>{formatSituacionName(visibleSituacionName)}</span>
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
            <h1 className="text-[clamp(1.75rem,7.2vw,2.25rem)] font-black tracking-tight text-gray-950 leading-tight">
              Tengo un negocio de{' '}
              <span className="text-[#ED164F]">{formatRubroName(visibleRubroName)}</span> y{' '}
              <span className="text-[#ED164F]">{formatSituacionName(visibleSituacionName)}.</span>
            </h1>
            <div className="grid gap-3 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Rubro
                </label>
                <select
                  value={selectedRubro}
                  onChange={(e) => onSelectedRubroChange(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-gray-300 bg-white text-base font-semibold text-gray-900 focus:border-[#ED164F] focus:outline-none"
                >
                  <option value="" disabled>
                    Elegí tu rubro
                  </option>
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
                  disabled={!selectedRubro || isSituationsLoading}
                  className="w-full h-12 px-4 rounded-xl border border-gray-300 bg-white text-base font-semibold text-gray-900 focus:border-[#ED164F] focus:outline-none disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  <option value="" disabled>
                    {!selectedRubro ? 'Primero elegí tu rubro' : isSituationsLoading ? 'Cargando situaciones…' : 'Elegí qué está pasando'}
                  </option>
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
            {selectedRubro && selectedSituacion ? (
              <Link
                href={buildProductsUrl({
                  mode: 'situation',
                  businessTypeSlug: selectedRubro,
                  situationSlug: selectedSituacion,
                })}
                className="inline-flex items-center gap-2 rounded-xl bg-[#ED164F] px-8 py-3.5 text-base font-bold text-white transition-all shadow-sm hover:bg-[#C2103F] active:scale-[0.98]"
              >
                Ver qué me conviene <ArrowRight size={18} />
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="inline-flex items-center gap-2 rounded-xl bg-[#ED164F] px-8 py-3.5 text-base font-bold text-white opacity-40 shadow-sm cursor-not-allowed"
              >
                Ver qué me conviene <ArrowRight size={18} />
              </button>
            )}
            <Link
              href={buildProductsUrl({
                mode: 'product',
                businessTypeSlug: selectedRubro || undefined,
                situationSlug: selectedSituacion || undefined,
              })}
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
