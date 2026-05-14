'use client'

import { useCartStore, CartItem } from '@/lib/cart-store'
import { ShoppingCart, Check, ArrowRight, MessageCircleMore } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'

export default function AddToCartButton({
  product,
  hasVariants,
  slug,
  disabled = false,
  consultUrl,
  consultLabel = 'Consultar',
}: {
  product: CartItem
  hasVariants?: boolean
  slug?: string
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

  if (hasVariants && slug) {
    return (
      <Link
        href={`/productos/${slug}`}
        className="inline-flex min-w-[136px] items-center justify-center gap-2 rounded-2xl border border-[#F66B9A]/25 bg-[#FEF1F6] px-4 py-3 text-sm font-semibold text-[#C91F5B] transition-all hover:-translate-y-0.5 hover:border-orange-300 hover:bg-[#FEF1F6]"
      >
        Configurar <ArrowRight size={15} />
      </Link>
    )
  }

  if (disabled && consultUrl) {
    return (
      <Link
        href={consultUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-w-[136px] items-center justify-center gap-2 rounded-2xl border border-[#F66B9A]/25 bg-[#FEF1F6] px-4 py-3 text-sm font-semibold text-[#C91F5B] transition-all hover:-translate-y-0.5 hover:border-orange-300 hover:bg-[#FEF1F6]"
      >
        <MessageCircleMore size={16} />
        {consultLabel}
      </Link>
    )
  }

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
            : 'bg-gray-950 shadow-lg shadow-gray-200 hover:-translate-y-0.5 hover:bg-[#ED2C71] hover:shadow-[#ED2C71]/20'
      }`}
    >
      {added ? <Check size={16} /> : <ShoppingCart size={16} />}
      {added ? 'Agregado' : disabled ? 'No disponible' : 'Agregar'}
    </button>
  )
}
