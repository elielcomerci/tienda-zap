'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ImagePlus, Maximize2, RotateCcw } from 'lucide-react'
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
  designFile?: File
  designFiles?: Partial<Record<ApparelMockupSide, File>>
  fileUrl?: string
  requiresPrintFile: boolean
}

type CustomDesignState = Partial<Record<ApparelMockupSide, { url: string; file: File }>>

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
  const [designScale, setDesignScale] = useState(100)
  const [mode, setMode] = useState<'NO_DESIGN' | 'CUSTOM_FILE' | 'PRESET_DESIGN'>(
    config.allowCustomDesign === false && config.allowPresetDesigns !== false
      ? 'PRESET_DESIGN'
      : 'NO_DESIGN'
  )
  const [selectedPresetId, setSelectedPresetId] = useState('')

  const selectedColorValue = config.colorOptionName
    ? selectedOptions[config.colorOptionName]
    : undefined

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
      designScale,
      designFile: mode === 'CUSTOM_FILE' ? customDesigns.front?.file || customDesigns.back?.file : undefined,
      designFiles: mode === 'CUSTOM_FILE' ? designFiles : undefined,
      requiresPrintFile: mode === 'CUSTOM_FILE' && hasCustomDesigns,
    })
  }, [customDesigns, designScale, hasCustomDesigns, mode, onDesignSelectionChange, selectedPreset?.name])

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

  if (!baseUrl) {
    return (
      <ProductImageGallery
        images={images}
        productName={productName}
        selectedImageUrl={selectedImageUrl}
      />
    )
  }

  return (
    <section className="space-y-4 rounded-[32px] border border-gray-200 bg-white p-3 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.35)] sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div>
          <p className="text-sm font-semibold text-gray-900">Vista de indumentaria</p>
          <p className="text-xs uppercase tracking-[0.16em] text-gray-500">
            Color y estampa en vivo
          </p>
        </div>
        {showSideToggle && (
          <div className="flex rounded-2xl border border-gray-200 bg-gray-50 p-1">
            {(['front', 'back'] as const).map((nextSide) => (
              <button
                key={nextSide}
                type="button"
                onClick={() => setSide(nextSide)}
                className={`rounded-xl px-3 py-1.5 text-xs font-black transition ${
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

      <div className="relative aspect-square overflow-hidden rounded-[28px] border border-gray-100 bg-[radial-gradient(circle_at_50%_16%,#ffffff_0%,#f3f4f6_58%,#e5e7eb_100%)]">
        <img
          src={baseUrl}
          alt={`${productName} ${selectedColor?.value || ''}`}
          className="h-full w-full object-contain"
          loading="eager"
        />

        {activeDesignUrl ? (
          <div
            className="pointer-events-none absolute"
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
              className="h-full w-full object-contain"
              style={{ transform: `scale(${designScale / 100})` }}
              draggable={false}
            />
          </div>
        ) : null}
      </div>

      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="grid gap-2 sm:grid-cols-3">
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
      </div>

      {mode === 'CUSTOM_FILE' && (
        <div className="grid gap-2 sm:grid-cols-2">
          {(['front', 'back'] as const).map((targetSide) => {
            const uploaded = customDesigns[targetSide]
            return (
              <div key={targetSide} className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-black text-gray-900">
                    {targetSide === 'front' ? 'Frente' : 'Espalda'}
                  </p>
                  {uploaded && (
                    <button
                      type="button"
                      onClick={() => clearDesign(targetSide)}
                      className="rounded-full px-2 py-1 text-xs font-bold text-gray-500 transition hover:bg-white hover:text-gray-950"
                    >
                      Quitar
                    </button>
                  )}
                </div>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm font-black text-gray-800 transition hover:border-gray-300 hover:bg-gray-100">
                  <ImagePlus size={18} />
                  <span className="min-w-0 truncate">
                    {uploaded ? uploaded.file.name : `Subir PNG ${targetSide === 'front' ? 'frente' : 'espalda'}`}
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

          {hasCustomDesigns && (
            <button
              type="button"
              onClick={clearAllCustomDesigns}
              className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50 sm:col-span-2"
            >
              <RotateCcw size={17} />
              Limpiar archivos
            </button>
          )}
        </div>
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
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-gray-600">
              <Maximize2 size={15} />
              Escala del diseno
            </span>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-gray-700">
              {designScale}%
            </span>
          </div>
          <input
            type="range"
            min="40"
            max="180"
            step="5"
            value={designScale}
            onChange={(event) => setDesignScale(Number(event.target.value))}
            className="h-2 w-full cursor-pointer accent-[#ED2C71]"
          />
        </div>
      )}
    </section>
  )
}
