'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, UploadCloud } from 'lucide-react'

export default function OrderInvoiceUploader({
  orderId,
  currentInvoiceUrl,
  currentInvoiceFileName,
}: {
  orderId: string
  currentInvoiceUrl?: string | null
  currentInvoiceFileName?: string | null
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
      setError('Selecciona una factura antes de guardar.')
      setSuccess('')
      return
    }

    startTransition(async () => {
      try {
        setError('')
        setSuccess('')

        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch(`/api/admin/orders/${orderId}/invoice`, {
          method: 'POST',
          body: formData,
        })
        const payload = await response.json()

        if (!response.ok) {
          throw new Error(payload.error || 'No pudimos guardar la factura.')
        }

        setSuccess('Factura guardada correctamente.')
        formElement.reset()
        router.refresh()
      } catch (submitError: any) {
        setError(submitError?.message || 'No pudimos guardar la factura.')
      }
    })
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
          <FileText size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">Factura de la compra</p>
          <p className="mt-1 text-xs text-gray-500">
            Sube el PDF o imagen emitida para que quede visible junto al pedido del cliente.
          </p>
          {currentInvoiceUrl && (
            <a
              href={currentInvoiceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex text-xs font-medium text-orange-600 hover:underline"
            >
              {currentInvoiceFileName || 'Ver factura actual'}
            </a>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <input
          name="file"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          className="input !py-1.5 !text-sm"
        />

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

        <button
          type="submit"
          disabled={isPending}
          className="btn-secondary w-full justify-center !py-2 !text-sm"
        >
          <UploadCloud size={16} />
          {isPending
            ? 'Guardando factura...'
            : currentInvoiceUrl
              ? 'Reemplazar factura'
              : 'Guardar factura'}
        </button>
      </form>
    </div>
  )
}
