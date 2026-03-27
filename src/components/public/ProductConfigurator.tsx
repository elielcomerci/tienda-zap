'use client'

import { useMemo, useState } from 'react'
import { Check, ShoppingCart } from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'
import { getLowestPurchasablePrice, isPurchasablePrice } from '@/lib/product-pricing'

type ProductWithOptions = {
  id: string
  name: string
  price: number
  stock?: number
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
  const addItem = useCartStore((state) => state.addItem)

  const hasOptions = product.options && product.options.length > 0
  const simpleProductAvailable = isPurchasablePrice(product.price)

  const variantCombinations = useMemo(() => {
    if (!product.variants) return []

    return product.variants.map((variant) => {
      const combos: Record<string, string> = {}

      variant.options.forEach((option) => {
        combos[option.optionValue.option.name] = option.optionValue.value
      })

      return { ...variant, combos }
    })
  }, [product.variants])

  const activeVariant = useMemo(() => {
    if (!hasOptions || variantCombinations.length === 0) return null

    const selectedKeys = Object.keys(selected).filter((key) => selected[key])
    if (selectedKeys.length === 0) return null

    return variantCombinations.find((variant) => {
      const comboKeys = Object.keys(variant.combos)
      if (comboKeys.length !== selectedKeys.length) return false

      return selectedKeys.every((key) => variant.combos[key] === selected[key])
    }) || null
  }, [hasOptions, selected, variantCombinations])

  const currentPrice = activeVariant ? activeVariant.price : product.price
  const selectedVariantAvailable = !activeVariant || isPurchasablePrice(activeVariant.price)

  const minPrice = useMemo(() => {
    if (!hasOptions || !product.variants || product.variants.length === 0) {
      return simpleProductAvailable ? product.price : null
    }

    return getLowestPurchasablePrice(product.variants)
  }, [hasOptions, product.price, product.variants, simpleProductAvailable])

  const allRequiredSelected = useMemo(() => {
    if (!hasOptions) return true

    return product.options
      .filter((option) => option.isRequired)
      .every((option) => Boolean(selected[option.name]))
  }, [hasOptions, product.options, selected])

  const canAddToCart = hasOptions
    ? Boolean(activeVariant) && allRequiredSelected && selectedVariantAvailable
    : simpleProductAvailable

  const displayPrice = !activeVariant && hasOptions
    ? minPrice
    : isPurchasablePrice(currentPrice)
      ? currentPrice
      : null

  const addToCartLabel = added
    ? '¡Añadido!'
    : !hasOptions
      ? simpleProductAvailable
        ? 'Añadir al carrito'
        : 'No disponible'
      : !allRequiredSelected
        ? 'Elegí las opciones'
        : !activeVariant
          ? 'Completá la variante'
          : selectedVariantAvailable
            ? 'Añadir al carrito'
            : 'Variante no disponible'

  const handleSelect = (optionName: string, value: string) => {
    setSelected((previous) => ({
      ...previous,
      [optionName]: previous[optionName] === value ? '' : value,
    }))
  }

  const handleAddToCart = () => {
    if (!canAddToCart) return

    const optionsArray = Object.entries(selected)
      .filter(([, value]) => value !== '')
      .map(([name, value]) => ({ name, value }))

    addItem({
      productId: product.id,
      name: product.name,
      price: currentPrice,
      image: product.images[0] || '',
      quantity: 1,
      selectedOptions: optionsArray.length > 0 ? optionsArray : undefined,
    })

    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  if (!hasOptions) {
    return (
      <div className="space-y-6">
        <div className="card p-5">
          {simpleProductAvailable ? (
            <>
              <p className="mb-1 text-3xl font-black text-gray-900">
                ${product.price.toLocaleString('es-AR')}
              </p>
              <p className="text-sm text-gray-500">Precio unitario · IVA incluido</p>
            </>
          ) : (
            <>
              <p className="mb-1 text-3xl font-black text-gray-900">No disponible</p>
              <p className="text-sm text-gray-500">
                Este producto está cargado con precio 0 y no se puede comprar online.
              </p>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className={`h-2 w-2 rounded-full ${product.stock && product.stock > 0 ? 'bg-green-500' : 'bg-red-400'}`} />
          <p className="text-sm text-gray-600">
            {product.stock && product.stock > 0 ? `${product.stock} unidades disponibles` : 'Sin stock — consultanos'}
          </p>
        </div>

        <button
          onClick={handleAddToCart}
          disabled={!canAddToCart || added}
          className={`
            w-full rounded-xl px-6 py-4 font-bold transition-all flex items-center justify-center gap-2
            ${added
              ? 'bg-green-500 text-white shadow-lg shadow-green-500/30 ring-4 ring-green-100'
              : canAddToCart
                ? 'bg-orange-500 text-white hover:bg-orange-400 hover:scale-105 active:scale-95 shadow-lg shadow-orange-500/30'
                : 'cursor-not-allowed bg-gray-200 text-gray-500'
            }
          `}
        >
          {added ? <Check size={20} /> : <ShoppingCart size={20} />}
          {added ? '¡Añadido al carrito!' : addToCartLabel}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {product.options.map((option) => (
        <div key={option.id} className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900">{option.name}</h3>
            {option.isRequired && (
              <span className="rounded bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-500">
                Requerido
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {option.values.map((value) => {
              const isSelected = selected[option.name] === value.value

              return (
                <button
                  key={value.id}
                  type="button"
                  onClick={() => handleSelect(option.name, value.value)}
                  className={`
                    relative rounded-xl border-2 p-3.5 text-left transition-all duration-150
                    ${isSelected
                      ? 'border-orange-500 bg-orange-50 shadow-md shadow-orange-100/50 ring-2 ring-orange-100'
                      : 'border-gray-200 bg-white hover:border-orange-200 hover:bg-gray-50'
                    }
                  `}
                >
                  <span className={`block text-sm font-semibold ${isSelected ? 'text-orange-900' : 'text-gray-700'}`}>
                    {value.value}
                  </span>
                  {isSelected && (
                    <div className="absolute right-2.5 top-2.5 text-orange-500">
                      <Check size={14} strokeWidth={3} />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      <div className="mt-4 rounded-2xl bg-gray-900 p-6 text-white shadow-xl">
        <div className="flex flex-col items-center justify-between gap-5 sm:flex-row">
          <div>
            <p className="mb-1 text-sm font-medium text-gray-400">Precio Final</p>
            <div className="flex items-end gap-2">
              {displayPrice !== null ? (
                <>
                  <span className="text-4xl font-black tabular-nums">
                    {!activeVariant ? (
                      <span className="mr-1 text-2xl font-bold text-gray-400">Desde</span>
                    ) : null}
                    ${displayPrice.toLocaleString('es-AR')}
                  </span>
                  <span className="mb-1.5 text-sm font-medium text-gray-400">ARS</span>
                </>
              ) : (
                <span className="text-2xl font-black text-orange-300">Consultar</span>
              )}
            </div>

            {!allRequiredSelected && (
              <p className="mt-1.5 text-xs font-medium text-orange-300">
                Seleccioná las opciones requeridas para ver la combinación exacta.
              </p>
            )}
            {allRequiredSelected && !activeVariant && (
              <p className="mt-1.5 text-xs font-medium text-orange-300">
                Terminá de elegir la variante para habilitar la compra.
              </p>
            )}
            {activeVariant && !selectedVariantAvailable && (
              <p className="mt-1.5 text-xs font-medium text-orange-300">
                Esta combinación está marcada con precio 0 y se toma como no disponible.
              </p>
            )}
            {minPrice === null && !activeVariant && (
              <p className="mt-1.5 text-xs font-medium text-orange-300">
                Este producto no tiene variantes disponibles para compra online en este momento.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!canAddToCart || added}
            className={`
              w-full rounded-xl px-8 py-4 font-bold transition-all flex items-center justify-center gap-2 sm:w-auto
              ${added
                ? 'bg-green-500 text-white shadow-lg shadow-green-500/30 ring-4 ring-green-100'
                : canAddToCart
                  ? 'bg-orange-500 text-white hover:bg-orange-400 hover:scale-105 active:scale-95 shadow-lg shadow-orange-500/30'
                  : 'cursor-not-allowed border border-gray-700 bg-gray-800 text-gray-500'
              }
            `}
          >
            {added ? <Check size={20} /> : <ShoppingCart size={20} />}
            {addToCartLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
