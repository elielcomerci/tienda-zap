'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  CheckCircle2,
  ImagePlus,
  Maximize2,
  RotateCcw,
  Upload,
  X,
} from 'lucide-react'
import ProductImageGallery from '@/components/public/ProductImageGallery'
import type {
  ApparelMockupConfig,
  ApparelMockupPresetDesign,
  ApparelMockupSide,
} from '@/lib/apparel-mockup'

type ApparelMockupPreviewProps = {
  productName: string
  images: string[]
  selectedImageUrl?: string | null
  selectedOptions: Record<string, string>
  config: ApparelMockupConfig
  onDesignSelectionChange?: (selection: ApparelDesignSelection) => void
}

export type ApparelDesignSelection = {
  mode: 'NO_DESIGN' | 'CUSTOM_FILE' | 'PRESET_DESIGN'
  designName?: string
  designScale?: number
  designAlignment?: ApparelDesignAlignment
  designScales?: Partial<Record<ApparelMockupSide, number>>
  designAlignments?: Partial<Record<ApparelMockupSide, ApparelDesignAlignment>>
  designFile?: File
  designFiles?: Partial<Record<ApparelMockupSide, File>>
  fileUrl?: string
  requiresPrintFile: boolean
}

type CustomDesignState = Partial<Record<ApparelMockupSide, { url: string; file: File }>>
export type ApparelDesignAlignment = 'left' | 'center' | 'right'

