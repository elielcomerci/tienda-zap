'use client'

import { useState } from 'react'
import { CreditCard, Loader2 } from 'lucide-react'

interface ResumePaymentButtonProps {
  orderId: string
  accessToken?: string
  className?: string
  label?: string
}

/**
 * Botón para retomar un pago de MercadoPago pendiente.
 * Llama al endpoint /api/checkout/mercadopago/resume para recuperar
 * el initPoint de la preferencia existente (o crear una nueva si expiró).
 */
export default function ResumePaymentButton({
  orderId,
  accessToken,
  className,
  label = 'Retomar pago con MercadoPago',
}: ResumePaymentButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleResume = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/checkout/mercadopago/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, token: accessToken }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al recuperar el pago')
      window.location.href = data.initPoint
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error. Intenta de nuevo.')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleResume}
        disabled={loading}
        className={
          className ??
          'btn-primary w-full justify-center'
        }
      >
        {loading ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <CreditCard size={18} />
        )}
        {loading ? 'Redirigiendo a MercadoPago...' : label}
      </button>
      {error && <p className="text-center text-xs text-red-600">{error}</p>}
    </div>
  )
}
