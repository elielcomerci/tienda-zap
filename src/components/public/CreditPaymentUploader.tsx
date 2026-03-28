'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { UploadCloud } from 'lucide-react'

export default function CreditPaymentUploader({
  installmentId,
}: {
  installmentId: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [paymentMethod, setPaymentMethod] = useState('TRANSFER')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const formElement = event.currentTarget
    const fileInput = formElement.elements.namedItem('file') as HTMLInputElement | null
    const file = fileInput?.files?.[0]

    if (!file) {
      setError('Selecciona un comprobante antes de enviar.')
      setSuccess('')
      return
    }

    startTransition(async () => {
      try {
        setError('')
        setSuccess('')

        const formData = new FormData()
        formData.append('file', file)
        formData.append('paymentMethod', paymentMethod)
        if (notes.trim()) {
          formData.append('notes', notes.trim())
        }

        const response = await fetch(`/api/creditos/cuotas/${installmentId}/comprobante`, {
          method: 'POST',
          body: formData,
        })
        const payload = await response.json()

        if (!response.ok) {
          throw new Error(payload.error || 'No pudimos subir el comprobante.')
        }

        setSuccess('Comprobante enviado. Lo vamos a revisar en breve.')
        formElement.reset()
        setNotes('')
        router.refresh()
      } catch (submitError: any) {
        setError(submitError?.message || 'No pudimos subir el comprobante.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="label">Medio informado</label>
          <select
            value={paymentMethod}
            onChange={(event) => setPaymentMethod(event.target.value)}
            className="input"
          >
            <option value="TRANSFER">Transferencia</option>
            <option value="CASH">Pago en efectivo</option>
            <option value="OTHER">Otro medio</option>
          </select>
        </div>

        <div>
          <label className="label">Comprobante</label>
          <input name="file" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" className="input !py-2" />
        </div>
      </div>

      <div>
        <label className="label">Notas opcionales</label>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={2}
          className="input resize-none"
          placeholder="Alias de la cuenta, detalle del pago o referencia util."
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {success}
        </div>
      )}

      <button type="submit" disabled={isPending} className="btn-primary justify-center !py-3">
        <UploadCloud size={16} />
        {isPending ? 'Enviando...' : 'Subir comprobante'}
      </button>
    </form>
  )
}
