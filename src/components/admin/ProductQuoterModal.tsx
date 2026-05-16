'use client'

import { useState, useEffect } from 'react'
import { X, Calculator, Plus, Trash2, ArrowRight } from 'lucide-react'
import { getQuoterData } from '@/app/admin/cotizador/actions'
import { calculateNesting, calculateQuote } from '@/lib/pricing/nesting'

type QuoterData = Awaited<ReturnType<typeof getQuoterData>>

const roundPsychological = (price: number) => {
  if (price < 100) return Math.ceil(price / 10) * 10;
  const rounded = Math.ceil(price / 100) * 100 - 10;
  return rounded < price ? rounded + 100 : rounded;
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

  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([])
  const [itemWidth, setItemWidth] = useState(9)
  const [itemHeight, setItemHeight] = useState(5)
  const [margin, setMargin] = useState(1) // 1cm de pinza general
  const [bleed, setBleed] = useState(0.2) // 2mm por lado
  const [profitMarginPercent, setProfitMarginPercent] = useState(150)
  
  const [selectedFinishingIds, setSelectedFinishingIds] = useState<string[]>([])
  const [quantities, setQuantities] = useState<number[]>([100, 500, 1000])

  useEffect(() => {
    if (isOpen && !data) {
      getQuoterData().then(d => {
        setData(d)
        if (d.materials.length > 0) setSelectedMaterialIds([d.materials[0].id])
        setLoading(false)
      })
    }
  }, [isOpen, data])

  if (!isOpen) return null

  if (loading || !data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm">
        <div className="rounded-2xl bg-white p-8">Cargando datos del cotizador...</div>
      </div>
    )
  }

  const selectedMaterials = data.materials.filter(m => selectedMaterialIds.includes(m.id))
  
  // Finishings
  const finishings = data.finishings.filter(f => selectedFinishingIds.includes(f.id))

  // Generate matrix
  const matrix = selectedMaterials.flatMap(material => {
    const nestingResult = calculateNesting({
      sheetWidth: material.width,
      sheetHeight: material.height,
      itemWidth,
      itemHeight,
      margin,
      bleed
    })

    if (nestingResult.itemsPerSheet <= 0) return []

    return quantities.sort((a, b) => a - b).map(qty => {
      const sheetsNeeded = Math.ceil(qty / nestingResult.itemsPerSheet)
      const tier = material.tiers.find(t => 
        sheetsNeeded >= t.minQty && (!t.maxQty || sheetsNeeded <= t.maxQty)
      )
      
      const rawMaterialUnitPrice = tier ? tier.unitPrice : 
        (material.tiers[material.tiers.length - 1]?.unitPrice || 0)

      try {
        const quote = calculateQuote({
          quantity: qty,
          itemsPerSheet: nestingResult.itemsPerSheet,
          rawMaterialUnitPrice,
          finishings: finishings.map(f => ({ 
            costType: f.costType, 
            tiers: f.tiers 
          })),
          profitMarginPercent
        })
        return { material, qty, ...quote, itemsPerSheet: nestingResult.itemsPerSheet }
      } catch {
        return null
      }
    })
  }).filter(Boolean)

  const handleApply = () => {
    const terminacionesText = finishings.length > 0 
      ? finishings.map(f => f.name).join(' + ')
      : 'Sin terminaciones'

    const validVariants = matrix.map(m => ({
      options: {
        'Sustrato': m!.material.name,
        'Medida': `${itemWidth}x${itemHeight} cm`,
        'Terminaciones': terminacionesText,
        'Cantidad': `${m!.qty}`
      },
      price: roundPsychological(m!.totalPrice)
    }))
    onApplyVariants(validVariants)
    onClose()
  }

  const toggleMaterial = (id: string) => {
    if (selectedMaterialIds.includes(id)) {
      setSelectedMaterialIds(selectedMaterialIds.filter(m => m !== id))
    } else {
      setSelectedMaterialIds([...selectedMaterialIds, id])
    }
  }

  const toggleFinishing = (id: string) => {
    if (selectedFinishingIds.includes(id)) {
      setSelectedFinishingIds(selectedFinishingIds.filter(f => f !== id))
    } else {
      setSelectedFinishingIds([...selectedFinishingIds, id])
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <Calculator className="text-orange-500" />
            Cotizador Inteligente
          </div>
          <button onClick={onClose} className="text-gray-400 hover:bg-gray-100 rounded-lg p-2">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Columna 1: Configuracion */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Sustratos Base</h3>
                <span className="text-xs text-gray-500">{selectedMaterialIds.length} seleccionados</span>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                {data.materials.map(m => (
                  <label key={m.id} className="flex items-center gap-3 p-3 border rounded-xl hover:bg-gray-50 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={selectedMaterialIds.includes(m.id)}
                      onChange={() => toggleMaterial(m.id)}
                      className="w-4 h-4 text-orange-500 rounded border-gray-300 focus:ring-orange-500"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{m.name}</div>
                      <div className="text-xs text-gray-500">{m.width}x{m.height}cm ({m.unit})</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Ancho Pieza (cm)</label>
                <input type="number" step="0.1" value={itemWidth} onChange={e => setItemWidth(Number(e.target.value))} className="input" />
              </div>
              <div>
                <label className="label">Alto Pieza (cm)</label>
                <input type="number" step="0.1" value={itemHeight} onChange={e => setItemHeight(Number(e.target.value))} className="input" />
              </div>
              <div>
                <label className="label">Demasía/Bleed (cm)</label>
                <input type="number" step="0.1" value={bleed} onChange={e => setBleed(Number(e.target.value))} className="input" />
              </div>
              <div>
                <label className="label">Pinza/Margen (cm)</label>
                <input type="number" step="0.1" value={margin} onChange={e => setMargin(Number(e.target.value))} className="input" />
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Terminaciones Adicionales</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                {data.finishings.map(f => (
                  <label key={f.id} className="flex items-center gap-3 p-3 border rounded-xl hover:bg-gray-50 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={selectedFinishingIds.includes(f.id)}
                      onChange={() => toggleFinishing(f.id)}
                      className="w-4 h-4 text-orange-500 rounded border-gray-300 focus:ring-orange-500"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{f.name}</div>
                      <div className="text-xs text-gray-500">
                        {f.tiers.length} escala(s) ({f.costType})
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <label className="label text-orange-600 font-semibold">Margen de Ganancia (%)</label>
              <input 
                type="number" 
                value={profitMarginPercent} 
                onChange={e => setProfitMarginPercent(Number(e.target.value))} 
                className="input text-lg font-semibold" 
              />
              <p className="text-xs text-gray-500 mt-1">Ej: 150 = sumar 150% al costo (Costo x 2.5)</p>
            </div>
          </div>

          {/* Columna 2: Resultados */}
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 flex flex-col">
            <h3 className="font-semibold text-gray-900 mb-4">Nesting</h3>
            
            <div className="flex items-center justify-between mb-3 mt-4">
              <h3 className="font-semibold text-gray-900">Cantidades a Cotizar</h3>
              <div className="flex gap-2">
                {[100, 500, 1000, 5000].map(q => (
                  <button 
                    key={q}
                    onClick={() => !quantities.includes(q) && setQuantities([...quantities, q])}
                    className="text-xs bg-white border border-gray-200 px-2 py-1 rounded hover:bg-gray-50"
                  >
                    +{q}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto max-h-80 pr-2">
              {matrix.length === 0 ? (
                <div className="text-sm text-gray-500 py-4 text-center">
                  Seleccioná al menos un material válido para ver los precios.
                </div>
              ) : (
                matrix.map((m, i) => (
                  <div key={i} className="flex flex-col gap-2 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                      <div className="font-medium text-gray-900 text-sm truncate pr-4" title={m!.material.name}>
                        {m!.material.name}
                      </div>
                      <div className="font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded text-xs">
                        {m!.qty} u.
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 relative group">
                      <div className="flex-1 text-xs text-gray-500 space-y-1">
                        <div>Entran <span className="font-medium text-gray-700">{m!.itemsPerSheet}</span>/pliego</div>
                        <div>Pliegos: <span className="font-medium text-gray-700">{m!.sheetsNeeded}</span></div>
                        <div>Costo B.: <span className="font-medium text-gray-700">${m!.totalCost.toFixed(2)}</span></div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">${roundPsychological(m!.totalPrice)}</div>
                        <div className="text-xs text-green-700/70">${(roundPsychological(m!.totalPrice) / m!.qty).toFixed(2)} c/u</div>
                      </div>
                      
                      {/* En lugar de eliminar una cantidad acá (lo cual era raro), ya no lo permitimos fila por fila, 
                          porque generaría una UI muy confusa al tener N variantes. Solo usan los botones +100, +500, etc. */}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={handleApply}
                disabled={matrix.length === 0 || !matrix.every(Boolean)}
                className="w-full flex justify-center items-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Aplicar Precios a Variantes
                <ArrowRight size={18} />
              </button>
              <p className="text-center text-xs text-gray-500 mt-2">
                Esto reemplazará o agregará estas opciones a tu producto.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
