'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ReceiptText, UploadCloud } from 'lucide-react'

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
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-[28px] border border-gray-200 bg-white p-5 text-left shadow-[0_18px_50px_-42px_rgba(15,23,42,0.18)]"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
          <ReceiptText size={20} />
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
            Comprobante
          </p>
          <p className="mt-1 text-sm leading-7 text-gray-600">
            Si ya realizaste el pago por transferencia u otro medio, puedes subir el archivo aca y
            lo vinculamos a la orden.
          </p>
        </div>
      </div>

      <div>
        <label className="label font-semibold text-gray-900">Adjuntar archivo</label>
        <input
          name="file"
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.pdf"
          className="input"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-700">
          {success}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="btn-secondary w-full justify-center !py-3 !text-sm"
      >
        <UploadCloud size={16} />
        {isPending ? 'Enviando...' : 'Subir comprobante'}
      </button>
    </form>
  )
}
