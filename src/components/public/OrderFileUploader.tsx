'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Download, LoaderCircle, MessageSquare, UploadCloud } from 'lucide-react'
import {
  finalizeOrderItemUpload,
  markOrderItemAsWhatsapp,
} from '@/lib/actions/orders'
import { MAX_ARTWORK_FILE_SIZE_BYTES } from '@/lib/order-files'

type UploadableOrderItem = {
  id: string
  quantity: number
  designRequested?: boolean | null
  artworkSubmissionChannel: string
  fileObjectKey?: string | null
  fileOriginalName?: string | null
  fileUrl?: string | null
  product: {
    name: string
  }
}

type UploadState = {
  uploading?: boolean
  markingWhatsapp?: boolean
  progress?: number
  error?: string
}

function uploadToSignedUrl(params: {
  signedUrl: string
  file: File
  contentType: string
  onProgress: (progress: number) => void
}) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', params.signedUrl)
    xhr.setRequestHeader('Content-Type', params.contentType)

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return
      const progress = Math.round((event.loaded / event.total) * 100)
      params.onProgress(progress)
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
        return
      }

      reject(new Error('No pudimos subir el archivo a R2.'))
    }

    xhr.onerror = () => reject(new Error('Se corto la conexion durante la subida.'))
    xhr.send(params.file)
  })
}

function getDownloadHref(orderId: string, itemId: string, accessToken?: string) {
  const params = new URLSearchParams()
  if (accessToken) params.set('token', accessToken)
  const query = params.toString()
  return `/api/orders/${orderId}/items/${itemId}/download${query ? `?${query}` : ''}`
}

