'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Calculator, Plus, Trash2 } from 'lucide-react'
import { getQuoterData } from '@/app/admin/cotizador/actions'
import { calculateNesting, calculateQuote } from '@/lib/pricing/nesting'

type QuoterData = Awaited<ReturnType<typeof getQuoterData>>
type RawMaterial = QuoterData['materials'][number]

const STORAGE_KEY = 'quoter_last_config'

const roundPsychological = (price: number) => {
  if (price < 100) return Math.ceil(price / 10) * 10
  const rounded = Math.ceil(price / 100) * 100 - 10
  return rounded < price ? rounded + 100 : rounded
}

// Parse material name into base name + side key
// "Papel Ilustración 350g (4/0 - Frente)" → { base: "Papel Ilustración 350g", side: "4/0" }
// "Vinilo Autoadhesivo" → { base: "Vinilo Autoadhesivo", side: null }
function parseMaterialName(name: string): { base: string; side: '4/0' | '4/4' | null } {
  const match = name.match(/^(.+?)\s*\((4\/[04])[^)]*\)/)
  if (match) {
    return { base: match[1].trim(), side: match[2] as '4/0' | '4/4' }
  }
  return { base: name, side: null }
}

interface MaterialGroup {
  base: string
  single?: RawMaterial   // 4/0 or no-side
  double?: RawMaterial   // 4/4
  noSide?: RawMaterial   // vinilo etc
}

function groupMaterials(materials: RawMaterial[]): MaterialGroup[] {
  const groups: Record<string, MaterialGroup> = {}
  for (const m of materials) {
    const { base, side } = parseMaterialName(m.name)
    if (!groups[base]) groups[base] = { base }
    if (side === '4/0') groups[base].single = m
    else if (side === '4/4') groups[base].double = m
    else groups[base].noSide = m
  }
  return Object.values(groups)
}

// What the user selects per group
type SideSelection = { single: boolean; double: boolean; noSide: boolean }

interface SavedConfig {
  itemWidth: number
  itemHeight: number
  margin: number
  bleed: number
  maxMarginPercent: number
  minMarginPercent: number
  quantities: number[]
  selectedFinishingIds: string[]
  combineFinishings: boolean
  includeNoFinishing: boolean
  // material selections: base name → sides chosen
  materialSelections: Record<string, SideSelection>
}

function loadSavedConfig(): Partial<SavedConfig> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveConfig(config: SavedConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch {}
}

