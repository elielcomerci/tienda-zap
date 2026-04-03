'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { UploadCloud } from 'lucide-react'

export default function OrderReceiptUploader({
  orderId,
  accessToken,
}: {
  orderId: string
  accessToken?: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
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
        formData.append('orderId', orderId)
        if (accessToken) formData.append('accessToken', accessToken)

        const response = await fetch('/api/comprobante', {
          method: 'POST',
          body: formData,
        })
        const payload = await response.json()

        if (!response.ok) {
          throw new Error(payload.error || 'No pudimos subir el comprobante.')
        }

        setSuccess('Comprobante enviado exitosamente.')
        formElement.reset()
        router.refresh()
      } catch (submitError: any) {
        setError(submitError?.message || 'No pudimos subir el comprobante.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-gray-100 bg-white p-4 text-left">
      <div>
        <label className="label font-semibold text-gray-900">Adjuntar comprobante</label>
        <p className="mb-2 text-xs text-gray-500">
          Si pagaste por otros medios (transferencia o efectivo), podés subir el comprobante acá.
        </p>
        <input name="file" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" className="input !py-1.5 !text-sm" />
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-2 text-xs font-medium text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2 text-xs font-medium text-emerald-700">
          {success}
        </div>
      )}

      <button type="submit" disabled={isPending} className="btn-secondary w-full justify-center !py-2 !text-sm bg-gray-50">
        <UploadCloud size={16} />
        {isPending ? 'Enviando...' : 'Subir comprobante manual'}
      </button>
    </form>
  )
}
