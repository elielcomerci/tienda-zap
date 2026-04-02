'use client'

import { useState } from 'react'
import { CreditCard, Loader2 } from 'lucide-react'

interface MpInstallmentPayButtonProps {
  installmentId: string
  amount: number
  sequence: number
}

/**
 * Botón para pagar una cuota de Crédito ZAP directamente con MercadoPago.
 * Genera un link de pago por el importe exacto de la cuota y redirige al checkout de MP.
 */
export default function MpInstallmentPayButton({
  installmentId,
  amount,
  sequence,
}: MpInstallmentPayButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handlePay = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/creditos/cuotas/${installmentId}/mp-payment`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al generar el link de pago')
      window.location.href = data.initPoint
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error. Intentá de nuevo.')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-1.5">
      <button
        onClick={handlePay}
        disabled={loading}
        className="btn-primary w-full justify-center !py-2 !text-sm"
      >
        {loading ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <CreditCard size={15} />
        )}
        {loading
          ? 'Redirigiendo...'
          : `Pagar cuota #${sequence} con MercadoPago · $${amount.toLocaleString('es-AR')}`}
      </button>
      {error && <p className="text-center text-xs text-red-600">{error}</p>}
    </div>
  )
}