function normalize(value?: string | null) {
  return (value || '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function inferSide(selection: string | undefined, fallback: ApparelMockupSide): ApparelMockupSide {
  const value = normalize(selection)
  if (value.includes('espalda') || value.includes('atras') || value.includes('dorso')) return 'back'
  if (value.includes('frente') || value.includes('adelante') || value.includes('pecho')) return 'front'
  return fallback
}

function getSelectedPrintSize(selectedOptions: Record<string, string>) {
  return Object.entries(selectedOptions).find(([name, value]) => {
    const normalizedName = normalize(name)
    const normalizedValue = normalize(value)
    return (
      normalizedName.includes('estampa') ||
      normalizedName.includes('impresion') ||
      normalizedValue.includes('10x10') ||
      normalizedValue.includes('20x25') ||
      normalizedValue.includes('30x40')
    )
  })?.[1]
}

function inferDesignScaleFromPrintSize(printSize?: string) {
  const value = normalize(printSize)
  if (!value || value.includes('sin')) return 100
  if (value.includes('10x10') || value.includes('pecho')) return 45
  if (value.includes('20x25') || value.includes('mediano')) return 72
  if (value.includes('30x40') || value.includes('maximo')) return 100
  return 100
}

export default function ApparelMockupPreview({
  productName,
  images,
  selectedImageUrl,
  selectedOptions,
  config,
  onDesignSelectionChange,
}: ApparelMockupPreviewProps) {
  const [side, setSide] = useState<ApparelMockupSide>(config.defaultSide || 'front')
  const [customDesigns, setCustomDesigns] = useState<CustomDesignState>({})
  const customDesignsRef = useRef<CustomDesignState>({})
  const [designScales, setDesignScales] = useState<Record<ApparelMockupSide, number>>({
    front: 100,
    back: 100,
  })
  const [designAlignments, setDesignAlignments] = useState<Record<ApparelMockupSide, ApparelDesignAlignment>>({
    front: 'center',
    back: 'center',
  })
  const [mode, setMode] = useState<'NO_DESIGN' | 'CUSTOM_FILE' | 'PRESET_DESIGN'>(
    config.allowCustomDesign === false && config.allowPresetDesigns !== false
      ? 'PRESET_DESIGN'
      : 'NO_DESIGN'
  )
  const [selectedPresetId, setSelectedPresetId] = useState('')

  const selectedColorValue = config.colorOptionName
    ? selectedOptions[config.colorOptionName]
    : undefined
  const selectedPrintSize = getSelectedPrintSize(selectedOptions)

  const selectedColor = useMemo(() => {
    if (selectedColorValue) {
      const exact = config.colors.find((color) => normalize(color.value) === normalize(selectedColorValue))
      if (exact) return exact
    }
    return config.colors.find((color) => color.frontImageUrl || color.backImageUrl) || config.colors[0]
  }, [config.colors, selectedColorValue])

  useEffect(() => {
    const inferred = inferSide(
      config.placementOptionName ? selectedOptions[config.placementOptionName] : undefined,
      config.defaultSide || 'front'
    )
    setSide(inferred)
  }, [config.defaultSide, config.placementOptionName, selectedOptions])

  const frontUrl = selectedColor?.frontImageUrl || selectedColor?.backImageUrl || ''
  const backUrl = selectedColor?.backImageUrl || selectedColor?.frontImageUrl || ''
  const baseUrl = side === 'front' ? frontUrl : backUrl
  const activeArea = config.printAreas[side]
  const showSideToggle = Boolean(selectedColor?.frontImageUrl && selectedColor?.backImageUrl)
  const presetDesigns = config.presetDesigns || []
  const selectedPreset = presetDesigns.find((design) => design.id === selectedPresetId) || presetDesigns[0]
  const activeCustomDesign = customDesigns[side]
  const hasCustomDesigns = Boolean(customDesigns.front?.file || customDesigns.back?.file)
  const activeDesignScale = designScales[side]
  const activeDesignAlignment = designAlignments[side]
  const activeDesignUrl =
    mode === 'PRESET_DESIGN'
      ? selectedPreset?.imageUrl || null
      : mode === 'CUSTOM_FILE'
        ? activeCustomDesign?.url || null
        : null

  useEffect(() => {
    if (mode === 'PRESET_DESIGN' && !selectedPresetId && presetDesigns[0]) {
      setSelectedPresetId(presetDesigns[0].id)
    }
  }, [mode, presetDesigns, selectedPresetId])

  useEffect(() => {
    const nextScale = inferDesignScaleFromPrintSize(selectedPrintSize)
    setDesignScales({ front: nextScale, back: nextScale })
  }, [selectedPrintSize])

  useEffect(() => {
    const designFiles: Partial<Record<ApparelMockupSide, File>> = {}
    if (customDesigns.front?.file) designFiles.front = customDesigns.front.file
    if (customDesigns.back?.file) designFiles.back = customDesigns.back.file

    onDesignSelectionChange?.({
      mode,
      designName:
        mode === 'PRESET_DESIGN'
          ? selectedPreset?.name
          : mode === 'CUSTOM_FILE' && hasCustomDesigns
            ? 'Archivo propio'
            : undefined,
      designScale: activeDesignScale,
      designAlignment: activeDesignAlignment,
      designScales,
      designAlignments,
      designFile: mode === 'CUSTOM_FILE' ? customDesigns.front?.file || customDesigns.back?.file : undefined,
      designFiles: mode === 'CUSTOM_FILE' ? designFiles : undefined,
      requiresPrintFile: mode === 'CUSTOM_FILE' && hasCustomDesigns,
    })
  }, [
    customDesigns,
    activeDesignAlignment,
    activeDesignScale,
    designAlignments,
    designScales,
    hasCustomDesigns,
    mode,
    onDesignSelectionChange,
    selectedPreset?.name,
  ])

  useEffect(() => {
    customDesignsRef.current = customDesigns
  }, [customDesigns])

  useEffect(() => {
    return () => {
      Object.values(customDesignsRef.current).forEach((design) => {
        if (design?.url) URL.revokeObjectURL(design.url)
      })
    }
  }, [])

  const handleDesignChange = (targetSide: ApparelMockupSide, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setCustomDesigns((previous) => {
      if (previous[targetSide]?.url) URL.revokeObjectURL(previous[targetSide].url)
      return {
        ...previous,
        [targetSide]: {
          url: URL.createObjectURL(file),
          file,
        },
      }
    })
    event.target.value = ''
  }

  const clearDesign = (targetSide: ApparelMockupSide) => {
    setCustomDesigns((previous) => {
      if (previous[targetSide]?.url) URL.revokeObjectURL(previous[targetSide].url)
      const next = { ...previous }
      delete next[targetSide]
      return next
    })
  }

  const clearAllCustomDesigns = () => {
    setCustomDesigns((previous) => {
      Object.values(previous).forEach((design) => {
        if (design?.url) URL.revokeObjectURL(design.url)
      })
      return {}
    })
  }

  const updateActiveDesignScale = (nextScale: number) => {
    setDesignScales((previous) => ({
      ...previous,
      [side]: nextScale,
    }))
  }

  const updateActiveDesignAlignment = (nextAlignment: ApparelDesignAlignment) => {
    setDesignAlignments((previous) => ({
      ...previous,
      [side]: nextAlignment,
    }))
  }

  if (!baseUrl) {
    return (
      <ProductImageGallery
        images={images}
        productName={productName}
        selectedImageUrl={selectedImageUrl}
      />
    )
  }

  const uploadSides = ['front', 'back'] as const
  const alignmentOptions: Array<{
    value: ApparelDesignAlignment
    icon: typeof AlignLeft
    label: string
  }> = [
    { value: 'left', icon: AlignLeft, label: 'Izquierda' },
    { value: 'center', icon: AlignCenter, label: 'Centro' },
    { value: 'right', icon: AlignRight, label: 'Derecha' },
  ]
  const designAlignmentClass =
    activeDesignAlignment === 'left'
      ? 'justify-start'
      : activeDesignAlignment === 'right'
        ? 'justify-end'
        : 'justify-center'

  return (
    <section className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-[0_24px_70px_-48px_rgba(15,23,42,0.35)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-gray-950">Personaliza tu prenda</p>
          <p className="text-xs font-semibold text-gray-500">
            {side === 'front' ? 'Vista frente' : 'Vista espalda'}
          </p>
        </div>
        {showSideToggle && (
          <div className="grid grid-cols-2 rounded-full border border-gray-200 bg-gray-50 p-1">
            {(['front', 'back'] as const).map((nextSide) => (
              <button
                key={nextSide}
                type="button"
                onClick={() => setSide(nextSide)}
                className={`min-w-24 rounded-full px-3 py-2 text-xs font-black transition ${
                  side === nextSide
                    ? 'bg-gray-950 text-white'
                    : 'text-gray-600 hover:bg-white hover:text-gray-950'
                }`}
              >
                {nextSide === 'front' ? 'Frente' : 'Espalda'}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative aspect-[4/3] max-h-[min(56svh,560px)] min-h-[360px] overflow-hidden bg-[radial-gradient(circle_at_50%_16%,#ffffff_0%,#f3f4f6_58%,#e5e7eb_100%)] sm:min-h-[430px] xl:min-h-[500px]">
        <img
          src={baseUrl}
          alt={`${productName} ${selectedColor?.value || ''}`}
          className="h-full w-full object-contain p-3 sm:p-5"
          loading="eager"
        />

        {activeDesignUrl ? (
          <div
            className={`pointer-events-none absolute flex items-center ${designAlignmentClass}`}
            style={{
              left: `${activeArea.x}%`,
              top: `${activeArea.y}%`,
              width: `${activeArea.width}%`,
              height: `${activeArea.height}%`,
              transform: `rotate(${activeArea.rotate || 0}deg)`,
              opacity: activeArea.opacity ?? 0.92,
              filter: 'drop-shadow(0 10px 18px rgba(15,23,42,0.18))',
            }}
          >
            <img
              src={activeDesignUrl}
              alt=""
              className="max-h-full max-w-full object-contain"
              style={{
                transform: `scale(${activeDesignScale / 100})`,
              }}
              draggable={false}
            />
          </div>
        ) : null}

        {mode === 'CUSTOM_FILE' && (
          <div className="absolute bottom-3 left-3 right-3 grid gap-2 sm:left-4 sm:right-4 sm:grid-cols-2">
            {uploadSides.map((targetSide) => {
              const uploaded = customDesigns[targetSide]
              const isActiveSide = side === targetSide
              return (
                <div
                  key={targetSide}
                  className={`rounded-2xl border bg-white/90 p-2.5 shadow-lg shadow-gray-950/10 backdrop-blur-md transition ${
                    isActiveSide ? 'border-[#ED2C71] ring-2 ring-[#FEF1F6]' : 'border-white/70'
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setSide(targetSide)}
                      className="inline-flex min-w-0 items-center gap-2 text-left"
                    >
                      {uploaded ? (
                        <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
                      ) : (
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-gray-300" />
                      )}
                      <span className="truncate text-sm font-black text-gray-950">
                        {targetSide === 'front' ? 'Frente' : 'Espalda'}
                      </span>
                    </button>
                    {uploaded && (
                      <button
                        type="button"
                        onClick={() => clearDesign(targetSide)}
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-950"
                        aria-label={`Quitar archivo ${targetSide === 'front' ? 'frente' : 'espalda'}`}
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-gray-950 px-3 py-2.5 text-sm font-black text-white transition hover:bg-gray-800">
                    {uploaded ? <ImagePlus size={17} /> : <Upload size={17} />}
                    <span className="min-w-0 truncate">
                      {uploaded ? uploaded.file.name : `Subir ${targetSide === 'front' ? 'frente' : 'espalda'}`}
                    </span>
                    <input
                      type="file"
                      accept="image/png"
                      onChange={(event) => handleDesignChange(targetSide, event)}
                      className="hidden"
                    />
                  </label>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="space-y-3 p-4 sm:p-5">
        <div className={`grid gap-2 ${presetDesigns.length > 0 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
          <button
            type="button"
            onClick={() => setMode('NO_DESIGN')}
            className={`rounded-2xl border px-4 py-3 text-sm font-black transition ${
              mode === 'NO_DESIGN'
                ? 'border-gray-950 bg-gray-950 text-white'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Sin estampa
          </button>
          {config.allowCustomDesign !== false && (
            <button
              type="button"
              onClick={() => setMode('CUSTOM_FILE')}
              className={`rounded-2xl border px-4 py-3 text-sm font-black transition ${
                mode === 'CUSTOM_FILE'
                  ? 'border-gray-950 bg-gray-950 text-white'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Mi archivo
            </button>
          )}
          {config.allowPresetDesigns !== false && presetDesigns.length > 0 && (
            <button
              type="button"
              onClick={() => setMode('PRESET_DESIGN')}
              className={`rounded-2xl border px-4 py-3 text-sm font-black transition ${
                mode === 'PRESET_DESIGN'
                  ? 'border-gray-950 bg-gray-950 text-white'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Disenos listos
            </button>
          )}
        </div>

        {mode === 'CUSTOM_FILE' && hasCustomDesigns && (
          <button
            type="button"
            onClick={clearAllCustomDesigns}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
          >
            <RotateCcw size={17} />
            Limpiar archivos
          </button>
        )}

        {mode === 'PRESET_DESIGN' && presetDesigns.length > 0 && (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {presetDesigns.map((design: ApparelMockupPresetDesign) => {
              const isSelected = selectedPreset?.id === design.id
              return (
                <button
                  key={design.id}
                  type="button"
                  onClick={() => setSelectedPresetId(design.id)}
                  className={`overflow-hidden rounded-2xl border-2 bg-white text-left transition ${
                    isSelected
                      ? 'border-[#ED2C71] ring-4 ring-[#FEF1F6]'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="block aspect-square bg-gray-50">
                    <img src={design.imageUrl} alt={design.name} className="h-full w-full object-contain p-2" />
                  </span>
                  <span className="block truncate px-2 py-2 text-xs font-bold text-gray-700">
                    {design.name}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {activeDesignUrl && (
          <div className="space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-3">
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-gray-600">
                  <Maximize2 size={15} />
                  Escala
                </span>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-gray-700">
                  {activeDesignScale}%
                </span>
              </div>
              <input
                type="range"
                min="35"
                max="120"
                step="5"
                value={activeDesignScale}
                onChange={(event) => updateActiveDesignScale(Number(event.target.value))}
                className="h-2 w-full cursor-pointer accent-[#ED2C71]"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              {alignmentOptions.map((option) => {
                const Icon = option.icon
                const isSelected = activeDesignAlignment === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateActiveDesignAlignment(option.value)}
                    className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-black transition ${
                      isSelected
                        ? 'border-gray-950 bg-gray-950 text-white'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                    aria-label={`Alinear diseno a ${option.label.toLowerCase()}`}
                  >
                    <Icon size={16} />
                    <span className="hidden sm:inline">{option.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
