'use client'

import { useCartStore, CartItem } from '@/lib/cart-store'
import { ShoppingCart, Check } from 'lucide-react'
import { useState } from 'react'

export default function AddToCartButton({ product }: { product: CartItem }) {
  const addItem = useCartStore((s) => s.addItem)
  const [added, setAdded] = useState(false)

  const handleAdd = () => {
    addItem(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
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
