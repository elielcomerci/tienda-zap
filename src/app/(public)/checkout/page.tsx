'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/lib/cart-store'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CreditCard, Banknote, ArrowLeft, Smartphone } from 'lucide-react'

const schema = z.object({
  name: z.string().min(2, 'Nombre requerido'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(8, 'Teléfono inválido'),
  paymentType: z.enum(['MERCADOPAGO', 'TRANSFER', 'CASH']),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const paymentOptions = [
  { value: 'MERCADOPAGO', label: 'MercadoPago', desc: 'Tarjeta de crédito, débito o MP', icon: CreditCard },
  { value: 'TRANSFER', label: 'Transferencia', desc: 'CBU/CVU — subí tu comprobante', icon: Smartphone },
  { value: 'CASH', label: 'Efectivo', desc: 'Retiro y pago en local', icon: Banknote },
] as const

export default function CheckoutPage() {
  const { items, total, clearCart } = useCartStore()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { paymentType: 'MERCADOPAGO' },
  })

  const paymentType = watch('paymentType')

  if (items.length === 0) {
    router.replace('/carrito')
    return null
  }

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    setError('')

    const payload = {
      ...data,
      items: items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.price,
        name: i.name,
        notes: i.notes,
      })),
    }

    try {
      if (data.paymentType === 'MERCADOPAGO') {
        const res = await fetch('/api/checkout/mercadopago', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const result = await res.json()
        if (!res.ok) throw new Error(result.error)
        clearCart()
        window.location.href = result.initPoint
      } else {
        const res = await fetch('/api/ordenes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const result = await res.json()
        if (!res.ok) throw new Error(result.error)
        clearCart()
        router.push(`/checkout/success?orderId=${result.orderId}`)
      }
    } catch (e: any) {
      setError(e.message || 'Ocurrió un error, intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Finalizar pedido</h1>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Datos */}
            <div className="card p-6">
              <h2 className="font-bold text-gray-900 mb-4">Tus datos</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Nombre completo</label>
                  <input {...register('name')} className="input" placeholder="Juan García" />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="label">Teléfono / WhatsApp</label>
                  <input {...register('phone')} className="input" placeholder="1134567890" />
                  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Email</label>
                  <input {...register('email')} type="email" className="input" placeholder="juan@email.com" />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Notas adicionales (opcional)</label>
                  <textarea {...register('notes')} className="input resize-none" rows={2}
                    placeholder="Instrucciones especiales, tipo de papel, etc." />
                </div>
              </div>
            </div>

            {/* Pago */}
            <div className="card p-6">
              <h2 className="font-bold text-gray-900 mb-4">Método de pago</h2>
              <div className="space-y-3">
                {paymentOptions.map((opt) => (
                  <label key={opt.value}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all
                      ${paymentType === opt.value ? 'border-orange-400 bg-orange-50' : 'border-gray-100 hover:border-gray-200'}`}>
                    <input type="radio" value={opt.value} {...register('paymentType')} className="sr-only" />
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${paymentType === opt.value ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                      <opt.icon size={20} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{opt.label}</p>
                      <p className="text-xs text-gray-500">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm">{error}</div>
            )}
          </div>

          {/* Summary */}
          <div>
            <div className="card p-5 sticky top-24">
              <h2 className="font-bold text-gray-900 mb-4">Resumen</h2>
              <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.productId} className="flex justify-between text-sm">
                    <span className="text-gray-600 truncate mr-2">{item.name} ×{item.quantity}</span>
                    <span className="font-medium shrink-0">${(item.price * item.quantity).toLocaleString('es-AR')}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-4 flex justify-between font-bold text-lg mb-5">
                <span>Total</span>
                <span className="text-orange-500">${total().toLocaleString('es-AR')}</span>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center !py-3.5">
                {loading ? 'Procesando...' : paymentType === 'MERCADOPAGO' ? 'Pagar con MercadoPago' : 'Confirmar pedido'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
