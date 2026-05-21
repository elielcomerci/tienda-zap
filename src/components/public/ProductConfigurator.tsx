'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Check, MessageCircleMore, PackageCheck, ShoppingCart } from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'
import { getLowestPurchasablePrice, isPurchasablePrice } from '@/lib/product-pricing'
import { calculateProductQuote, getQuoterMaterials } from '@/lib/pricing/product-quoter'

type ProductWithOptions = {
  id: string
  name: string
  price: number
  isCombo?: boolean
  creditDownPaymentPercent: number
  briefType?: string | null
  stock?: number
  images: string[]
  category: {
    name: string
    isService: boolean
  }
  options: {
    id: string
    name: string
    displayType?: string | null
    isRequired: boolean
    values: { id: string; value: string; colorHex?: string | null }[]
  }[]
  variants: {
    id: string
    price: number
    sku?: string | null
    stock?: number | null
    imageUrl?: string | null
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
  outgoingRelations?: {
    relatedProduct: ProductWithOptions
  }[]
  quoterConfig?: any
  [key: string]: any
}

function normalizeBriefType(value?: string | null) {
  return value === 'DESIGN' || value === 'MUSIC' || value === 'VIDEO' ? value : 'NONE'
}

export default function ProductConfigurator({
  product,
  inquiryUrl,
  onPreviewImageChange,
}: {
  product: ProductWithOptions
  inquiryUrl?: string | null
  onPreviewImageChange?: (imageUrl: string | null) => void
}) {
  const [selected, setSelected] = useState<Record<string, string>>({})
  const [comboSelections, setComboSelections] = useState<Record<string, Record<string, string>>>({})
  const [added, setAdded] = useState(false)
  const addItem = useCartStore((state) => state.addItem)

  const hasOptions = product.options && product.options.length > 0
  const comboParts = product.isCombo
    ? (product.outgoingRelations || []).map((relation) => relation.relatedProduct)
    : []
  const isDynamicCombo = product.isCombo && product.comboPricingMode === 'DYNAMIC'
  const comboDiscountPercent = Math.max(0, Math.min(100, Number(product.comboDiscountPercent || 0)))
  const isServiceProduct = product.category.isService
  const simpleProductAvailable = isPurchasablePrice(product.price)
  const creditDownPaymentPercent = product.creditDownPaymentPercent || 30
  const quoterConfig = product.quoterConfig
  const quoterMaterials = useMemo(
    () => (quoterConfig ? getQuoterMaterials(quoterConfig) : []),
    [quoterConfig]
  )
  const [quoteSelection, setQuoteSelection] = useState<Record<string, string>>({})

  const quoteResult = useMemo(() => {
    if (!quoterConfig || quoterMaterials.length === 0) return null

    const rawMaterialId = quoteSelection.rawMaterialId || quoterMaterials[0]?.id
    const sizeLabel = quoteSelection.sizeLabel || quoterConfig.sizePresets?.[0]?.label
    const quantity = Number(quoteSelection.quantity || quoterConfig.quantityPresets?.[0]?.quantity || 0)
    const finishingIds = quoteSelection.finishingIds
      ? quoteSelection.finishingIds.split(',').filter(Boolean)
      : []

    if (!rawMaterialId || !quantity) return null

    try {
      return calculateProductQuote(quoterConfig, {
        rawMaterialId,
        quantity,
        sizeLabel,
        finishingIds,
      })
    } catch {
      return null
    }
  }, [quoteSelection, quoterConfig, quoterMaterials])

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

  const comboPartsReady = useMemo(
    () =>
      comboParts.every((part) =>
        (part.options || [])
          .filter((option) => option.isRequired)
          .every((option) => Boolean(comboSelections[part.id]?.[option.name]))
      ),
    [comboParts, comboSelections]
  )

  const comboPartsBaseTotal = useMemo(() => {
    if (!isDynamicCombo) return null

    let total = 0
    for (const part of comboParts) {
      if (!part.options || part.options.length === 0) {
        if (!isPurchasablePrice(part.price)) return null
        total += part.price
        continue
      }

      const partSelections = comboSelections[part.id] || {}
      const selectedEntries = Object.entries(partSelections).filter(([, value]) => value)
      const requiredOptions = part.options.filter((option) => option.isRequired)
      const hasRequiredOptions = requiredOptions.every((option) => Boolean(partSelections[option.name]))
      if (!hasRequiredOptions) return null

      const matchingVariant = (part.variants || []).find((variant) => {
        const combos: Record<string, string> = {}
        variant.options.forEach((option) => {
          combos[option.optionValue.option.name] = option.optionValue.value
        })

        const comboKeys = Object.keys(combos)
        if (comboKeys.length !== selectedEntries.length) return false
        return selectedEntries.every(([key, value]) => combos[key] === value)
      })

      if (!matchingVariant || !isPurchasablePrice(matchingVariant.price)) return null
      total += matchingVariant.price
    }

    return total
  }, [comboParts, comboSelections, isDynamicCombo])

  const dynamicComboPrice =
    comboPartsBaseTotal === null
      ? null
      : Math.max(0, comboPartsBaseTotal * (1 - comboDiscountPercent / 100))
  const currentPrice = isDynamicCombo
    ? dynamicComboPrice ?? 0
    : activeVariant
      ? activeVariant.price
      : product.price

  const previewImageUrl = useMemo(() => {
    if (!hasOptions || variantCombinations.length === 0) return null
    if (activeVariant?.imageUrl) return activeVariant.imageUrl

    const selectedEntries = Object.entries(selected).filter(([, value]) => value)
    if (selectedEntries.length === 0) return null

    let bestMatch: { score: number; imageUrl: string } | null = null

    for (const variant of variantCombinations) {
      if (!variant.imageUrl) continue

      let score = 0
      let conflictsWithSelection = false

      for (const [index, option] of product.options.entries()) {
        const selectedValue = selected[option.name]
        if (!selectedValue) continue
        if (variant.combos[option.name] !== selectedValue) {
          conflictsWithSelection = true
          break
        }
        score += product.options.length - index
      }

      if (conflictsWithSelection) continue

      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { score, imageUrl: variant.imageUrl }
      }
    }

    return bestMatch?.imageUrl || null
  }, [activeVariant, hasOptions, product.options, selected, variantCombinations])

  useEffect(() => {
    onPreviewImageChange?.(previewImageUrl)
  }, [onPreviewImageChange, previewImageUrl])

  const canAddToCart = hasOptions
    ? Boolean(activeVariant) && allRequiredSelected && selectedVariantAvailable
    : simpleProductAvailable

  const canAddConfiguredProduct = isDynamicCombo
    ? comboPartsReady && dynamicComboPrice !== null && dynamicComboPrice > 0
    : canAddToCart && comboPartsReady

  const contextualMinPrice = useMemo(() => {
    if (!hasOptions) return minPrice
    if (matchingAvailableVariants.length === 0) return null
    return Math.min(...matchingAvailableVariants.map((variant) => variant.price))
  }, [hasOptions, matchingAvailableVariants, minPrice])

  const displayPrice =
    isDynamicCombo
      ? dynamicComboPrice
      :
    !activeVariant && hasOptions
      ? contextualMinPrice
      : isPurchasablePrice(currentPrice)
        ? currentPrice
        : null

  const addToCartLabel = added
    ? 'Agregado'
    : !comboPartsReady
      ? 'ConfigurÃ¡ el combo'
    : isDynamicCombo && dynamicComboPrice === null
      ? 'ElegÃ­ las piezas'
    : !hasOptions
      ? simpleProductAvailable
        ? 'Agregar al carrito'
        : 'No disponible'
      : !allRequiredSelected
        ? 'Elegí las opciones'
        : !activeVariant
          ? 'Completá la variante'
          : selectedVariantAvailable
            ? 'Agregar al carrito'
            : 'Variante no disponible'

  const selectedCount = Object.values(selected).filter(Boolean).length
  const requiredCount = hasOptions
    ? product.options.filter((option) => option.isRequired).length
    : 0

  const guidanceMessage = !allRequiredSelected
    ? 'Elegí las opciones requeridas.'
    : allRequiredSelected && !activeVariant
      ? 'Falta una combinación válida.'
      : activeVariant && !selectedVariantAvailable
        ? 'Esta combinación no está disponible.'
        : minPrice === null && !activeVariant
          ? 'Sin variantes disponibles online.'
          : 'Disponible para compra online o consulta guiada.'

  const summaryStateLabel = !allRequiredSelected
    ? 'Faltan requeridas'
    : activeVariant && selectedVariantAvailable
      ? 'Listo para sumar'
      : activeVariant
        ? 'Revisá la combinación'
        : 'Falta una opción'

  const availabilityLabel = isServiceProduct
    ? 'Servicio coordinado con ZAP'
    : product.stock && product.stock > 0
      ? `${product.stock} disponibles`
      : 'Sin stock online'

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

  const handleComboPartSelect = (productId: string, optionName: string, value: string) => {
    setComboSelections((previous) => ({
      ...previous,
      [productId]: {
        ...(previous[productId] || {}),
        [optionName]: previous[productId]?.[optionName] === value ? '' : value,
      },
    }))
  }

  const isComboPartOptionValueAvailable = (
    part: ProductWithOptions,
    optionName: string,
    value: string
  ) => {
    if (!part.variants || part.variants.length === 0) return true

    const partSelected = comboSelections[part.id] || {}
    return part.variants.some((variant) => {
      const combos: Record<string, string> = {}
      variant.options.forEach((option) => {
        combos[option.optionValue.option.name] = option.optionValue.value
      })

      if (!isPurchasablePrice(variant.price)) return false
      if (combos[optionName] !== value) return false

      return Object.entries(partSelected).every(([selectedOptionName, selectedValue]) => {
        if (!selectedValue || selectedOptionName === optionName) return true
        return combos[selectedOptionName] === selectedValue
      })
    })
  }

  const buildSelectedOptions = () => {
    const productOptions = Object.entries(selected)
      .filter(([, value]) => value !== '')
      .map(([name, value]) => ({ name, value }))

    const comboOptions = comboParts.flatMap((part) =>
      Object.entries(comboSelections[part.id] || {})
        .filter(([, value]) => value !== '')
        .map(([name, value]) => ({ name: `${part.name} / ${name}`, value }))
    )

    return [...productOptions, ...comboOptions]
  }

  const handleAddToCart = () => {
    if (!canAddConfiguredProduct) return

    const optionsArray = buildSelectedOptions()

    addItem({
      productId: product.id,
      name: product.name,
      price: currentPrice,
      creditDownPaymentPercent,
      image: previewImageUrl || product.images[0] || '',
      quantity: 1,
      isService: isServiceProduct,
      briefType: normalizeBriefType(product.briefType),
      selectedOptions: optionsArray.length > 0 ? optionsArray : undefined,
    })

    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  const handleAddQuotedToCart = () => {
    if (!quoteResult) return

    addItem({
      productId: product.id,
      name: product.name,
      price: quoteResult.totalPrice,
      creditDownPaymentPercent,
      image: product.images[0] || '',
      quantity: 1,
      isService: isServiceProduct,
      briefType: normalizeBriefType(product.briefType),
      selectedOptions: quoteResult.selectedOptions,
    })

    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  if (quoterConfig) {
    const selectedFinishingIds = quoteSelection.finishingIds
      ? quoteSelection.finishingIds.split(',').filter(Boolean)
      : []

    return (
      <section className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.35)] sm:p-7">
        <div className="border-b border-gray-100 pb-5">
          <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-600">
            Cotización automática
          </span>
          <h2 className="mt-4 text-2xl font-black text-gray-950 sm:text-3xl">
            Configurá tu pedido
          </h2>
        </div>

        <div className="mt-6 space-y-5">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Material</span>
            <select
              value={quoteSelection.rawMaterialId || quoterMaterials[0]?.id || ''}
              onChange={(event) =>
                setQuoteSelection((previous) => ({ ...previous, rawMaterialId: event.target.value }))
              }
              className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none focus:border-[#ED2C71]"
            >
              {quoterMaterials.map((material) => (
                <option key={material.id} value={material.id}>
                  {material.name}
                </option>
              ))}
            </select>
          </label>

          {quoterConfig.sizePresets.length > 0 && (
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Medida</span>
              <select
                value={quoteSelection.sizeLabel || quoterConfig.sizePresets[0]?.label || ''}
                onChange={(event) =>
                  setQuoteSelection((previous) => ({ ...previous, sizeLabel: event.target.value }))
                }
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none focus:border-[#ED2C71]"
              >
                {quoterConfig.sizePresets.map((size: any) => (
                  <option key={size.id || size.label} value={size.label}>
                    {size.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Cantidad</span>
            <select
              value={quoteSelection.quantity || String(quoterConfig.quantityPresets[0]?.quantity || '')}
              onChange={(event) =>
                setQuoteSelection((previous) => ({ ...previous, quantity: event.target.value }))
              }
              className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none focus:border-[#ED2C71]"
            >
              {quoterConfig.quantityPresets.map((preset: any) => (
                <option key={preset.id || preset.quantity} value={preset.quantity}>
                  {preset.label || preset.quantity}
                </option>
              ))}
            </select>
          </label>

          {quoterConfig.finishings.length > 0 && (
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Terminaciones</span>
              <div className="mt-2 grid gap-2">
                {quoterConfig.finishings.map((entry: any) => {
                  const finishing = entry.finishing
                  const selectedFinishing = selectedFinishingIds.includes(finishing.id)
                  return (
                    <label
                      key={finishing.id}
                      className="flex cursor-pointer items-center gap-3 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-800"
                    >
                      <input
                        type="checkbox"
                        checked={selectedFinishing}
                        onChange={() => {
                          const next = selectedFinishing
                            ? selectedFinishingIds.filter((id) => id !== finishing.id)
                            : [...selectedFinishingIds, finishing.id]
                          setQuoteSelection((previous) => ({ ...previous, finishingIds: next.join(',') }))
                        }}
                        className="rounded text-[#ED2C71]"
                      />
                      {finishing.name}
                    </label>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 rounded-[28px] bg-gray-950 p-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Precio final</p>
          {quoteResult ? (
            <div className="mt-3 flex items-end gap-2">
              <span className="text-4xl font-black tracking-tight sm:text-5xl">
                ${quoteResult.totalPrice.toLocaleString('es-AR')}
              </span>
            </div>
          ) : (
            <p className="mt-3 text-sm text-gray-300">Elegí una configuración válida.</p>
          )}

          <button
            type="button"
            onClick={handleAddQuotedToCart}
            disabled={!quoteResult}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ED2C71] px-5 py-3 text-sm font-black text-white transition hover:bg-[#C91F5B] disabled:cursor-not-allowed disabled:bg-gray-700"
          >
            {added ? <Check size={18} /> : <ShoppingCart size={18} />}
            {added ? 'Agregado' : 'Agregar al carrito'}
          </button>
        </div>
      </section>
    )
  }

  if (!hasOptions) {
    return (
      <section className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.35)] sm:p-7">
        <div className="border-b border-gray-100 pb-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-600">
              Pedido directo
            </span>
          </div>

          <h2 className="mt-4 text-2xl font-black text-gray-950 sm:text-3xl">
            Precio y pedido
          </h2>
        </div>

        <div className="mt-6 rounded-[28px] bg-gray-950 p-5 text-white shadow-[0_28px_80px_-42px_rgba(15,23,42,0.7)] sm:p-6">
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                Precio final
              </p>

              {displayPrice !== null ? (
                <>
                  <div className="mt-3 flex items-end gap-2">
                    <span className="text-4xl font-black tracking-tight sm:text-5xl">
                      ${displayPrice.toLocaleString('es-AR')}
                    </span>
                    <span className="mb-2 text-sm font-semibold text-gray-400">ARS</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-300">
                    {isDynamicCombo ? 'Total del combo según configuración.' : 'Precio unitario final.'}
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-3 text-3xl font-black text-[#F66B9A]">No disponible</p>
                  <p className="mt-2 text-sm text-gray-300">Sin pedido online por ahora.</p>
                </>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                  Disponibilidad
                </p>
                <p className="mt-2 text-sm font-semibold text-white">{availabilityLabel}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                  Pago
                </p>
                <p className="mt-2 text-sm font-semibold text-white">
                  Tarjeta, MercadoPago o transferencia.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!canAddConfiguredProduct || added}
                className={`
                  flex w-full items-center justify-center gap-2 rounded-[24px] px-8 py-4 font-bold transition-all
                  ${
                    added
                      ? 'bg-green-500 text-white shadow-lg shadow-green-500/30 ring-4 ring-green-100'
                      : canAddConfiguredProduct
                        ? 'bg-[#ED2C71] text-white shadow-lg shadow-[#ED2C71]/30 hover:-translate-y-0.5 hover:bg-[#F66B9A]'
                        : 'cursor-not-allowed border border-gray-700 bg-gray-800 text-gray-500'
                  }
                `}
              >
                {added ? <Check size={20} /> : <ShoppingCart size={20} />}
                {added ? 'Agregado al carrito' : addToCartLabel}
              </button>

              {inquiryUrl && (
                <Link
                  href={inquiryUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-[24px] border border-white/15 bg-white/10 px-6 py-4 font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-white/15"
                >
                  <MessageCircleMore size={20} />
                  Consultar
                </Link>
              )}
            </div>
          </div>
        </div>
        {comboParts.length > 0 && (
          <ComboPartsConfigurator
            parts={comboParts}
            selections={comboSelections}
            onSelect={handleComboPartSelect}
            isOptionValueAvailable={isComboPartOptionValueAvailable}
            isDynamicCombo={isDynamicCombo}
            baseTotal={comboPartsBaseTotal}
            discountPercent={comboDiscountPercent}
            finalPrice={dynamicComboPrice}
          />
        )}
      </section>
    )
  }

  return (
    <section className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.35)] sm:p-7">
      <div className="flex flex-col gap-4 border-b border-gray-100 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-600">
              Configurá tu pieza
            </span>
          </div>

          <h2 className="mt-4 text-2xl font-black text-gray-950 sm:text-3xl">
            Elegí las variantes
          </h2>
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
            className="rounded-[24px] border border-gray-200 bg-gray-50/70 p-4 sm:p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">{option.name}</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {option.isRequired ? 'Requerida' : 'Opcional'}
                </p>
              </div>
              {option.isRequired && (
                <span className="rounded-full bg-[#FEF1F6] px-3 py-1 text-xs font-semibold text-[#C91F5B]">
                  Requerido
                </span>
              )}
            </div>

            <div
              className={`mt-4 grid gap-2.5 ${
                option.displayType === 'COLOR_SWATCH'
                  ? 'grid-cols-3 sm:grid-cols-4'
                  : option.displayType === 'SIZE'
                    ? 'grid-cols-4 sm:grid-cols-6'
                    : 'grid-cols-2 sm:grid-cols-3'
              }`}
            >
              {option.values.map((value) => {
                const isSelected = selected[option.name] === value.value
                const isAvailable = isOptionValueAvailable(option.name, value.value)
                const isColorSwatch = option.displayType === 'COLOR_SWATCH'
                const isSize = option.displayType === 'SIZE'

                return (
                  <button
                    key={value.id}
                    type="button"
                    onClick={() => handleSelect(option.name, value.value)}
                    disabled={!isAvailable && !isSelected}
                    className={`
                      relative border-2 transition-all duration-150
                      ${isColorSwatch ? 'rounded-2xl p-2.5 text-center' : isSize ? 'rounded-xl px-3 py-3 text-center' : 'rounded-2xl p-3.5 text-left'}
                      ${
                        isSelected
                          ? 'border-[#ED2C71] bg-[#FEF1F6] shadow-md shadow-[#ED2C71]/10 ring-2 ring-[#FEF1F6]'
                          : isAvailable
                            ? 'border-gray-200 bg-white hover:border-[#F66B9A]/25 hover:bg-[#FEF1F6]/40'
                            : 'cursor-not-allowed border-gray-100 bg-gray-100 text-gray-300 opacity-55'
                      }
                    `}
                  >
                    {isColorSwatch && (
                      <span
                        className="mx-auto mb-2 block h-8 w-8 rounded-full border border-black/10 shadow-inner ring-2 ring-white"
                        style={{ backgroundColor: value.colorHex || value.value }}
                        aria-hidden="true"
                      />
                    )}
                    <span
                      className={`block font-semibold ${isSize ? 'text-base' : 'text-sm'} ${
                        isSelected
                          ? 'text-[#C91F5B]'
                          : isAvailable
                            ? 'text-gray-700'
                            : 'text-gray-400'
                      }`}
                    >
                      {value.value}
                    </span>
                    {isSelected && (
                      <div className="absolute right-2.5 top-2.5 text-[#ED2C71]">
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

      <div className="mt-6 rounded-[28px] bg-gray-950 p-5 text-white shadow-[0_28px_80px_-42px_rgba(15,23,42,0.7)] sm:p-6">
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
                <span className="text-3xl font-black text-[#F66B9A]">Consultar</span>
              )}
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-300">{guidanceMessage}</p>
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
                Pago
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                Tarjeta, MercadoPago o transferencia.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!canAddConfiguredProduct || added}
              className={`
                flex w-full items-center justify-center gap-2 rounded-[24px] px-8 py-4 font-bold transition-all
                ${
                  added
                    ? 'bg-green-500 text-white shadow-lg shadow-green-500/30 ring-4 ring-green-100'
                    : canAddConfiguredProduct
                      ? 'bg-[#ED2C71] text-white shadow-lg shadow-[#ED2C71]/30 hover:-translate-y-0.5 hover:bg-[#F66B9A]'
                      : 'cursor-not-allowed border border-gray-700 bg-gray-800 text-gray-500'
                }
              `}
            >
              {added ? <Check size={20} /> : <ShoppingCart size={20} />}
              {added ? 'Agregado al carrito' : addToCartLabel}
            </button>

            {inquiryUrl && (
              <Link
                href={inquiryUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-[24px] border border-white/15 bg-white/10 px-6 py-4 font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-white/15"
              >
                <MessageCircleMore size={20} />
                Consultar
              </Link>
            )}
          </div>
        </div>
      </div>
      {comboParts.length > 0 && (
        <ComboPartsConfigurator
          parts={comboParts}
          selections={comboSelections}
          onSelect={handleComboPartSelect}
          isOptionValueAvailable={isComboPartOptionValueAvailable}
          isDynamicCombo={isDynamicCombo}
          baseTotal={comboPartsBaseTotal}
          discountPercent={comboDiscountPercent}
          finalPrice={dynamicComboPrice}
        />
      )}
    </section>
  )
}

function ComboPartsConfigurator({
  parts,
  selections,
  onSelect,
  isOptionValueAvailable,
  isDynamicCombo,
  baseTotal,
  discountPercent,
  finalPrice,
}: {
  parts: ProductWithOptions[]
  selections: Record<string, Record<string, string>>
  onSelect: (productId: string, optionName: string, value: string) => void
  isOptionValueAvailable: (part: ProductWithOptions, optionName: string, value: string) => boolean
  isDynamicCombo: boolean
  baseTotal: number | null
  discountPercent: number
  finalPrice: number | null
}) {
  return (
    <div className="mt-6 rounded-[28px] border border-[#4576B9]/15 bg-[#EEF4FC]/45 p-5">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#2F5F9F]">
          <PackageCheck size={19} />
        </div>
        <div>
          <h3 className="text-lg font-black text-gray-950">Configuración de piezas incluidas</h3>
          <p className="mt-1 text-sm leading-6 text-gray-600">
            {isDynamicCombo
              ? 'Elegí las variantes de cada producto. El precio del combo se calcula con descuento sobre la suma de las piezas.'
              : 'El precio del pack es cerrado. Elegí las variantes necesarias para que cada pieza salga lista en el pedido.'}
          </p>
        </div>
      </div>

      {isDynamicCombo && (
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              Suma piezas
            </p>
            <p className="mt-2 text-lg font-black text-gray-950">
              {baseTotal !== null ? `$${baseTotal.toLocaleString('es-AR')}` : 'Pendiente'}
            </p>
          </div>
          <div className="rounded-2xl border border-white bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              Descuento combo
            </p>
            <p className="mt-2 text-lg font-black text-[#ED2C71]">{discountPercent}%</p>
          </div>
          <div className="rounded-2xl border border-white bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              Total pack
            </p>
            <p className="mt-2 text-lg font-black text-gray-950">
              {finalPrice !== null ? `$${finalPrice.toLocaleString('es-AR')}` : 'Configurá'}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {parts.map((part) => (
          <div key={part.id} className="rounded-[24px] border border-gray-200 bg-white p-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-base font-black text-gray-950">{part.name}</p>
                <p className="text-xs font-semibold text-gray-500">{part.category.name}</p>
              </div>
              {(!part.options || part.options.length === 0) && (
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                  Sin variantes
                </span>
              )}
            </div>

            {part.options && part.options.length > 0 && (
              <div className="mt-4 space-y-4">
                {part.options.map((option) => (
                  <div key={option.id}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-gray-900">{option.name}</p>
                      <span className="text-xs font-semibold text-gray-500">
                        {option.isRequired ? 'Requerida' : 'Opcional'}
                      </span>
                    </div>
                    <div
                      className={`grid gap-2 ${
                        option.displayType === 'COLOR_SWATCH'
                          ? 'grid-cols-3 sm:grid-cols-4'
                          : option.displayType === 'SIZE'
                            ? 'grid-cols-4 sm:grid-cols-6'
                            : 'grid-cols-2 sm:grid-cols-3'
                      }`}
                    >
                      {option.values.map((value) => {
                        const isSelected = selections[part.id]?.[option.name] === value.value
                        const isAvailable = isOptionValueAvailable(part, option.name, value.value)
                        const isColorSwatch = option.displayType === 'COLOR_SWATCH'

                        return (
                          <button
                            key={value.id}
                            type="button"
                            onClick={() => onSelect(part.id, option.name, value.value)}
                            disabled={!isAvailable && !isSelected}
                            className={`border-2 text-sm font-semibold transition-all ${
                              isColorSwatch ? 'rounded-2xl p-2.5 text-center' : 'rounded-2xl p-3 text-left'
                            } ${
                              isSelected
                                ? 'border-[#4576B9] bg-[#EEF4FC] text-[#2F5F9F]'
                                : isAvailable
                                  ? 'border-gray-200 bg-white text-gray-700 hover:border-[#4576B9]/30'
                                : 'cursor-not-allowed border-gray-100 bg-gray-100 text-gray-300'
                            }`}
                          >
                            {isColorSwatch && (
                              <span
                                className="mx-auto mb-2 block h-7 w-7 rounded-full border border-black/10 shadow-inner ring-2 ring-white"
                                style={{ backgroundColor: value.colorHex || value.value }}
                                aria-hidden="true"
                              />
                            )}
                            {value.value}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