export default function OrderFileUploader({
  orderId,
  accessToken,
  whatsappUrl,
  items,
}: {
  orderId: string
  accessToken?: string
  whatsappUrl?: string | null
  items: UploadableOrderItem[]
}) {
  const router = useRouter()
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const [itemState, setItemState] = useState<Record<string, UploadState>>({})

  const uploadableItems = items.filter((item) => !item.designRequested)

  if (uploadableItems.length === 0) {
    return null
  }

  const setStateForItem = (itemId: string, partialState: UploadState) => {
    setItemState((current) => ({
      ...current,
      [itemId]: {
        ...current[itemId],
        ...partialState,
      },
    }))
  }

  const handleFileUpload = async (item: UploadableOrderItem, file?: File | null) => {
    if (!file) return

    if (file.size > MAX_ARTWORK_FILE_SIZE_BYTES) {
      setStateForItem(item.id, {
        error: 'El archivo supera el maximo permitido de 150MB.',
      })
      return
    }

    setStateForItem(item.id, {
      uploading: true,
      progress: 0,
      error: '',
    })

    try {
      const presignedResponse = await fetch(
        `/api/orders/${orderId}/items/${item.id}/upload/presigned`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accessToken,
            fileName: file.name,
            contentType: file.type || 'application/octet-stream',
            sizeBytes: file.size,
          }),
        }
      )

      const presignedResult = await presignedResponse.json()
      if (!presignedResponse.ok) {
        throw new Error(presignedResult.error || 'No pudimos preparar la subida.')
      }

      await uploadToSignedUrl({
        signedUrl: presignedResult.signedUrl,
        file,
        contentType: presignedResult.contentType,
        onProgress: (progress) => {
          setStateForItem(item.id, { progress })
        },
      })

      await finalizeOrderItemUpload({
        orderId,
        itemId: item.id,
        accessToken,
        objectKey: presignedResult.objectKey,
        originalName: file.name,
        contentType: presignedResult.contentType,
        sizeBytes: file.size,
      })

      setStateForItem(item.id, {
        uploading: false,
        progress: 100,
        error: '',
      })
      router.refresh()
    } catch (error: any) {
      setStateForItem(item.id, {
        uploading: false,
        error: error.message || 'No pudimos subir el archivo.',
      })
    } finally {
      const input = inputRefs.current[item.id]
      if (input) input.value = ''
    }
  }

  const handleWhatsappChoice = async (item: UploadableOrderItem) => {
    setStateForItem(item.id, {
      markingWhatsapp: true,
      error: '',
    })

    try {
      await markOrderItemAsWhatsapp({
        orderId,
        itemId: item.id,
        accessToken,
      })

      setStateForItem(item.id, {
        markingWhatsapp: false,
        error: '',
      })
      router.refresh()
    } catch (error: any) {
      setStateForItem(item.id, {
        markingWhatsapp: false,
        error: error.message || 'No pudimos marcar el envio por WhatsApp.',
      })
    }
  }

  return (
    <section className="card p-6 space-y-5">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-bold text-gray-900">Archivos de impresion</h2>
        <p className="text-sm text-gray-600">
          Cada item necesita su archivo final. Podes cargarlo ahora o marcar que lo vas a enviar
          por WhatsApp.
        </p>
      </div>

      {whatsappUrl && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-emerald-900">Envio diferido por WhatsApp</p>
            <p className="text-sm text-emerald-800">
              Si preferis mandar los archivos mas tarde, podes abrir la conversacion ya armada con
              tu numero de orden.
            </p>
          </div>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-primary !bg-[#25D366] !shadow-[#25D366]/30 hover:!bg-[#1ebc5a]"
          >
            <MessageSquare size={16} /> Abrir WhatsApp
          </a>
        </div>
      )}

      <div className="grid gap-4">
        {uploadableItems.map((item) => {
          const state = itemState[item.id] || {}
          const hasUploadedFile = Boolean(item.fileObjectKey || item.fileUrl)
          const downloadHref = getDownloadHref(orderId, item.id, accessToken)

          return (
            <div key={item.id} className="rounded-2xl border border-gray-100 bg-gray-50/70 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div>
                    <p className="font-semibold text-gray-900">{item.product.name}</p>
                    <p className="text-xs text-gray-500">Cantidad: {item.quantity}</p>
                  </div>

                  {hasUploadedFile ? (
                    <div className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                      <CheckCircle2 size={14} /> Archivo cargado
                    </div>
                  ) : item.artworkSubmissionChannel === 'WHATSAPP' ? (
                    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      <MessageSquare size={14} /> Se enviara por WhatsApp
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                      <UploadCloud size={14} /> Esperando archivo
                    </div>
                  )}

                  {item.fileOriginalName && (
                    <p className="text-xs text-gray-500">Ultimo archivo: {item.fileOriginalName}</p>
                  )}
                </div>

                <div className="flex flex-col gap-3 lg:min-w-[280px]">
                  <input
                    ref={(element) => {
                      inputRefs.current[item.id] = element
                    }}
                    type="file"
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg,.tif,.tiff,.zip,.ai,.psd,.eps"
                    onChange={(event) => {
                      void handleFileUpload(item, event.target.files?.[0])
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => inputRefs.current[item.id]?.click()}
                    disabled={state.uploading || state.markingWhatsapp}
                    className="btn-secondary justify-center"
                  >
                    {state.uploading ? (
                      <>
                        <LoaderCircle size={16} className="animate-spin" /> Subiendo {state.progress || 0}%
                      </>
                    ) : hasUploadedFile ? (
                      <>
                        <UploadCloud size={16} /> Reemplazar archivo
                      </>
                    ) : (
                      <>
                        <UploadCloud size={16} /> Cargar archivo
                      </>
                    )}
                  </button>

                  {!hasUploadedFile && (
                    <button
                      type="button"
                      onClick={() => void handleWhatsappChoice(item)}
                      disabled={
                        state.uploading ||
                        state.markingWhatsapp ||
                        item.artworkSubmissionChannel === 'WHATSAPP'
                      }
                      className="btn-secondary justify-center"
                    >
                      {state.markingWhatsapp ? (
                        <>
                          <LoaderCircle size={16} className="animate-spin" /> Guardando...
                        </>
                      ) : item.artworkSubmissionChannel === 'WHATSAPP' ? (
                        <>
                          <MessageSquare size={16} /> Ya marcado para WhatsApp
                        </>
                      ) : (
                        <>
                          <MessageSquare size={16} /> Lo envio por WhatsApp
                        </>
                      )}
                    </button>
                  )}

                  {hasUploadedFile && (
                    <a href={downloadHref} className="btn-secondary justify-center">
                      <Download size={16} /> Descargar archivo
                    </a>
                  )}
                </div>
              </div>

              {state.uploading && (
                <div className="mt-4">
                  <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-full bg-orange-500 transition-all"
                      style={{ width: `${state.progress || 0}%` }}
                    />
                  </div>
                </div>
              )}

              {state.error && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {state.error}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-xs text-gray-500">
        Formatos permitidos: PDF, PNG, JPG, TIFF, ZIP, AI, PSD y EPS. Tamano maximo 150MB por
        archivo.
      </p>
    </section>
  )
}
