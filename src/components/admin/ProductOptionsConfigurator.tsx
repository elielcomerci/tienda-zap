'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, X, Tag, RefreshCcw, DollarSign } from 'lucide-react'

export interface Option {
  id?: string
  name: string
  isRequired: boolean
  values: string[]
}

export interface Variant {
  id?: string
  combinations: Record<string, string>
  price: number
  sku?: string
  stock?: number
}

function cartesianProduct(options: Option[]): Record<string, string>[] {
  const validOptions = options.filter(o => o.name.trim() && o.values.length > 0)
  if (validOptions.length === 0) return []

  return validOptions.reduce<Record<string, string>[]>((acc, option) => {
    const newAcc: Record<string, string>[] = []
    
    const baseCombinations = acc.length > 0 ? acc : [{}]
    
    for (const combination of baseCombinations) {
      for (const value of option.values) {
        newAcc.push({ ...combination, [option.name]: value })
      }
    }
    return newAcc
  }, [])
}

export default function ProductOptionsConfigurator({
  initialOptions = [],
  initialVariants = [],
  basePrice = 0,
  onOptionsChange,
}: {
  initialOptions?: Option[]
  initialVariants?: Variant[]
  basePrice?: number
  onOptionsChange?: (hasOptions: boolean) => void
}) {
  const [options, setOptions] = useState<Option[]>(initialOptions)
  const [variants, setVariants] = useState<Variant[]>(initialVariants)

  useEffect(() => {
    onOptionsChange?.(options.length > 0)
  }, [options, onOptionsChange])

  // Opciones base
  const addOption = () => {
    setOptions([...options, { name: '', isRequired: true, values: [''] }])
  }

  const updateOptionName = (idx: number, name: string) => {
    const newOptions = [...options]
    newOptions[idx].name = name
    setOptions(newOptions)
  }

  const toggleOptionRequired = (idx: number) => {
    const newOptions = [...options]
    newOptions[idx].isRequired = !newOptions[idx].isRequired
    setOptions(newOptions)
  }

  const removeOption = (idx: number) => {
    setOptions(options.filter((_, i) => i !== idx))
  }

  // Valores de opción
  const addValue = (optIdx: number) => {
    const newOptions = [...options]
    newOptions[optIdx].values.push('')
    setOptions(newOptions)
  }

  const updateValue = (optIdx: number, valIdx: number, val: string) => {
    const newOptions = [...options]
    newOptions[optIdx].values[valIdx] = val
    setOptions(newOptions)
  }

  const removeValue = (optIdx: number, valIdx: number) => {
    const newOptions = [...options]
    newOptions[optIdx].values = newOptions[optIdx].values.filter((_, i) => i !== valIdx)
    setOptions(newOptions)
  }

  // Generar Matriz
  const generateVariants = () => {
    const combinations = cartesianProduct(options)
    
    const newVariants = combinations.map(comb => {
      // Find existing to preserve prices
      const existing = variants.find(v => {
        const vKeys = Object.keys(v.combinations)
        const cKeys = Object.keys(comb)
        if (vKeys.length !== cKeys.length) return false
        return vKeys.every(k => v.combinations[k] === comb[k])
      })

      return existing || {
        combinations: comb,
        price: basePrice,
      }
    })

    setVariants(newVariants)
  }

  const updateVariantPrice = (idx: number, price: number) => {
    const newV = [...variants]
    newV[idx].price = price
    setVariants(newV)
  }
  
  const updateVariantStock = (idx: number, stock: number) => {
    const newV = [...variants]
    newV[idx].stock = stock
    setVariants(newV)
  }

  const updateVariantSku = (idx: number, sku: string) => {
    const newV = [...variants]
    newV[idx].sku = sku
    setVariants(newV)
  }

  return (
    <div className="space-y-8">
      {/* Hidden inputs to pass data via FormData */}
      <input type="hidden" name="options" value={JSON.stringify(options.map(o => ({ ...o, values: o.values.map(v => ({ value: v })) })))} />
      <input type="hidden" name="variants" value={JSON.stringify(variants)} />

      <div className="card p-6 border-orange-100 bg-orange-50/30">
        <div className="flex items-center justify-between mb-4 border-b pb-3">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <Tag className="text-orange-500" size={20} /> Opciones y Variantes
          </h2>
          <button type="button" onClick={addOption} className="btn-secondary !text-xs !py-1.5">
            <Plus size={14} /> Añadir Opción
          </button>
        </div>

        {options.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            Este producto no tiene configuraciones adicionales (Ej: Talle, Material, Cantidad). Es un producto simple.
          </p>
        ) : (
          <div className="space-y-6">
            {options.map((opt, optIdx) => (
              <div key={optIdx} className="bg-white p-4 rounded-xl border border-gray-200">
                <div className="flex gap-4 mb-4 items-start">
                  <div className="flex-1 space-y-3">
                    <div className="flex gap-2 items-center">
                      <input 
                        type="text" 
                        placeholder="Nombre de Opción (Ej: Terminación)" 
                        value={opt.name} 
                        onChange={e => updateOptionName(optIdx, e.target.value)}
                        className="input !py-1.5 !text-sm flex-1 font-bold"
                      />
                      <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer bg-gray-50 px-3 py-1.5 rounded-lg border">
                        <input 
                          type="checkbox" 
                          checked={opt.isRequired} 
                          onChange={() => toggleOptionRequired(optIdx)} 
                          className="rounded text-orange-500"
                        /> Requerido
                      </label>
                      <button type="button" onClick={() => removeOption(optIdx)} className="p-1.5 text-red-500 hover:bg-red-50 rounded">
                        <X size={16} />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {opt.values.map((val, valIdx) => (
                        <div key={valIdx} className="flex items-center gap-1 bg-gray-100 rounded-lg pl-3 pr-1 py-1">
                          <input 
                            type="text" 
                            placeholder="Valor" 
                            value={val} 
                            onChange={e => updateValue(optIdx, valIdx, e.target.value)}
                            className="bg-transparent border-none text-sm p-0 focus:ring-0 w-24 placeholder-gray-400"
                          />
                          <button type="button" onClick={() => removeValue(optIdx, valIdx)} className="text-gray-400 hover:text-red-500 p-1">
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                      <button type="button" onClick={() => addValue(optIdx)} className="text-xs text-orange-600 font-semibold px-3 py-1 bg-orange-50 rounded-lg border border-orange-200 hover:bg-orange-100">
                        + Añadir valor
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div className="pt-4 border-t border-gray-200">
              <button type="button" onClick={generateVariants} className="btn-primary w-full justify-center">
                <RefreshCcw size={16} /> Generar Matriz de Precios
              </button>
              <p className="text-xs text-center text-gray-500 mt-2">
                Hacé clic aquí cada vez que agregues o modifiques opciones para actualizar la tabla de precios
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Tabla de Variantes (Pricing Matrix) */}
      {variants.length > 0 && options.length > 0 && (
        <div className="card overflow-hidden border-orange-200">
          <div className="p-4 bg-orange-500 text-white flex justify-between items-center">
            <h3 className="font-bold flex items-center gap-2">
              <DollarSign size={18} /> Matriz de Precios
            </h3>
            <span className="text-xs bg-orange-600 px-2 py-1 rounded-full font-semibold">
              {variants.length} combinaciones
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b">
                <tr>
                  <th className="px-4 py-3">Variante (Combinación)</th>
                  <th className="px-4 py-3 w-40">Precio ARS</th>
                  <th className="px-4 py-3 w-32">SKU (Opcional)</th>
                  <th className="px-4 py-3 w-24">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {variants.map((v, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {Object.entries(v.combinations).map(([k, val]) => (
                        <span key={k} className="inline-block bg-gray-100 border text-gray-600 rounded-md px-2 py-0.5 text-xs mr-1 mb-1">
                          {val}
                        </span>
                      ))}
                    </td>
                    <td className="px-4 py-2">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                        <input 
                          type="number" 
                          min="0" 
                          step="0.01"
                          value={v.price}
                          onChange={e => updateVariantPrice(i, parseFloat(e.target.value) || 0)}
                          className="input !py-1.5 !pl-6 !w-full font-bold text-orange-600"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <input 
                        type="text" 
                        value={v.sku || ''}
                        onChange={e => updateVariantSku(i, e.target.value)}
                        className="input !py-1.5 !w-full font-mono text-xs"
                        placeholder="Ej: TJ-100-M"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input 
                        type="number" 
                        min="0"
                        value={v.stock ?? ''}
                        onChange={e => updateVariantStock(i, parseInt(e.target.value) || 0)}
                        className="input !py-1.5 !w-full"
                        placeholder="∞"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
