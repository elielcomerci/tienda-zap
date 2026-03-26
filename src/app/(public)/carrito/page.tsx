'use client'

import { useCartStore } from '@/lib/cart-store'
import Image from 'next/image'
import Link from 'next/link'
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react'

export default function CartPage() {
  const { items, removeItem, updateQuantity, updateNotes, total, clearCart } = useCartStore()
  const count = useCartStore((s) => s.itemCount())

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <ShoppingBag size={64} className="mx-auto text-gray-200 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Tu carrito estÃ¡ vacÃ­o</h1>
        <p className="text-gray-500 mb-8">AgregÃ¡ productos para empezar tu pedido</p>
        <Link href="/productos" className="btn-primary">Ver productos</Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">
        Mi carrito <span className="text-gray-400 font-normal text-base">({count} {count === 1 ? 'item' : 'items'})</span>
      </h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div key={item.productId} className="card p-4">
              <div className="flex gap-4">
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                  {item.image ? (
                    <Image src={item.image} alt={item.name} width={80} height={80}
                      className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">ðŸ–¨ï¸</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-gray-900 text-sm line-clamp-2">{item.name}</h3>
                    <button onClick={() => removeItem(item.productId)}
                      className="text-gray-400 hover:text-red-500 transition-colors shrink-0">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <p className="text-orange-500 font-bold mt-1">
                    ${(item.price * item.quantity).toLocaleString('es-AR')}
                  </p>

                  <div className="flex items-center gap-3 mt-3">
                    <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1">
                      <button onClick={() => item.quantity > 1 ? updateQuantity(item.productId, item.quantity - 1) : removeItem(item.productId)}
                        className="w-7 h-7 rounded-lg bg-white shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors">
                        <Minus size={12} />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="w-7 h-7 rounded-lg bg-white shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors">
                        <Plus size={12} />
                      </button>
                    </div>
                    <span className="text-xs text-gray-400">${item.price.toLocaleString('es-AR')} c/u</span>
                  </div>

                  {/* Notas */}
                  <input
                    type="text"
                    placeholder="Nota para este producto (opcional)..."
                    value={item.notes || ''}
                    onChange={(e) => updateNotes(item.productId, e.target.value)}
                    className="input !py-1.5 !text-xs mt-2"
                  />
                </div>
              </div>
            </div>
          ))}

          <button onClick={clearCart} className="text-sm text-gray-400 hover:text-red-500 transition-colors">
            Vaciar carrito
          </button>
        </div>

        {/* Resumen */}
        <div className="space-y-4">
          <div className="card p-5 sticky top-24">
            <h2 className="font-bold text-gray-900 mb-4">Resumen del pedido</h2>
            <div className="space-y-2 mb-4">
              {items.map((item) => (
                <div key={item.productId} className="flex justify-between text-sm">
                  <span className="text-gray-600 truncate mr-2">{item.name} Ã—{item.quantity}</span>
                  <span className="font-medium shrink-0">${(item.price * item.quantity).toLocaleString('es-AR')}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-4 flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-orange-500">${total().toLocaleString('es-AR')}</span>
            </div>
            <Link href="/checkout" className="btn-primary w-full mt-5 justify-center !py-3.5">
              Continuar <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