export default function ProductQuoterModal({
  isOpen,
  onClose,
  onApplyVariants,
}: {
  isOpen: boolean
  onClose: () => void
  onApplyVariants: (variants: { options: Record<string, string>; price: number }[]) => void
}) {
  const [data, setData] = useState<QuoterData | null>(null)
  const [loading, setLoading] = useState(true)

  // Config state – all initialized from localStorage
  const [itemWidth, setItemWidth] = useState(9)
  const [itemHeight, setItemHeight] = useState(5)
  const [margin, setMargin] = useState(1)
  const [bleed, setBleed] = useState(0.2)
  const [maxMarginPercent, setMaxMarginPercent] = useState(218)
  const [minMarginPercent, setMinMarginPercent] = useState(100)
  // Fixed catalog quantities — must match the product's Cantidad option values
  const PRESET_QUANTITIES = [1, 5, 10, 15, 20, 30, 50, 100, 200, 500, 1000, 2000, 5000]
  const [quantities, setQuantities] = useState<number[]>([100, 500, 1000])
  const [selectedFinishingIds, setSelectedFinishingIds] = useState<string[]>([])
  const [combineFinishings, setCombineFinishings] = useState(false)
  const [includeNoFinishing, setIncludeNoFinishing] = useState(true)
  // keyed by group.base
  const [materialSelections, setMaterialSelections] = useState<Record<string, SideSelection>>({})

  // Load data + restore saved config
  useEffect(() => {
    if (!isOpen) return
    const saved = loadSavedConfig()
    if (saved.itemWidth !== undefined) setItemWidth(saved.itemWidth)
    if (saved.itemHeight !== undefined) setItemHeight(saved.itemHeight)
    if (saved.margin !== undefined) setMargin(saved.margin)
    if (saved.bleed !== undefined) setBleed(saved.bleed)
    if (saved.maxMarginPercent !== undefined) setMaxMarginPercent(saved.maxMarginPercent)
    if (saved.minMarginPercent !== undefined) setMinMarginPercent(saved.minMarginPercent)
    if (saved.quantities?.length) setQuantities(saved.quantities)
    if (saved.selectedFinishingIds) setSelectedFinishingIds(saved.selectedFinishingIds)
    if (saved.combineFinishings !== undefined) setCombineFinishings(saved.combineFinishings)
    if (saved.includeNoFinishing !== undefined) setIncludeNoFinishing(saved.includeNoFinishing)
    if (saved.materialSelections) setMaterialSelections(saved.materialSelections)

    if (!data) {
      getQuoterData().then(d => {
        setData(d)
        setLoading(false)
        // If no saved selection, default: first group, single side
        if (!saved.materialSelections) {
          const groups = groupMaterials(d.materials)
          if (groups.length > 0) {
            const first = groups[0]
            setMaterialSelections({
              [first.base]: { single: !!first.single || !!first.noSide, double: false, noSide: !!first.noSide }
            })
          }
        }
      })
    }
  }, [isOpen])

  const persistConfig = useCallback(() => {
    saveConfig({
      itemWidth, itemHeight, margin, bleed,
      maxMarginPercent, minMarginPercent, quantities,
      selectedFinishingIds, combineFinishings, includeNoFinishing,
      materialSelections,
    })
  }, [itemWidth, itemHeight, margin, bleed, maxMarginPercent, minMarginPercent,
      quantities, selectedFinishingIds, combineFinishings, includeNoFinishing, materialSelections])

  if (!isOpen) return null

  if (loading || !data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm">
        <div className="rounded-2xl bg-white p-8">Cargando datos del cotizador...</div>
      </div>
    )
  }

  const groups = groupMaterials(data.materials)
  const finishings = data.finishings.filter(f => selectedFinishingIds.includes(f.id))

  // Resolve which actual material objects are selected
  const selectedMaterials: RawMaterial[] = []
  for (const group of groups) {
    const sel = materialSelections[group.base]
    if (!sel) continue
    if (sel.single && group.single) selectedMaterials.push(group.single)
    if (sel.double && group.double) selectedMaterials.push(group.double)
    if (sel.noSide && group.noSide) selectedMaterials.push(group.noSide)
  }

  // Finishing combos
  let finishingsOptions = combineFinishings && finishings.length > 0
    ? [finishings]
    : finishings.map(f => [f])

  if (includeNoFinishing || finishingsOptions.length === 0) {
    if (!finishingsOptions.some(arr => arr.length === 0)) {
      finishingsOptions.unshift([])
    }
  }

  // Build matrix
  const validQuantities = quantities.filter(q => q > 0)
  const minQty = validQuantities.length > 0 ? Math.min(...validQuantities) : 1
  const maxQty = validQuantities.length > 0 ? Math.max(...validQuantities) : 1

  const matrix = selectedMaterials.flatMap(material => {
    const nestingResult = calculateNesting({
      sheetWidth: material.width,
      sheetHeight: material.height,
      itemWidth, itemHeight, margin, bleed,
    })
    if (nestingResult.itemsPerSheet <= 0) return []

    return finishingsOptions.flatMap(finishingCombo => {
      const terminacionesText = finishingCombo.length > 0
        ? finishingCombo.map(f => f.name).join(' + ')
        : 'Sin terminaciones'

      return quantities.slice().sort((a, b) => a - b).map(qty => {
        const sheetsNeeded = Math.ceil(qty / nestingResult.itemsPerSheet)
        const tier = material.tiers.find(t =>
          sheetsNeeded >= t.minQty && (!t.maxQty || sheetsNeeded <= t.maxQty)
        )
        const rawMaterialUnitPrice = tier
          ? tier.unitPrice
          : (material.tiers[material.tiers.length - 1]?.unitPrice || 0)

        const progress = maxQty === minQty ? 0 : Math.log(qty / minQty) / Math.log(maxQty / minQty)
        const currentMargin = maxMarginPercent - progress * (maxMarginPercent - minMarginPercent)

        try {
          const quote = calculateQuote({
            quantity: qty,
            itemsPerSheet: nestingResult.itemsPerSheet,
            rawMaterialUnitPrice,
            finishings: finishingCombo.map(f => ({ costType: f.costType, tiers: f.tiers })),
            profitMarginPercent: currentMargin,
          })
          return { material, qty, terminacionesText, ...quote, itemsPerSheet: nestingResult.itemsPerSheet }
        } catch {
          return null
        }
      })
    })
  }).filter(Boolean)

  const handleApply = () => {
    persistConfig()
    const validVariants = matrix.map(m => ({
      options: {
        'Sustrato': m!.material.name,
        'Medida': `${itemWidth}x${itemHeight} cm`,
        'Terminaciones': m!.terminacionesText,
        'Cantidad': `${m!.qty}`,
      },
      price: roundPsychological(m!.totalPrice),
    }))
    onApplyVariants(validVariants)
    onClose()
  }

  const toggleSide = (base: string, side: keyof SideSelection) => {
    setMaterialSelections(prev => {
      const cur = prev[base] ?? { single: false, double: false, noSide: false }
      return { ...prev, [base]: { ...cur, [side]: !cur[side] } }
    })
  }

  const toggleFinishing = (id: string) => {
    setSelectedFinishingIds(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    )
  }

  // quantities are toggled via PRESET_QUANTITIES checkboxes, no free-form needed

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <Calculator className="text-orange-500" size={20} />
            Cotizador Inteligente
            <span className="ml-2 text-xs font-normal text-gray-400">{matrix.length} combinaciones</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:bg-gray-100 rounded-lg p-2">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── LEFT COLUMN ── */}
          <div className="space-y-5">

            {/* MATERIALES */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-3">Sustratos</h3>
              <div className="space-y-1">
                {groups.map(group => {
                  const sel = materialSelections[group.base] ?? { single: false, double: false, noSide: false }
                  const hasSides = !!(group.single || group.double)
                  return (
                    <div key={group.base} className="flex items-center gap-3 rounded-xl border border-gray-100 px-3 py-2.5 hover:bg-gray-50">
                      <span className="flex-1 text-sm font-medium text-gray-800 truncate">{group.base}</span>
                      {hasSides ? (
                        <div className="flex gap-3">
                          {group.single && (
                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={sel.single}
                                onChange={() => toggleSide(group.base, 'single')}
                                className="w-3.5 h-3.5 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                              />
                              <span className="text-xs text-gray-600 whitespace-nowrap">Solo Frente</span>
                            </label>
                          )}
                          {group.double && (
                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={sel.double}
                                onChange={() => toggleSide(group.base, 'double')}
                                className="w-3.5 h-3.5 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                              />
                              <span className="text-xs text-gray-600 whitespace-nowrap">Doble Faz</span>
                            </label>
                          )}
                        </div>
                      ) : (
                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={sel.noSide}
                            onChange={() => toggleSide(group.base, 'noSide')}
                            className="w-3.5 h-3.5 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                          />
                          <span className="text-xs text-gray-500">Seleccionar</span>
                        </label>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* MEDIDAS */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-3">Medidas de la pieza</h3>
              <div className="grid grid-cols-2 gap-3">
                {([
                  ['Ancho (cm)', itemWidth, setItemWidth],
                  ['Alto (cm)', itemHeight, setItemHeight],
                  ['Bleed (cm)', bleed, setBleed],
                  ['Pinza (cm)', margin, setMargin],
                ] as [string, number, (v: number) => void][]).map(([label, val, setter]) => (
                  <div key={label}>
                    <label className="mb-1 block text-xs font-semibold text-gray-500">{label}</label>
                    <input
                      type="number" step="0.1" value={val}
                      onChange={e => setter(Number(e.target.value))}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-orange-400"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* TERMINACIONES */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-gray-900">Terminaciones</h3>
                <span className="text-xs text-gray-400">{selectedFinishingIds.length} elegidas</span>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 mb-3 space-y-2 text-sm text-gray-700">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={includeNoFinishing} onChange={e => setIncludeNoFinishing(e.target.checked)}
                    className="rounded border-gray-300 text-orange-500 focus:ring-orange-500" />
                  Generar variante sin terminaciones
                </label>
                {selectedFinishingIds.length > 1 && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={combineFinishings} onChange={e => setCombineFinishings(e.target.checked)}
                      className="rounded border-gray-300 text-orange-500 focus:ring-orange-500" />
                    Combinar todas en una sola variante
                  </label>
                )}
              </div>

              <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                {data.finishings.map(f => (
                  <label key={f.id} className="flex items-center gap-3 rounded-xl border border-gray-100 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" checked={selectedFinishingIds.includes(f.id)}
                      onChange={() => toggleFinishing(f.id)}
                      className="w-3.5 h-3.5 rounded border-gray-300 text-orange-500 focus:ring-orange-500" />
                    <span className="text-sm text-gray-800 flex-1">{f.name}</span>
                    <span className="text-xs text-gray-400">{f.costType}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* MARGENES */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-3">Margen de ganancia (curva logarítmica)</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-500">Tope — mín cantidad</label>
                  <div className="flex overflow-hidden rounded-xl border border-gray-200 focus-within:border-orange-400">
                    <input type="number" value={maxMarginPercent}
                      onChange={e => setMaxMarginPercent(Number(e.target.value))}
                      className="w-full bg-gray-50 px-3 py-2 text-sm outline-none" />
                    <span className="bg-gray-100 px-3 py-2 text-sm text-gray-500 border-l border-gray-200">%</span>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-500">Base — máx cantidad</label>
                  <div className="flex overflow-hidden rounded-xl border border-gray-200 focus-within:border-orange-400">
                    <input type="number" value={minMarginPercent}
                      onChange={e => setMinMarginPercent(Number(e.target.value))}
                      className="w-full bg-gray-50 px-3 py-2 text-sm outline-none" />
                    <span className="bg-gray-100 px-3 py-2 text-sm text-gray-500 border-l border-gray-200">%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="flex flex-col gap-5">
            {/* CANTIDADES */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-3">Cantidades a cotizar</h3>
              <p className="text-xs text-gray-400 mb-3">Seleccioná las que coincidan con las variantes del producto.</p>
              <div className="grid grid-cols-4 gap-2">
                {PRESET_QUANTITIES.map(q => (
                  <label
                    key={q}
                    className={`flex items-center justify-center rounded-xl border-2 py-2 cursor-pointer text-sm font-semibold transition-all select-none ${
                      quantities.includes(q)
                        ? 'border-orange-400 bg-orange-50 text-orange-800'
                        : 'border-gray-200 bg-white text-gray-500 hover:border-orange-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={quantities.includes(q)}
                      onChange={() =>
                        setQuantities(prev =>
                          prev.includes(q) ? prev.filter(x => x !== q) : [...prev, q]
                        )
                      }
                    />
                    {q}
                  </label>
                ))}
              </div>
            </div>

            {/* PREVIEW TABLE */}
            <div className="flex-1 bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Preview de precios</span>
                <span className="text-xs text-gray-400">{matrix.length} variantes</span>
              </div>
              <div className="overflow-y-auto max-h-80">
                {matrix.length === 0 ? (
                  <div className="py-10 text-center text-sm text-gray-400">
                    Seleccioná al menos un material para ver precios.
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-100">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs text-gray-500 font-semibold">Sustrato</th>
                        <th className="text-left px-3 py-2 text-xs text-gray-500 font-semibold">Terminación</th>
                        <th className="text-right px-3 py-2 text-xs text-gray-500 font-semibold">Cant.</th>
                        <th className="text-right px-3 py-2 text-xs text-gray-500 font-semibold">Total</th>
                        <th className="text-right px-3 py-2 text-xs text-gray-500 font-semibold">Unit.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matrix.map((m, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                          <td className="px-3 py-2 text-xs text-gray-700 max-w-[120px] truncate" title={m!.material.name}>
                            {parseMaterialName(m!.material.name).base.replace(/\d+g/, g => g)}
                            {parseMaterialName(m!.material.name).side ? ` (${parseMaterialName(m!.material.name).side})` : ''}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-500 max-w-[100px] truncate" title={m!.terminacionesText}>
                            {m!.terminacionesText === 'Sin terminaciones' ? '—' : m!.terminacionesText}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-700 text-right font-medium">{m!.qty}</td>
                          <td className="px-3 py-2 text-xs font-bold text-gray-900 text-right">
                            ${roundPsychological(m!.totalPrice).toLocaleString('es-AR')}
                          </td>
                          <td className="px-3 py-2 text-xs text-orange-600 text-right">
                            ${(roundPsychological(m!.totalPrice) / m!.qty).toFixed(0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* APPLY */}
            <button
              onClick={handleApply}
              disabled={matrix.length === 0}
              className="w-full rounded-2xl bg-orange-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition-all hover:-translate-y-0.5 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0"
            >
              Aplicar {matrix.length} variantes al producto
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
