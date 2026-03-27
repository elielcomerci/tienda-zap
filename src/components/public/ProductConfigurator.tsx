'use client'

import { useState, useMemo } from 'react'
import { Check, ShoppingCart } from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'

// The product type coming from getProduct() with full includes
type ProductWithOptions = {
  id: string
  name: string
  price: number
  images: string[]
  options: {
    id: string
    name: string
    isRequired: boolean
    values: { id: string; value: string }[]
  }[]
  variants: {
    id: string
    price: number
    sku?: string | null
    stock?: number | null
    options: {
      id: string
      optionValue: {
        id: string
        value: string
        optionId: string
        option: { id: string; name: string }
      }
    }[]
  }[]
  [key: string]: any
}

export default function ProductConfigurator({ product }: { product: ProductWithOptions }) {
  const [selected, setSelected] = useState<Record<string, string>>({})
  const [added, setAdded] = useState(false)
  const addItem = useCartStore((s) => s.addItem)

  const hasOptions = product.options && product.options.length > 0

  // Build a fast lookup: variantId → { optionName → value }
  const variantCombinations = useMemo(() => {
    if (!product.variants) return []
    return product.variants.map(v => {
      const combos: Record<string, string> = {}
      v.options.forEach(opt => {
        combos[opt.optionValue.option.name] = opt.optionValue.value
      })
      return { ...v, combos }
    })
  }, [product.variants])

  // Find the active variant that exactly matches all selected options
  const activeVariant = useMemo(() => {
    if (!hasOptions || variantCombinations.length === 0) return null
    const selectedKeys = Object.keys(selected).filter(k => selected[k])
    if (selectedKeys.length === 0) return null

    return variantCombinations.find(v => {
      const comboKeys = Object.keys(v.combos)
      if (comboKeys.length !== selectedKeys.length) return false
      return selectedKeys.every(k => v.combos[k] === selected[k])
    }) || null
  }, [selected, variantCombinations, hasOptions])

  const currentPrice = activeVariant ? activeVariant.price : product.price

  const allRequiredSelected = useMemo(() => {
    if (!hasOptions) return true
    return product.options
      .filter(o => o.isRequired)
      .every(o => !!selected[o.name])
  }, [selected, product.options, hasOptions])

  const handleSelect = (optionName: string, value: string) => {
    setSelected(prev => ({
      ...prev,
      [optionName]: prev[optionName] === value ? '' : value
    }))
  }

  const handleAddToCart = () => {
    if (!allRequiredSelected) return

    const optionsArray = Object.entries(selected)
      .filter(([_, val]) => val !== '')
      .map(([name, value]) => ({ name, value }))

    addItem({
      productId: product.id,
      name: product.name,
      price: currentPrice,
      image: product.images[0] || '',
      quantity: 1,
      selectedOptions: optionsArray.length > 0 ? optionsArray : undefined
    })

    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  // Simple product (no options) — just show price + add to cart
  if (!hasOptions) {
    return (
      <div className="space-y-6">
        <div className="card p-5">
          <p className="text-3xl font-black text-gray-900 mb-1">
            ${product.price.toLocaleString('es-AR')}
          </p>
          <p className="text-sm text-gray-500">Precio unitario · IVA incluido</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${product.stock > 0 ? 'bg-green-500' : 'bg-red-400'}`} />
          <p className="text-sm text-gray-600">
            {product.stock > 0 ? `${product.stock} unidades disponibles` : 'Sin stock — consultarnos'}
          </p>
        </div>
        <button
          onClick={handleAddToCart}
          disabled={added}
          className={`
            w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold transition-all
            ${added
              ? 'bg-green-500 text-white shadow-lg shadow-green-500/30 ring-4 ring-green-100'
              : 'bg-orange-500 text-white hover:bg-orange-400 hover:scale-105 active:scale-95 shadow-lg shadow-orange-500/30'
            }
          `}
        >
          {added ? <Check size={20} /> : <ShoppingCart size={20} />}
          {added ? '¡Añadido al carrito!' : 'Añadir al carrito'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Opciones Interactivas */}
      {product.options.map((opt) => (
        <div key={opt.id} className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900">{opt.name}</h3>
            {opt.isRequired && (
              <span className="text-xs font-semibold text-orange-500 bg-orange-50 px-2 py-0.5 rounded">
                Requerido
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {opt.values.map((val) => {
              const isSelected = selected[opt.name] === val.value
              return (
                <button
                  key={val.id}
                  type="button"
                  onClick={() => handleSelect(opt.name, val.value)}
                  className={`
                    relative p-3.5 rounded-xl text-left border-2 transition-all duration-150
                    ${isSelected
                      ? 'border-orange-500 bg-orange-50 shadow-md shadow-orange-100/50 ring-2 ring-orange-100'
                      : 'border-gray-200 bg-white hover:border-orange-200 hover:bg-gray-50'
                    }
                  `}
                >
                  <span className={`block text-sm font-semibold ${isSelected ? 'text-orange-900' : 'text-gray-700'}`}>
                    {val.value}
                  </span>
                  {isSelected && (
                    <div className="absolute top-2.5 right-2.5 text-orange-500">
                      <Check size={14} strokeWidth={3} />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {/* Tarjeta de Precio Final */}
      <div className="bg-gray-900 text-white rounded-2xl p-6 shadow-xl mt-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
          <div>
            <p className="text-gray-400 text-sm font-medium mb-1">Precio Final</p>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-black tabular-nums">
                ${currentPrice.toLocaleString('es-AR')}
              </span>
              <span className="text-gray-400 text-sm mb-1.5 font-medium">ARS</span>
            </div>
            {!activeVariant && product.options.length > 0 && (
              <p className="text-xs text-orange-300 mt-1.5 font-medium">
                Seleccioná las opciones para ver el precio exacto
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!allRequiredSelected || added}
            className={`
              w-full sm:w-auto px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all
              ${added
                ? 'bg-green-500 text-white shadow-lg shadow-green-500/30 ring-4 ring-green-100'
                : allRequiredSelected
                  ? 'bg-orange-500 text-white hover:bg-orange-400 hover:scale-105 active:scale-95 shadow-lg shadow-orange-500/30'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
              }
            `}
          >
            {added ? <Check size={20} /> : <ShoppingCart size={20} />}
            {added ? '¡Añadido!' : allRequiredSelected ? 'Añadir al carrito' : 'Elegí las opciones'}
          </button>
        </div>
      </div>
    </div>
  )
}
