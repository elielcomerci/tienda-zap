'use client'

import { useState, useTransition } from 'react'
import { FileUp, Loader2 } from 'lucide-react'
import { addOrderItemBriefReferenceFile } from '@/lib/actions/orders'

type BriefReferenceItem = {
  id: string
  product: { name: string }
  briefType?: string | null
}

export default function BriefReferenceUploader({
  orderId,
  accessToken,
  items,
}: {
  orderId: string
  accessToken?: string
  items: BriefReferenceItem[]
}) {
  const briefItems = items.filter((item) => item.briefType && item.briefType !== 'NONE')
  const [activeItemId, setActiveItemId] = useState(briefItems[0]?.id || '')
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)

  if (briefItems.length === 0) return null

  const handleUpload = async (file?: File | null) => {
    if (!file || !activeItemId) return
    setUploading(true)
    setMessage('')

    try {
      const response = await fetch(
        `/api/orders/${orderId}/items/${activeItemId}/brief-references/presigned`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accessToken,
            fileName: file.name,
            contentType: file.type,
            sizeBytes: file.size,
          }),
        }
      )
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No pudimos preparar la subida.')

      const uploadResponse = await fetch(data.signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': data.contentType },
        body: file,
      })
      if (!uploadResponse.ok) throw new Error('No pudimos subir el archivo a R2.')

      startTransition(async () => {
        try {
          await addOrderItemBriefReferenceFile({
            orderId,
            itemId: activeItemId,
            accessToken,
            objectKey: data.objectKey,
            publicUrl: data.publicUrl,
            originalName: file.name,
            contentType: data.contentType,
            sizeBytes: file.size,
          })
          setMessage('Referencia cargada correctamente.')
        } catch (error: any) {
          setMessage(error.message || 'La referencia se subio, pero no pudimos guardarla.')
        }
      })
    } catch (error: any) {
      setMessage(error.message || 'No pudimos subir la referencia.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <section className="rounded-[32px] border border-[#F66B9A]/25 bg-white p-6 shadow-[0_18px_50px_-42px_rgba(237,44,113,0.28)] sm:p-8">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FEF1F6] text-[#ED2C71]">
          <FileUp size={22} />
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#ED2C71]">
            Referencias del brief
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-gray-950">
            Suma archivos de ejemplo.
          </h2>
          <p className="mt-3 text-sm leading-7 text-gray-600">
            Podes adjuntar imagenes, PDFs, audios o videos de inspiracion para el item correcto.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <select
          value={activeItemId}
          onChange={(event) => setActiveItemId(event.target.value)}
          className="input"
        >
          {briefItems.map((item) => (
            <option key={item.id} value={item.id}>
              {item.product.name}
            </option>
          ))}
        </select>

        <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gray-950 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-800">
          {uploading || isPending ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Subiendo...
            </>
          ) : (
            <>
              <FileUp size={16} />
              Cargar referencia
            </>
          )}
          <input
            type="file"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.mp3,.wav,.mp4,.mov,image/png,image/jpeg,image/webp,application/pdf,audio/mpeg,audio/wav,video/mp4,video/quicktime"
            disabled={uploading || isPending}
            onChange={(event) => {
              const file = event.target.files?.[0]
              void handleUpload(file)
              event.target.value = ''
            }}
          />
        </label>
      </div>

      {message && (
        <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-3 text-sm font-medium text-gray-700">
          {message}
        </div>
      )}
    </section>
  )
}
