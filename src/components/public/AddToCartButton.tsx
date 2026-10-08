'use client'

import { useCartStore, CartItem } from '@/lib/cart-store'
import { ShoppingCart, Check, ArrowRight } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'

export default function AddToCartButton({
  product,
  hasVariants,
  slug,
  productHref,
  disabled = false,
  consultUrl,
  consultLabel = 'Consultar',
}: {
  product: CartItem
  hasVariants?: boolean
  slug?: string
  productHref?: string
  disabled?: boolean
  consultUrl?: string | null
  consultLabel?: string
}) {
  const addItem = useCartStore((s) => s.addItem)
  const [added, setAdded] = useState(false)

  const handleAdd = () => {
    if (disabled) return
    addItem(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  // 1. Desarrollo -> "Ver desarrollo"
  if (product.catalogType === 'DESARROLLO' && slug) {
    return (
      <Link
        href={productHref || `/productos/${slug}`}
        className="inline-flex min-w-[136px] items-center justify-center gap-2 rounded-2xl border border-[#4576B9]/25 bg-[#EEF4FC] px-4 py-3 text-sm font-semibold text-[#2F5F9F] transition-all hover:-translate-y-0.5 hover:border-[#4576B9]/40 hover:bg-[#E2EDFA]"
      >
        Ver desarrollo <ArrowRight size={15} />
      </Link>
    )
  }

  // 2. Configurable -> "Configurar"
  if (hasVariants && slug) {
    return (
      <Link
        href={productHref || `/productos/${slug}`}
        className="inline-flex min-w-[136px] items-center justify-center gap-2 rounded-2xl border border-[#F7638B]/25 bg-[#FEF1F5] px-4 py-3 text-sm font-semibold text-[#C2103F] transition-all hover:-translate-y-0.5 hover:border-orange-300 hover:bg-[#FEF1F5]"
      >
        Configurar <ArrowRight size={15} />
      </Link>
    )
  }

  // 3. Solo consulta (sin precio / carrito) -> "Consultar" a la ficha del producto
  if (disabled && slug) {
    return (
      <Link
        href={productHref || `/productos/${slug}`}
        className="inline-flex min-w-[136px] items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-all hover:-translate-y-0.5 hover:border-[#F7638B]/25 hover:bg-[#FEF1F5] hover:text-[#C2103F]"
      >
        Consultar <ArrowRight size={15} />
      </Link>
    )
  }

  // 4. Compra directa -> "Agregar"
  return (
    <button
      type="button"
      onClick={handleAdd}
      disabled={disabled || added}
      className={`inline-flex min-w-[136px] items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition-all ${
        added
          ? 'bg-green-500 shadow-lg shadow-green-200'
          : disabled
            ? 'cursor-not-allowed bg-gray-300 shadow-sm shadow-gray-200'
            : 'bg-gray-950 shadow-lg shadow-gray-200 hover:-translate-y-0.5 hover:bg-[#ED164F] hover:shadow-[#ED164F]/20'
      }`}
    >
      {added ? <Check size={16} /> : <ShoppingCart size={16} />}
      {added ? 'Agregado' : 'Agregar'}
    </button>
  )
}
