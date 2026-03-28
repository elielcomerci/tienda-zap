'use client'

import { useEffect, useState } from 'react'
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
  const validOptions = options.filter((option) => option.name.trim() && option.values.length > 0)
  if (validOptions.length === 0) return []

  return validOptions.reduce<Record<string, string>[]>((accumulator, option) => {
    const next: Record<string, string>[] = []
    const baseCombinations = accumulator.length > 0 ? accumulator : [{}]

    for (const combination of baseCombinations) {
      for (const value of option.values) {
        next.push({ ...combination, [option.name]: value })
      }
    }

    return next
  }, [])
}

export default function ProductOptionsConfigurator({
  initialOptions = [],
  initialVariants = [],
  basePrice = 0,
  disableStock = false,
  onOptionsChange,
}: {
  initialOptions?: Option[]
  initialVariants?: Variant[]
  basePrice?: number
  disableStock?: boolean
  onOptionsChange?: (hasOptions: boolean) => void
}) {
  const [options, setOptions] = useState<Option[]>(initialOptions)
  const [variants, setVariants] = useState<Variant[]>(initialVariants)

  useEffect(() => {
    onOptionsChange?.(options.length > 0)
  }, [onOptionsChange, options])

  useEffect(() => {
    if (!disableStock) {
      return
    }

    setVariants((current) => current.map((variant) => ({ ...variant, stock: undefined })))
  }, [disableStock])

  const addOption = () => {
    setOptions([...options, { name: '', isRequired: true, values: [''] }])
  }

  const updateOptionName = (index: number, name: string) => {
    const nextOptions = [...options]
    nextOptions[index].name = name
    setOptions(nextOptions)
  }

  const toggleOptionRequired = (index: number) => {
    const nextOptions = [...options]
    nextOptions[index].isRequired = !nextOptions[index].isRequired
    setOptions(nextOptions)
  }

  const removeOption = (index: number) => {
    setOptions(options.filter((_, optionIndex) => optionIndex !== index))
  }

  const addValue = (optionIndex: number) => {
    const nextOptions = [...options]
    nextOptions[optionIndex].values.push('')
    setOptions(nextOptions)
  }

  const updateValue = (optionIndex: number, valueIndex: number, value: string) => {
    const nextOptions = [...options]
    nextOptions[optionIndex].values[valueIndex] = value
    setOptions(nextOptions)
  }

  const removeValue = (optionIndex: number, valueIndex: number) => {
    const nextOptions = [...options]
    nextOptions[optionIndex].values = nextOptions[optionIndex].values.filter(
      (_, index) => index !== valueIndex
    )
    setOptions(nextOptions)
  }

  const generateVariants = () => {
    const combinations = cartesianProduct(options)

    const nextVariants = combinations.map((combination) => {
      const existing = variants.find((variant) => {
        const variantKeys = Object.keys(variant.combinations)
        const combinationKeys = Object.keys(combination)

        if (variantKeys.length !== combinationKeys.length) {
          return false
        }

        return variantKeys.every((key) => variant.combinations[key] === combination[key])
      })

      return existing || {
        combinations: combination,
        price: basePrice,
      }
    })

    setVariants(nextVariants)
  }

  const updateVariantPrice = (index: number, price: number) => {
    const nextVariants = [...variants]
    nextVariants[index].price = price
    setVariants(nextVariants)
  }

  const updateVariantStock = (index: number, stock: number) => {
    const nextVariants = [...variants]
    nextVariants[index].stock = stock
    setVariants(nextVariants)
  }

  const updateVariantSku = (index: number, sku: string) => {
    const nextVariants = [...variants]
    nextVariants[index].sku = sku
    setVariants(nextVariants)
  }

  return (
    <div className="space-y-8">
      <input
        type="hidden"
        name="options"
        value={JSON.stringify(options.map((option) => ({
          ...option,
          values: option.values.map((value) => ({ value })),
        })))}
      />
      <input type="hidden" name="variants" value={JSON.stringify(variants)} />

      <div className="card border-orange-100 bg-orange-50/30 p-6">
        <div className="mb-4 flex items-center justify-between border-b pb-3">
          <h2 className="flex items-center gap-2 font-bold text-gray-900">
            <Tag className="text-orange-500" size={20} />
            Opciones y variantes
          </h2>
          <button type="button" onClick={addOption} className="btn-secondary !py-1.5 !text-xs">
            <Plus size={14} />
            Anadir opcion
          </button>
        </div>

        {options.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-500">
            Este producto no tiene configuraciones adicionales. Es un producto simple.
          </p>
        ) : (
          <div className="space-y-6">
            {options.map((option, optionIndex) => (
              <div key={optionIndex} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="mb-4 flex items-start gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Nombre de opcion (ej: Terminacion)"
                        value={option.name}
                        onChange={(event) => updateOptionName(optionIndex, event.target.value)}
                        className="input !py-1.5 !text-sm flex-1 font-bold"
                      />
                      <label className="flex cursor-pointer items-center gap-2 rounded-lg border bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700">
                        <input
                          type="checkbox"
                          checked={option.isRequired}
                          onChange={() => toggleOptionRequired(optionIndex)}
                          className="rounded text-orange-500"
                        />
                        Requerido
                      </label>
                      <button
                        type="button"
                        onClick={() => removeOption(optionIndex)}
                        className="rounded p-1.5 text-red-500 hover:bg-red-50"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {option.values.map((value, valueIndex) => (
                        <div
                          key={valueIndex}
                          className="flex items-center gap-1 rounded-lg bg-gray-100 py-1 pl-3 pr-1"
                        >
                          <input
                            type="text"
                            placeholder="Valor"
                            value={value}
                            onChange={(event) => updateValue(optionIndex, valueIndex, event.target.value)}
                            className="w-24 border-none bg-transparent p-0 text-sm placeholder-gray-400 focus:ring-0"
                          />
                          <button
                            type="button"
                            onClick={() => removeValue(optionIndex, valueIndex)}
                            className="p-1 text-gray-400 hover:text-red-500"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addValue(optionIndex)}
                        className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-600 hover:bg-orange-100"
                      >
                        + Anadir valor
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div className="border-t border-gray-200 pt-4">
              <button type="button" onClick={generateVariants} className="btn-primary w-full justify-center">
                <RefreshCcw size={16} />
                Generar matriz de precios
              </button>
              <p className="mt-2 text-center text-xs text-gray-500">
                Regenerala cada vez que agregues o modifiques opciones para actualizar la tabla.
              </p>
              <p className="mt-1 text-center text-xs font-medium text-orange-600">
                Precio 0 = variante no disponible para compra online
              </p>
            </div>
          </div>
        )}
      </div>

      {variants.length > 0 && options.length > 0 && (
        <div className="card overflow-hidden border-orange-200">
          <div className="flex items-center justify-between bg-orange-500 p-4 text-white">
            <h3 className="flex items-center gap-2 font-bold">
              <DollarSign size={18} />
              Matriz de precios
            </h3>
            <span className="rounded-full bg-orange-600 px-2 py-1 text-xs font-semibold">
              {variants.length} combinaciones
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50 font-semibold text-gray-600">
                <tr>
                  <th className="px-4 py-3">Variante</th>
                  <th className="w-40 px-4 py-3">Precio ARS</th>
                  <th className="w-32 px-4 py-3">SKU</th>
                  {!disableStock && <th className="w-24 px-4 py-3">Stock</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {variants.map((variant, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {Object.entries(variant.combinations).map(([key, value]) => (
                        <span
                          key={key}
                          className="mr-1 mb-1 inline-block rounded-md border bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                        >
                          {value}
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
                          value={variant.price}
                          onChange={(event) => updateVariantPrice(index, parseFloat(event.target.value) || 0)}
                          className="input !py-1.5 !pl-6 !w-full font-bold text-orange-600"
                        />
                      </div>
                      {variant.price === 0 && (
                        <p className="mt-1 text-[11px] font-medium text-orange-600">
                          No disponible online
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={variant.sku || ''}
                        onChange={(event) => updateVariantSku(index, event.target.value)}
                        className="input !py-1.5 !w-full font-mono text-xs"
                        placeholder="Ej: TJ-100-M"
                      />
                    </td>
                    {!disableStock && (
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          min="0"
                          value={variant.stock ?? ''}
                          onChange={(event) => updateVariantStock(index, parseInt(event.target.value, 10) || 0)}
                          className="input !py-1.5 !w-full"
                          placeholder="∞"
                        />
                      </td>
                    )}
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
