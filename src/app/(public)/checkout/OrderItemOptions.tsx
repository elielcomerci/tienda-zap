'use client'

import { useState } from 'react'
import { useCartStore } from '@/lib/cart-store'
import { UploadCloud, CheckCircle2, MessageSquare, AlertCircle } from 'lucide-react'

export default function OrderItemOptions({ item }: { item: any }) {
  const { updateItemOptions } = useCartStore()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 25 * 1024 * 1024) {
      setError('El archivo supera los 25MB')
      return
    }

    setUploading(true)
    setError('')

    try {
      // Pedir URL firmada a Cloudflare R2
      const res = await fetch('/api/upload/r2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type || 'application/octet-stream' }),
      })

      if (!res.ok) throw new Error('Error al conectar con el servidor')
      const { signedUrl, publicUrl } = await res.json()

      // Subir archivo directamente a R2
      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
      })

      if (!uploadRes.ok) throw new Error('Error al subir el archivo')

      updateItemOptions(item.cartItemId!, { fileUrl: publicUrl, designRequested: false })
    } catch (err: any) {
      setError(err.message || 'Error al procesar el archivo')
    } finally {
      setUploading(false)
    }
  }

  const handleDesignRequest = () => {
    updateItemOptions(item.cartItemId!, { designRequested: true, fileUrl: undefined })
  }

  const clearOptions = () => {
    updateItemOptions(item.cartItemId!, { designRequested: false, fileUrl: undefined })
    setError('')
  }

  return (
    <div className="border border-gray-100 p-4 rounded-xl mt-3 bg-gray-50/50">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-900 text-sm">Archivo para {item.name}</h4>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <label
          className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-colors
            ${item.fileUrl
              ? 'border-green-500 bg-green-50 text-green-700'
              : 'border-dashed border-gray-200 hover:border-orange-400 bg-white'
            }`}
        >
          {uploading ? (
            <span className="text-sm font-medium animate-pulse text-gray-500">Subiendo...</span>
          ) : item.fileUrl ? (
            <div className="flex flex-col items-center gap-1 text-center">
              <CheckCircle2 size={24} className="text-green-500" />
              <span className="text-xs font-semibold">Archivo listo</span>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); clearOptions(); }}
                className="text-[10px] text-green-700 underline mt-1"
              >
                Cambiar archivo
              </button>
            </div>
          ) : (
            <>
              <UploadCloud size={24} className="text-gray-400 mb-2" />
              <span className="text-xs font-medium text-gray-600">Subir archivo (Max 25MB)</span>
              <span className="text-[10px] text-gray-400 mt-0.5">PDF, JPG, PNG, ZIP</span>
            </>
          )}
          <input
            type="file"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading || !!item.fileUrl}
            accept=".pdf,.jpg,.jpeg,.png,.zip,.rar,.ai,.cdr,.psd"
          />
        </label>

        <button
          type="button"
          onClick={item.designRequested ? clearOptions : handleDesignRequest}
          className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-colors
            ${item.designRequested
              ? 'border-orange-500 bg-orange-50 text-orange-700'
              : 'border-gray-200 hover:border-orange-400 bg-white text-gray-600'
            }`}
        >
          {item.designRequested ? (
            <>
              <CheckCircle2 size={24} className="text-orange-500 mb-1" />
              <span className="text-xs font-semibold text-center">Diseño solicitado</span>
            </>
          ) : (
            <>
              <MessageSquare size={24} className="text-gray-400 mb-2" />
              <span className="text-xs font-medium">Necesito diseño</span>
              <span className="text-[10px] text-gray-400 mt-0.5">Se coordina por WhatsApp</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 text-red-500 bg-red-50 p-2 rounded-lg text-xs font-medium">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}
    </div>
  )
}
