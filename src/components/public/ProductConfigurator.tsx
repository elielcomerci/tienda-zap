'use client'

import { useMemo, useState } from 'react'
import { Check, ShoppingCart } from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'
import { getLowestPurchasablePrice, isPurchasablePrice } from '@/lib/product-pricing'

type ProductWithOptions = {
  id: string
  name: string
  price: number
  creditDownPaymentPercent: number
  stock?: number
  images: string[]
  category: {
    name: string
    isService: boolean
  }
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
  const isServiceProduct = product.category.isService
  const simpleProductAvailable = isPurchasablePrice(product.price)
  const creditDownPaymentPercent = product.creditDownPaymentPercent || 30

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

    return (
      variantCombinations.find((variant) => {
        const comboKeys = Object.keys(variant.combos)
        if (comboKeys.length !== selectedKeys.length) return false

        return selectedKeys.every((key) => variant.combos[key] === selected[key])
      }) || null
    )
  }, [hasOptions, selected, variantCombinations])

  const currentPrice = activeVariant ? activeVariant.price : product.price
  const selectedVariantAvailable = !activeVariant || isPurchasablePrice(activeVariant.price)

  const minPrice = useMemo(() => {
    if (!hasOptions || !product.variants || product.variants.length === 0) {
      return simpleProductAvailable ? product.price : null
    }

    return getLowestPurchasablePrice(product.variants)
  }, [hasOptions, product.price, product.variants, simpleProductAvailable])

  const matchingAvailableVariants = useMemo(() => {
    if (!hasOptions || variantCombinations.length === 0) return []

    const selectedEntries = Object.entries(selected).filter(([, value]) => value)
    if (selectedEntries.length === 0) {
      return variantCombinations.filter((variant) => isPurchasablePrice(variant.price))
    }

    return variantCombinations.filter(
      (variant) =>
        isPurchasablePrice(variant.price) &&
        selectedEntries.every(([key, value]) => variant.combos[key] === value)
    )
  }, [hasOptions, selected, variantCombinations])

  const allRequiredSelected = useMemo(() => {
    if (!hasOptions) return true

    return product.options
      .filter((option) => option.isRequired)
      .every((option) => Boolean(selected[option.name]))
  }, [hasOptions, product.options, selected])

  const canAddToCart = hasOptions
    ? Boolean(activeVariant) && allRequiredSelected && selectedVariantAvailable
    : simpleProductAvailable

  const contextualMinPrice = useMemo(() => {
    if (!hasOptions) return minPrice
    if (matchingAvailableVariants.length === 0) return null
    return Math.min(...matchingAvailableVariants.map((variant) => variant.price))
  }, [hasOptions, matchingAvailableVariants, minPrice])

  const displayPrice =
    !activeVariant && hasOptions
      ? contextualMinPrice
      : isPurchasablePrice(currentPrice)
        ? currentPrice
        : null

  const addToCartLabel = added
    ? 'Agregado'
    : !hasOptions
      ? simpleProductAvailable
        ? 'Agregar al carrito'
        : 'No disponible'
      : !allRequiredSelected
        ? 'Elegi las opciones'
        : !activeVariant
          ? 'Completa la variante'
          : selectedVariantAvailable
            ? 'Agregar al carrito'
            : 'Variante no disponible'

  const selectedCount = Object.values(selected).filter(Boolean).length
  const requiredCount = hasOptions
    ? product.options.filter((option) => option.isRequired).length
    : 0

  const guidanceMessage = !allRequiredSelected
    ? 'Elige las opciones principales y te mostramos la combinacion que mejor encaja.'
    : allRequiredSelected && !activeVariant
      ? 'Afina una opcion mas y lo dejas listo para sumar al carrito.'
      : activeVariant && !selectedVariantAvailable
        ? 'Esta combinacion no esta disponible ahora mismo.'
        : minPrice === null && !activeVariant
          ? 'Este producto no tiene variantes disponibles para compra online en este momento.'
          : 'Pagalo con tarjeta o muevelo con Credito ZAP desde el anticipo indicado.'

  const summaryStateLabel = !allRequiredSelected
    ? 'Completa los campos requeridos'
    : activeVariant && selectedVariantAvailable
      ? 'Todo listo para comprar'
      : activeVariant
        ? 'Revisa esta combinacion'
        : 'Falta definir una opcion'

  const availabilityLabel = isServiceProduct
    ? 'Servicio coordinado contigo despues de comprar'
    : product.stock && product.stock > 0
      ? `${product.stock} unidades disponibles`
      : 'Sin stock online por ahora'

  const isOptionValueAvailable = (optionName: string, value: string) => {
    if (!hasOptions || variantCombinations.length === 0) return true

    return variantCombinations.some((variant) => {
      if (!isPurchasablePrice(variant.price)) return false
      if (variant.combos[optionName] !== value) return false

      return Object.entries(selected).every(([selectedOptionName, selectedValue]) => {
        if (!selectedValue || selectedOptionName === optionName) return true
        return variant.combos[selectedOptionName] === selectedValue
      })
    })
  }

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
      creditDownPaymentPercent,
      image: product.images[0] || '',
      quantity: 1,
      isService: isServiceProduct,
      selectedOptions: optionsArray.length > 0 ? optionsArray : undefined,
    })

    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  if (!hasOptions) {
    return (
      <section className="rounded-[32px] border border-gray-200 bg-white p-6 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.35)] sm:p-8">
        <div className="border-b border-gray-100 pb-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-600">
              Compra directa
            </span>
            <span className="rounded-full bg-orange-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700">
              Credito ZAP {creditDownPaymentPercent}%
            </span>
          </div>

          <h2 className="mt-4 text-2xl font-black text-gray-950 sm:text-3xl">
            Listo para cerrar desde esta misma ficha.
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-gray-600">
            Agrupamos precio, condiciones y accion principal para que la decision se sienta clara
            y profesional tambien en desktop.
          </p>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px] xl:items-stretch">
          <div className="rounded-[28px] bg-gray-950 p-6 text-white shadow-[0_28px_80px_-42px_rgba(15,23,42,0.7)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
              Precio final
            </p>

            {simpleProductAvailable ? (
              <>
                <div className="mt-3 flex items-end gap-2">
                  <span className="text-4xl font-black tracking-tight sm:text-5xl">
                    ${product.price.toLocaleString('es-AR')}
                  </span>
                  <span className="mb-2 text-sm font-semibold text-gray-400">ARS</span>
                </div>
                <p className="mt-2 text-sm text-gray-300">Precio unitario final con IVA incluido.</p>
              </>
            ) : (
              <>
                <p className="mt-3 text-3xl font-black text-orange-300">No disponible</p>
                <p className="mt-2 text-sm text-gray-300">
                  Este producto todavia no esta listo para compra online.
                </p>
              </>
            )}

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                  Disponibilidad
                </p>
                <p className="mt-2 text-sm font-semibold text-white">{availabilityLabel}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                  Pago flexible
                </p>
                <p className="mt-2 text-sm font-semibold text-white">
                  Tarjeta o Credito ZAP desde {creditDownPaymentPercent}% de anticipo.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!canAddToCart || added}
            className={`
              flex min-h-[88px] w-full items-center justify-center gap-2 rounded-[28px] px-6 py-5 text-center font-bold transition-all
              ${
                added
                  ? 'bg-green-500 text-white shadow-lg shadow-green-500/30 ring-4 ring-green-100'
                  : canAddToCart
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 hover:-translate-y-0.5 hover:bg-orange-400'
                    : 'cursor-not-allowed bg-gray-200 text-gray-500'
              }
            `}
          >
            {added ? <Check size={20} /> : <ShoppingCart size={20} />}
            {added ? 'Agregado al carrito' : addToCartLabel}
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-[32px] border border-gray-200 bg-white p-6 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.35)] sm:p-8">
      <div className="flex flex-col gap-4 border-b border-gray-100 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-600">
              Configura tu pedido
            </span>
            <span className="rounded-full bg-orange-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700">
              Credito ZAP {creditDownPaymentPercent}%
            </span>
          </div>

          <h2 className="mt-4 text-2xl font-black text-gray-950 sm:text-3xl">
            Elige variantes con una lectura mas ordenada.
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-gray-600">
            Marcamos lo obligatorio, desactivamos combinaciones que no aplican y actualizamos el
            precio sin esconder informacion clave.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700">
            {selectedCount} seleccionadas
          </span>
          <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700">
            {requiredCount} requeridas
          </span>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {product.options.map((option) => (
          <div
            key={option.id}
            className="rounded-[28px] border border-gray-200 bg-gray-50/70 p-4 sm:p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">{option.name}</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {option.isRequired
                    ? 'Necesaria para calcular la variante exacta.'
                    : 'Opcional para ajustar el resultado final.'}
                </p>
              </div>
              {option.isRequired && (
                <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                  Requerido
                </span>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {option.values.map((value) => {
                const isSelected = selected[option.name] === value.value
                const isAvailable = isOptionValueAvailable(option.name, value.value)

                return (
                  <button
                    key={value.id}
                    type="button"
                    onClick={() => handleSelect(option.name, value.value)}
                    disabled={!isAvailable && !isSelected}
                    className={`
                      relative rounded-2xl border-2 p-3.5 text-left transition-all duration-150
                      ${
                        isSelected
                          ? 'border-orange-500 bg-orange-50 shadow-md shadow-orange-100/50 ring-2 ring-orange-100'
                          : isAvailable
                            ? 'border-gray-200 bg-white hover:border-orange-200 hover:bg-orange-50/40'
                            : 'cursor-not-allowed border-gray-100 bg-gray-100 text-gray-300 opacity-55'
                      }
                    `}
                  >
                    <span
                      className={`block text-sm font-semibold ${
                        isSelected
                          ? 'text-orange-900'
                          : isAvailable
                            ? 'text-gray-700'
                            : 'text-gray-400'
                      }`}
                    >
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
      </div>

      <div className="mt-6 rounded-[28px] bg-gray-950 p-6 text-white shadow-[0_28px_80px_-42px_rgba(15,23,42,0.7)]">
        <div className="flex flex-col gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
              Precio final
            </p>
            <div className="mt-3 flex flex-wrap items-end gap-2">
              {displayPrice !== null ? (
                <>
                  {!activeVariant && (
                    <span className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-gray-400">
                      Desde
                    </span>
                  )}
                  <span className="text-4xl font-black tracking-tight sm:text-5xl">
                    ${displayPrice.toLocaleString('es-AR')}
                  </span>
                  <span className="mb-2 text-sm font-semibold text-gray-400">ARS</span>
                </>
              ) : (
                <span className="text-3xl font-black text-orange-300">Consultar</span>
              )}
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-300">{guidanceMessage}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                Estado
              </p>
              <p className="mt-2 text-sm font-semibold text-white">{summaryStateLabel}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                Pago flexible
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                Tarjeta o Credito ZAP desde {creditDownPaymentPercent}% de anticipo.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!canAddToCart || added}
            className={`
              flex w-full items-center justify-center gap-2 rounded-[24px] px-8 py-4 font-bold transition-all
              ${
                added
                  ? 'bg-green-500 text-white shadow-lg shadow-green-500/30 ring-4 ring-green-100'
                  : canAddToCart
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 hover:-translate-y-0.5 hover:bg-orange-400'
                    : 'cursor-not-allowed border border-gray-700 bg-gray-800 text-gray-500'
              }
            `}
          >
            {added ? <Check size={20} /> : <ShoppingCart size={20} />}
            {added ? 'Agregado al carrito' : addToCartLabel}
          </button>
        </div>
      </div>
    </section>
  )
}
