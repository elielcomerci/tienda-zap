'use client'

import { useState } from 'react'
import { CreditCard, Loader2 } from 'lucide-react'

interface ResumePaymentButtonProps {
  orderId: string
  accessToken?: string
  className?: string
  label?: string
}

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
      const response = await fetch('/api/checkout/mercadopago/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, token: accessToken }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || 'No pudimos recuperar el pago.')
      }

      window.location.href = payload.initPoint
    } catch (resumeError: any) {
      setError(resumeError.message || 'Ocurrio un error. Intenta de nuevo.')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleResume}
        disabled={loading}
        className={
          className ??
          'flex w-full items-center justify-center gap-2 rounded-[24px] bg-orange-500 px-6 py-4 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 transition-all hover:-translate-y-0.5 hover:bg-orange-400 disabled:cursor-wait disabled:opacity-80'
        }
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
        {loading ? 'Redirigiendo a MercadoPago...' : label}
      </button>
      {error && <p className="text-center text-xs text-red-600">{error}</p>}
    </div>
  )
}
