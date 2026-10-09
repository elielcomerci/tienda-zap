'use client'

import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import Link from 'next/link'
import { buildProductsUrl } from '@/lib/exploration-context'
import { useExplorationContext } from '@/components/public/ExplorationContextProvider'
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
  const { context, ready, setContext } = useExplorationContext()
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

  useEffect(() => {
    if (!ready) return
    if (context.situationSlug) setSelectedSituacion(context.situationSlug)
  }, [ready])

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
        setSelectedSituacion((current) => {
          const candidate = current || context.situationSlug || ''
          return data.some((item) => item.slug === candidate) ? candidate : ''
        })
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

  // Ajusta cada renglón como una unidad: nunca parte frases ni permite desbordes.
  useLayoutEffect(() => {
    const headline = heroRef.current?.querySelector('.home-hero-headline')
    if (!headline) return

    const fitLines = () => {
      const lines = headline.querySelectorAll<HTMLElement>('.home-hero-line')
      lines.forEach((line) => {
        line.style.fontSize = ''
        line.style.whiteSpace = 'nowrap'
        const available = headline.clientWidth
        const naturalWidth = line.scrollWidth
        if (naturalWidth > available) {
          const computedSize = parseFloat(window.getComputedStyle(line).fontSize)
          line.style.fontSize = `${Math.floor(computedSize * (available / naturalWidth) * 0.96)}px`
        }
      })
    }

    fitLines()
    const observer = new ResizeObserver(fitLines)
    observer.observe(headline)
    window.addEventListener('resize', fitLines)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', fitLines)
    }
  }, [selectedSituacion, selectedRubro, visibleSituacionName, visibleRubroName])


  // Format names to lowercase for inline sentence flow
  const formatRubroName = (name: string) => name.toLowerCase()
  const formatSituacionName = (name: string) => name.toLowerCase()

  return (
    <section ref={heroRef} className="relative bg-white pt-10 pb-16 sm:pt-16 sm:pb-24">
      <div className="mx-auto max-w-[1380px] px-4 xl:px-8">
        <div className="max-w-4xl">
          {/* Encabezado en tres líneas fijas en todos los tamaños de pantalla */}
          <h1 className="home-hero-headline text-[clamp(1.4rem,5.5vw,4.75rem)] font-black tracking-tight text-gray-950 leading-[1.08]">
            <span className="home-hero-line block whitespace-nowrap">Tengo un negocio de</span>
            <span className="home-hero-line block whitespace-nowrap">
              <span className="relative inline-block align-baseline">
                <button
                  type="button"
                  onClick={() => {
                    setIsRubroOpen(!isRubroOpen)
                    setIsSituacionOpen(false)
                  }}
                  className="border-b-[3px] sm:border-b-4 border-[#ED164F] pb-0.5 inline-flex items-center gap-1 cursor-pointer text-gray-950 hover:opacity-85 transition-opacity whitespace-nowrap"
                  aria-expanded={isRubroOpen}
                >
                  <span key={visibleRubroName} className="inline-block animate-in fade-in duration-300">
                    {formatRubroName(visibleRubroName)}
                  </span>
                  <ChevronDown size={20} className={`shrink-0 transition-transform duration-200 text-gray-950 ${isRubroOpen ? 'rotate-180' : ''}`} strokeWidth={3} />
                </button>

                {isRubroOpen && (
                  <div className="absolute top-[calc(100%+8px)] left-0 w-72 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 z-50 animate-in fade-in zoom-in-95 duration-150 text-sm font-normal tracking-normal leading-normal" style={{ fontSize: '14px', fontWeight: 400, letterSpacing: 'normal', lineHeight: 1.5 }}>
                    <p className="px-3 py-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Elegí tu rubro</p>
                    <div className="max-h-64 overflow-y-auto space-y-1">
                      {businessTypes.map((bt) => (
                        <button
                          key={bt.id}
                          type="button"
                          onClick={() => {
                            onSelectedRubroChange(bt.slug)
                            setIsRubroOpen(false)
                          }}
                          className={`w-full text-left px-3 py-2.5 text-sm rounded-xl transition-colors ${selectedRubro === bt.slug ? 'bg-[#FEF1F5] text-[#ED164F] font-bold' : 'text-gray-800 font-medium hover:bg-gray-50'}`}
                        >
                          {bt.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </span>{' '}y
            </span>
            <span className="home-hero-line block whitespace-nowrap">
              <span className="relative inline-block align-baseline">
                <button
                  ref={situacionBtnRef}
                  type="button"
                  onClick={() => {
                    if (!selectedRubro) return
                    setIsSituacionOpen(!isSituacionOpen)
                    setIsRubroOpen(false)
                  }}
                  disabled={!selectedRubro || isSituationsLoading}
                  className="border-b-[3px] sm:border-b-4 border-[#ED164F] pb-0.5 inline-flex items-center gap-1 cursor-pointer text-gray-950 hover:opacity-85 transition-opacity whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-70"
                  aria-expanded={isSituacionOpen}
                >
                  <span>{formatSituacionName(visibleSituacionName)}</span>
                  <ChevronDown size={20} className={`shrink-0 transition-transform duration-200 text-gray-950 ${isSituacionOpen ? 'rotate-180' : ''}`} strokeWidth={3} />
                </button>

                {isSituacionOpen && (
                  <div className="absolute top-[calc(100%+8px)] left-0 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 z-50 animate-in fade-in zoom-in-95 duration-150 text-sm font-normal tracking-normal leading-normal" style={{ fontSize: '14px', fontWeight: 400, letterSpacing: 'normal', lineHeight: 1.5 }}>
                    <p className="px-3 py-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">¿Qué está pasando?</p>
                    <div className="max-h-64 overflow-y-auto space-y-1">
                      {filteredSituations.map((sit) => (
                        <button
                          key={sit.id}
                          type="button"
                          onClick={() => {
                            setSelectedSituacion(sit.slug)
                            setContext({ mode: 'situation', businessTypeSlug: selectedRubro, situationSlug: sit.slug, needSlug: undefined })
                            setIsSituacionOpen(false)
                          }}
                          className={`w-full text-left px-3 py-2.5 text-sm rounded-xl transition-colors ${selectedSituacion === sit.slug ? 'bg-[#FEF1F5] text-[#ED164F] font-bold' : 'text-gray-800 font-medium hover:bg-gray-50'}`}
                        >
                          {sit.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </span>
            </span>
          </h1>

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
                Dame ideas <ArrowRight size={18} />
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
