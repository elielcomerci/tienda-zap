'use client'

import { useCartStore, CartItem } from '@/lib/cart-store'
import { ShoppingCart, Check, ArrowRight } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'

export default function AddToCartButton({ product, hasVariants, slug }: { product: CartItem, hasVariants?: boolean, slug?: string }) {
  const addItem = useCartStore((s) => s.addItem)
  const [added, setAdded] = useState(false)

  const handleAdd = () => {
    addItem(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  if (hasVariants && slug) {
    return (
      <Link
        href={`/productos/${slug}`}
        className="btn-secondary !text-xs !py-1.5 !px-3 font-semibold !text-orange-600 !border-orange-200 hover:!bg-orange-50"
      >
        Opciones <ArrowRight size={14} className="ml-1" />
      </Link>
    )
  }

  return (
    <button
      onClick={handleAdd}
      className={`p-2.5 rounded-xl text-white transition-all shadow-sm ${
        added ? 'bg-green-500 shadow-green-200' : 'bg-orange-500 hover:bg-orange-600 shadow-orange-200'
      }`}
    >
      {added ? <Check size={16} /> : <ShoppingCart size={16} />}
    </button>
  )
}
