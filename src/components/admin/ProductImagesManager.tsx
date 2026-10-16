'use client'

import { useRef, useState } from 'react'

type Props = {
  initialImages?: string[]
}

const MAX_IMAGES = 12

export default function ProductImagesManager({ initialImages = [] }: Props) {
  const [images, setImages] = useState<string[]>(initialImages)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return
    setError('')
    const selected = Array.from(files)
    if (images.length + selected.length > MAX_IMAGES) {
      setError(`Podés cargar hasta ${MAX_IMAGES} imágenes por producto.`)
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    setUploading(true)
    const uploaded: string[] = []
    try {
      for (const file of selected) {
        const body = new FormData()
        body.append('file', file)
        const response = await fetch('/api/admin/product-images', { method: 'POST', body })
        const result = await response.json()
        if (!response.ok || typeof result.url !== 'string') {
          throw new Error(result.error || `No se pudo cargar ${file.name}.`)
        }
        uploaded.push(result.url)
        setImages((current) => [...current, result.url])
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'No se pudieron cargar las imágenes.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function moveImage(index: number, direction: -1 | 1) {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= images.length) return
    setImages((current) => {
      const next = [...current]
      ;[next[index], next[nextIndex]] = [next[nextIndex], next[index]]
      return next
    })
  }

  return (
    <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
      <div>
        <h2 className="text-base font-semibold text-gray-950">Imágenes del producto</h2>
        <p className="mt-1 text-sm text-gray-600">Subí imágenes desde tu computadora. La primera será la principal. JPG, PNG, WebP, AVIF o GIF · hasta 10 MB por imagen.</p>
      </div>

      <input type="hidden" name="imagesJson" value={JSON.stringify(images)} />

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
          multiple
          disabled={uploading || images.length >= MAX_IMAGES}
          onChange={(event) => void uploadFiles(event.currentTarget.files)}
          className="block w-full max-w-xl text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-4 file:py-2 file:font-medium file:text-gray-800 hover:file:bg-gray-200 disabled:opacity-50"
        />
        <span className="text-xs text-gray-500">{images.length} de {MAX_IMAGES}</span>
        {uploading && <span role="status" className="text-sm text-gray-600">Cargando imágenes…</span>}
      </div>

      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {images.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((url, index) => (
            <li key={url} className="overflow-hidden rounded-xl border border-gray-200">
              <div className="relative aspect-square bg-gray-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Imagen ${index + 1} del producto`} className="h-full w-full object-contain" />
                {index === 0 && <span className="absolute left-2 top-2 rounded-md bg-gray-950/80 px-2 py-1 text-xs font-medium text-white">Principal</span>}
              </div>
              <div className="flex items-center justify-between gap-1 p-2">
                <div className="flex gap-1">
                  <button type="button" disabled={index === 0 || uploading} onClick={() => moveImage(index, -1)} aria-label="Mover imagen a la izquierda" className="rounded-md border border-gray-200 px-2 py-1 text-sm disabled:opacity-30">←</button>
                  <button type="button" disabled={index === images.length - 1 || uploading} onClick={() => moveImage(index, 1)} aria-label="Mover imagen a la derecha" className="rounded-md border border-gray-200 px-2 py-1 text-sm disabled:opacity-30">→</button>
                </div>
                <button type="button" disabled={uploading} onClick={() => setImages((current) => current.filter((_, imageIndex) => imageIndex !== index))} className="rounded-md px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-30">Quitar</button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center">
          <p className="text-sm font-medium text-gray-700">Todavía no hay imágenes</p>
          <p className="mt-1 text-sm text-gray-500">Cuando cargues una, vas a verla acá antes de guardar el producto.</p>
        </div>
      )}
    </section>
  )
}
