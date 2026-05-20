'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowLeft,
  UploadCloud,
  X,
  Save,
  AlertCircle,
  Calculator,
  Music,
  Video,
  LinkIcon,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'
import ProductOptionsConfigurator from './ProductOptionsConfigurator'
import ProductRelationsPicker from './ProductRelationsPicker'
import ProductQuoterModal from './ProductQuoterModal'
import { slugify } from '@/lib/slug'
import { getFirstValidationError, productSchema } from '@/lib/validations'

type ProductMediaType = 'NONE' | 'AUDIO' | 'VIDEO' | 'YOUTUBE'

const PRODUCT_MEDIA_ACCEPT: Record<Exclude<ProductMediaType, 'NONE' | 'YOUTUBE'>, string> = {
  AUDIO: 'audio/mpeg,audio/mp3,audio/wav,audio/x-wav,.mp3,.wav',
  VIDEO: 'video/mp4,.mp4',
}

function getYouTubeEmbedUrl(url: string) {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, '')
    const videoId =
      host === 'youtu.be'
        ? parsed.pathname.split('/').filter(Boolean)[0]
        : parsed.pathname.startsWith('/shorts/')
          ? parsed.pathname.split('/').filter(Boolean)[1]
          : parsed.searchParams.get('v') ||
            (parsed.pathname.startsWith('/embed/')
              ? parsed.pathname.split('/').filter(Boolean)[1]
              : null)

    return videoId ? `https://www.youtube.com/embed/${videoId}` : url
  } catch {
    return url
  }
}

export default function ProductForm({
  product,
  categories,
  action,
  initialOptions,
  initialVariants,
  availableProducts,
  initialRelatedProductIds,
  availableIntentions,
  initialIntentionIds,
  availableBusinessTypes,
  initialTargetBusinessTypeIds,
}: {
  product?: any
  categories: Array<{
    id: string
    name: string
    slug: string
    isService: boolean
  }>
  action: (formData: FormData) => Promise<void>
  initialOptions?: any[]
  initialVariants?: any[]
  availableProducts: Array<{
    id: string
    name: string
    slug: string
    active: boolean
    images: string[]
    category: { name: string }
  }>
  initialRelatedProductIds?: string[]
  availableIntentions?: Array<{ id: string; name: string }>
  initialIntentionIds?: string[]
  availableBusinessTypes?: Array<{ id: string; name: string; slug: string }>
  initialTargetBusinessTypeIds?: string[]
}) {
  const [images, setImages] = useState<string[]>(product?.images || [])
  const [uploading, setUploading] = useState(false)
  const [mediaUploading, setMediaUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasVariants, setHasVariants] = useState(
    (initialOptions?.length || product?.options?.length) > 0 || false
  )
  const [selectedCategoryId, setSelectedCategoryId] = useState(product?.categoryId || '')

  const initialName = product?.name || ''
  const generatedInitialSlug = slugify(initialName)
  const initialSlug = product?.slug || generatedInitialSlug

  const [name, setName] = useState(initialName)
  const [slug, setSlug] = useState(initialSlug)
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(
    Boolean(product?.slug && product.slug !== generatedInitialSlug)
  )
  const [isQuoterOpen, setIsQuoterOpen] = useState(false)
  const [isCombo, setIsCombo] = useState(product?.isCombo ?? false)
  interface MediaTrack {
    id: string
    type: 'AUDIO' | 'VIDEO' | 'YOUTUBE'
    url: string
    title: string
    lyrics?: string
  }

  const [mediaList, setMediaList] = useState<MediaTrack[]>(() => {
    if (product?.mediaList && Array.isArray(product.mediaList)) {
      return product.mediaList as MediaTrack[]
    }
    if (product?.mediaUrl && product?.mediaType && product.mediaType !== 'NONE') {
      return [
        {
          id: 'legacy-media',
          type: product.mediaType as 'AUDIO' | 'VIDEO' | 'YOUTUBE',
          url: product.mediaUrl,
          title: product.mediaTitle || 'Demo del producto',
        },
      ]
    }
    return []
  })

  const [expandedLyricsTrackId, setExpandedLyricsTrackId] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newType, setNewType] = useState<'AUDIO' | 'VIDEO' | 'YOUTUBE'>('AUDIO')
  const [newUrl, setNewUrl] = useState('')

  const firstTrack = mediaList[0]
  const derivedMediaType = firstTrack ? firstTrack.type : 'NONE'
  const derivedMediaUrl = firstTrack ? firstTrack.url : ''
  const derivedMediaTitle = firstTrack ? firstTrack.title : ''
  
  const selectedCategory = categories.find((category) => category.id === selectedCategoryId)
  const isServiceCategory = Boolean(selectedCategory?.isService)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return
    setUploading(true)
    setError('')

    const files = Array.from(e.target.files)
    const newUrls: string[] = []

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Cada imagen debe pesar como maximo 5MB.')
        continue
      }

      const formData = new FormData()
      formData.append('file', file)

      try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData })
        if (!res.ok) throw new Error()
        const data = await res.json()
        newUrls.push(data.url)
      } catch {
        setError('No pudimos subir una de las imagenes. Intenta de nuevo.')
      }
    }

    setImages((prev) => [...prev, ...newUrls])
    setUploading(false)
  }

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
  }

  const handleTrackUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || (newType !== 'AUDIO' && newType !== 'VIDEO')) return

    setMediaUploading(true)
    setError('')

    try {
      const res = await fetch('/api/admin/product-media/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          sizeBytes: file.size,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No pudimos preparar la subida.')

      const uploadRes = await fetch(data.signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': data.contentType },
        body: file,
      })

      if (!uploadRes.ok) throw new Error('No pudimos subir el archivo a R2.')

      setNewUrl(data.publicUrl)
      setNewTitle((current) => current || file.name.split('.')[0])
    } catch (err: any) {
      setError(err.message || 'No pudimos subir el archivo multimedia. Intenta de nuevo.')
    } finally {
      setMediaUploading(false)
      event.target.value = ''
    }
  }

  const handleAddTrack = () => {
    if (!newTitle.trim()) {
      setError('Por favor, ingresa un título para la pista.')
      return
    }
    if (!newUrl.trim()) {
      setError('Por favor, sube un archivo o ingresa una URL válida.')
      return
    }

    try {
      if (newType !== 'YOUTUBE') new URL(newUrl)
    } catch {
      setError('La URL ingresada no es válida.')
      return
    }

    const track: MediaTrack = {
      id: `track-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: newType,
      url: newType === 'YOUTUBE' ? getYouTubeEmbedUrl(newUrl.trim()) : newUrl.trim(),
      title: newTitle.trim(),
    }

    setMediaList((prev) => [...prev, track])
    setNewTitle('')
    setNewUrl('')
    setError('')
  }

  const handleRemoveTrack = (id: string) => {
    setMediaList((prev) => prev.filter((t) => t.id !== id))
    if (expandedLyricsTrackId === id) setExpandedLyricsTrackId(null)
  }

  const handleUpdateTrackLyrics = (id: string, lyrics: string) => {
    setMediaList((prev) =>
      prev.map((track) => (track.id === id ? { ...track, lyrics } : track))
    )
  }

  const handleMoveTrack = (index: number, direction: 'up' | 'down') => {
    const nextIndex = direction === 'up' ? index - 1 : index + 1
    if (nextIndex < 0 || nextIndex >= mediaList.length) return

    const updated = [...mediaList]
    const temp = updated[index]
    updated[index] = updated[nextIndex]
    updated[nextIndex] = temp
    setMediaList(updated)
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextName = e.target.value
    setName(nextName)

    if (!slugManuallyEdited) {
      setSlug(slugify(nextName))
    }
  }

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextSlug = slugify(e.target.value)
    setSlug(nextSlug)
    setSlugManuallyEdited(nextSlug !== slugify(name))
  }

  const handleResetSlug = () => {
    const regeneratedSlug = slugify(name)
    setSlug(regeneratedSlug)
    setSlugManuallyEdited(false)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const formData = new FormData(e.currentTarget)
      formData.append('images', JSON.stringify(images))
      formData.append('mediaList', JSON.stringify(mediaList))

      if (!formData.get('active')) formData.set('active', 'false')
      else formData.set('active', 'true')

      if (isCombo) formData.set('isCombo', 'on')
      else formData.delete('isCombo')

      const raw = {
        name: formData.get('name') as string,
        slug: formData.get('slug') as string,
        description: (formData.get('description') as string) || '',
        price: formData.get('price'),
        creditDownPaymentPercent: formData.get('creditDownPaymentPercent'),
        categoryId: selectedCategoryId,
        stock: isServiceCategory ? 0 : formData.get('stock'),
        images,
        briefType: formData.get('briefType') as string,
        mediaType: derivedMediaType,
        mediaUrl: derivedMediaUrl,
        mediaTitle: derivedMediaTitle,
        mediaList,
        active: formData.get('active') === 'true',
        isCombo: isCombo,
        targetBusinessTypeIds: formData.getAll('targetBusinessTypeIds'),
        options: formData.get('options') ? JSON.parse(formData.get('options') as string) : [],
        variants: formData.get('variants') ? JSON.parse(formData.get('variants') as string) : [],
        relatedProductIds: formData.get('relatedProductIds')
          ? JSON.parse(formData.get('relatedProductIds') as string)
          : [],
        intentionIds: formData.getAll('intentionIds'),
      }

      const parsed = productSchema.safeParse(raw)
      if (!parsed.success) {
        setError(getFirstValidationError(parsed.error))
        setLoading(false)
        return
      }

      await action(formData)
    } catch (err: any) {
      setError(err.message || 'Error al guardar el producto')
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <ProductQuoterModal 
        isOpen={isQuoterOpen} 
        onClose={() => setIsQuoterOpen(false)} 
        onApplyVariants={(variants) => {
          const event = new CustomEvent('apply-quoter-variants', { detail: variants })
          window.dispatchEvent(event)
        }}
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/productos" className="btn-secondary !p-2">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            {product ? 'Editar Producto' : 'Nuevo Producto'}
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsQuoterOpen(true)}
            className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-600 transition-colors hover:bg-orange-100 flex items-center gap-2"
          >
            <Calculator size={18} />
            Cotizador Automático
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-3">
        <input type="hidden" name="mediaType" value={derivedMediaType} />
        <input type="hidden" name="mediaUrl" value={derivedMediaUrl} />
        <input type="hidden" name="mediaTitle" value={derivedMediaTitle} />
        <input type="hidden" name="mediaList" value={JSON.stringify(mediaList)} />

        <div className="grid gap-6 md:col-span-3 md:grid-cols-2">
          <div className="card space-y-4 p-6">
            <h2 className="border-b border-gray-100 pb-3 font-bold text-gray-900">
              Informacion basica
            </h2>

            <div>
              <label className="label">Nombre del producto *</label>
              <input
                type="text"
                name="name"
                value={name}
                onChange={handleNameChange}
                required
                className="input"
                placeholder="Ej: Tarjetas 350gr Mate"
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between gap-3">
                <label className="label !mb-0">Slug (URL) *</label>
                <button
                  type="button"
                  onClick={handleResetSlug}
                  className="text-xs font-semibold text-orange-600 hover:text-orange-700"
                >
                  Regenerar
                </button>
              </div>
              <input
                type="text"
                name="slug"
                value={slug}
                onChange={handleSlugChange}
                required
                className="input font-mono !text-sm text-gray-500"
                placeholder="tarjetas-350gr-mate"
              />
              <p className="mt-1 text-xs text-gray-500">
                Se genera automaticamente desde el nombre. Solo minusculas, numeros y guiones.
              </p>
            </div>

            <div>
              <label className="label">Descripcion</label>
              <textarea
                name="description"
                defaultValue={product?.description}
                rows={4}
                className="input resize-none"
                placeholder="Caracteristicas detalladas, gramaje, tiempos de produccion..."
              />
            </div>
          </div>

          <div className="card p-6">
            <h2 className="mb-4 border-b border-gray-100 pb-3 font-bold text-gray-900">
              Pricing e inventario
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Precio ARS *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-gray-400">
                    $
                  </span>
                  <input
                    type="number"
                    name="price"
                    defaultValue={product?.price}
                    step="0.01"
                    min="0"
                    required={!hasVariants}
                    disabled={hasVariants}
                    className="input !pl-8 disabled:bg-gray-50 disabled:opacity-60"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="label">Anticipo Credito ZAP *</label>
                <div className="relative">
                  <input
                    type="number"
                    name="creditDownPaymentPercent"
                    defaultValue={product?.creditDownPaymentPercent ?? 30}
                    min="30"
                    max="50"
                    step="1"
                    required
                    className="input !pr-10"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-semibold text-gray-400">
                    %
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Define el anticipo minimo para financiar este producto con Credito ZAP.
                </p>
              </div>

              {isServiceCategory ? (
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
                  Esta categoria esta marcada como servicio, asi que no manejamos stock fisico.
                </div>
              ) : (
                <div>
                  <label className="label">Stock inicial *</label>
                  <input
                    type="number"
                    name="stock"
                    defaultValue={product?.stock ?? 100}
                    min="0"
                    required={!hasVariants}
                    disabled={hasVariants}
                    className="input disabled:bg-gray-50 disabled:opacity-60"
                  />
                </div>
              )}
            </div>
            {hasVariants && (
              <p className="mt-3 flex items-center gap-2 rounded-xl border border-orange-100 bg-orange-50 p-2.5 text-xs font-medium text-orange-600">
                <AlertCircle size={14} />
                El precio y stock se definen individualmente en la matriz de variantes.
              </p>
            )}
            {isServiceCategory && (
              <p className="mt-3 flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 p-2.5 text-xs font-medium text-blue-700">
                <AlertCircle size={14} />
                Los servicios no piden archivos finales ni usan stock fisico en checkout.
              </p>
            )}
          </div>
        </div>

        <div className="md:col-span-3">
          <ProductOptionsConfigurator
            initialOptions={initialOptions || product?.options || []}
            initialVariants={initialVariants || product?.variants || []}
            basePrice={product?.price || 0}
            disableStock={isServiceCategory}
            onOptionsChange={setHasVariants}
          />
        </div>

        <div className="space-y-6 md:col-span-3">
          <div className="card p-6">
            <h2 className="mb-4 border-b border-gray-100 pb-3 font-bold text-gray-900">
              Clasificacion
            </h2>

            <div className="space-y-4">
              <div>
                <label className="label">Categoría *</label>
                <select
                  name="categoryId"
                  value={selectedCategoryId}
                  onChange={(event) => setSelectedCategoryId(event.target.value)}
                  required
                  className="input"
                >
                  <option value="">Seleccionar...</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    name="active"
                    defaultChecked={product ? product.active : true}
                    className="h-5 w-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                  />
                  <div>
                    <span className="block text-sm font-semibold text-gray-900">
                      Producto activo
                    </span>
                    <span className="block text-xs text-gray-500">
                      Visible en la tienda publica
                    </span>
                  </div>
                </label>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    name="isCombo"
                    checked={isCombo}
                    onChange={e => setIsCombo(e.target.checked)}
                    className="h-5 w-5 rounded border-gray-300 text-[#ED2C71] focus:ring-[#ED2C71]"
                  />
                  <div>
                    <span className="block text-sm font-semibold text-gray-900">
                      Es un Combo
                    </span>
                    <span className="block text-xs text-gray-500">
                      Aparece en la sección de Packs de la Home, segmentado por rubro
                    </span>
                  </div>
                </label>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <label className="label">Mini brief requerido</label>
                <select
                  name="briefType"
                  defaultValue={product?.briefType || 'NONE'}
                  className="input"
                >
                  <option value="NONE">Sin mini brief</option>
                  <option value="DESIGN">Diseño grafico</option>
                  <option value="MUSIC">Musica / jingle</option>
                  <option value="VIDEO">Video / reel</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Activa preguntas rapidas por item en carrito y checkout.
                </p>
              </div>
            </div>
          </div>

          {isCombo && availableBusinessTypes && availableBusinessTypes.length > 0 && (
            <div className="card p-6">
              <h2 className="mb-1 border-b border-gray-100 pb-3 font-bold text-gray-900">
                Rubros que pueden ver este Pack
              </h2>
              <p className="mb-4 text-xs text-gray-500">
                Si no seleccionás ninguno, el combo es visible para todos los rubros.
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {availableBusinessTypes.map((bt) => (
                  <label key={bt.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 p-3 hover:bg-gray-50 transition-colors">
                    <input
                      type="checkbox"
                      name="targetBusinessTypeIds"
                      value={bt.id}
                      defaultChecked={initialTargetBusinessTypeIds?.includes(bt.id)}
                      className="h-4 w-4 rounded border-gray-300 text-[#ED2C71] focus:ring-[#ED2C71]"
                    />
                    <span className="text-sm font-semibold text-gray-700">{bt.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <ProductRelationsPicker
            isCombo={isCombo}
            products={availableProducts}
            initialSelectedIds={initialRelatedProductIds || []}
          />

          {availableIntentions && availableIntentions.length > 0 && (
            <div className="card p-6">
              <h2 className="mb-4 border-b border-gray-100 pb-3 font-bold text-gray-900">
                Objetivos (Intenciones)
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {availableIntentions.map((intention) => (
                  <label key={intention.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 p-3 hover:bg-gray-50 transition-colors">
                    <input
                      type="checkbox"
                      name="intentionIds"
                      value={intention.id}
                      defaultChecked={initialIntentionIds?.includes(intention.id)}
                      className="h-4 w-4 rounded border-gray-300 text-[#ED2C71] focus:ring-[#ED2C71]"
                    />
                    <span className="text-sm font-semibold text-gray-700">{intention.name}</span>
                  </label>
                ))}
              </div>
              <p className="mt-3 text-xs text-gray-500">
                Seleccioná a qué objetivos comerciales responde este producto para que aparezca en la navegación por "Objetivos".
              </p>
            </div>
          )}

          <div className="card p-6">
            <h2 className="mb-4 border-b border-gray-100 pb-3 font-bold text-gray-900">
              Imagenes
            </h2>

            <div className="mb-4 grid grid-cols-2 gap-2">
              {images.map((url, index) => (
                <div
                  key={index}
                  className="group relative aspect-square overflow-hidden rounded-xl border border-gray-200 bg-gray-100"
                >
                  <Image src={url} alt={`Preview ${index}`} fill className="object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded bg-red-500 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}

              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 transition-colors hover:border-orange-400">
                {uploading ? (
                  <span className="animate-pulse text-xs font-medium text-gray-500">
                    Subiendo...
                  </span>
                ) : (
                  <>
                    <UploadCloud size={24} className="text-gray-400" />
                    <span className="text-xs font-medium text-gray-500">Agregar</span>
                  </>
                )}
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
            <p className="text-center text-xs text-gray-400">JPG, PNG o WEBP. Max 5MB c/u.</p>
          </div>

          <div className="card p-6">
            <h2 className="mb-4 border-b border-gray-100 pb-3 font-bold text-gray-900">
              Pistas y Demos Multimedia
            </h2>

            <div className="space-y-6">
              {/* Playlist Current State */}
              <div>
                <label className="label mb-2">Lista de pistas cargadas ({mediaList.length})</label>
                {mediaList.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
                    <Music size={32} className="mx-auto mb-2 text-gray-400 opacity-60" />
                    <p className="text-sm font-semibold text-gray-500">No hay pistas cargadas</p>
                    <p className="text-xs text-gray-400">Agrega audios de demo o videos abajo.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {mediaList.map((track, index) => (
                      <div
                        key={track.id}
                        className="rounded-xl border border-gray-200 bg-gray-50 p-3 transition-all hover:bg-gray-100/40 space-y-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            {/* Reordering Chevrons */}
                            <div className="flex flex-col gap-0.5">
                              <button
                                type="button"
                                onClick={() => handleMoveTrack(index, 'up')}
                                disabled={index === 0}
                                className="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700 disabled:opacity-30 disabled:hover:bg-transparent"
                              >
                                <ChevronUp size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveTrack(index, 'down')}
                                disabled={index === mediaList.length - 1}
                                className="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700 disabled:opacity-30 disabled:hover:bg-transparent"
                              >
                                <ChevronDown size={14} />
                              </button>
                            </div>

                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm border border-gray-100">
                              {track.type === 'AUDIO' && <Music size={16} className="text-orange-500" />}
                              {track.type === 'VIDEO' && <Video size={16} className="text-[#ED2C71]" />}
                              {track.type === 'YOUTUBE' && <LinkIcon size={16} className="text-red-500" />}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-gray-900">{track.title}</p>
                              <span className="inline-block rounded-md bg-gray-200/60 px-1.5 py-0.5 text-[10px] font-bold text-gray-600 uppercase tracking-wider">
                                {track.type === 'YOUTUBE' ? 'YouTube' : track.type}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {track.type === 'AUDIO' && (
                              <button
                                type="button"
                                onClick={() => setExpandedLyricsTrackId(expandedLyricsTrackId === track.id ? null : track.id)}
                                className={`rounded-lg px-2.5 py-1.5 text-xs font-bold border transition-colors ${
                                  expandedLyricsTrackId === track.id
                                    ? 'bg-slate-900 border-slate-950 text-white'
                                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                }`}
                              >
                                Letra (LRC)
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveTrack(track.id)}
                              className="rounded-lg p-2 text-red-500 bg-red-50 hover:bg-red-100 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        {track.type === 'AUDIO' && expandedLyricsTrackId === track.id && (
                          <div className="border-t border-gray-200/60 pt-3 mt-2">
                            <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 block mb-1">
                              Letra Sincronizada (LRC o SRT)
                            </label>
                            <textarea
                              value={track.lyrics || ''}
                              onChange={(e) => handleUpdateTrackLyrics(track.id, e.target.value)}
                              rows={5}
                              className="input font-mono !text-[11px] bg-white w-full resize-none p-2 border border-gray-200 rounded-lg focus:border-slate-800"
                              placeholder="Ej:&#10;[00:12.30] Primera línea de letra&#10;[00:15.50] Segunda línea de letra..."
                            />
                            <p className="text-[9px] text-gray-400 mt-1 leading-tight">
                              Escribe o pega la letra con marcas de tiempo `[minutos:segundos]`. Se sincronizará en tiempo real en la tienda.
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add New Track Form */}
              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Agregar Nueva Pista
                </h3>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label">Título de la pista</label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="input bg-white"
                      placeholder="Ej: Demo Acústico"
                    />
                  </div>

                  <div>
                    <label className="label">Tipo de pista</label>
                    <select
                      value={newType}
                      onChange={(e) => {
                        setNewType(e.target.value as any)
                        setNewUrl('')
                      }}
                      className="input bg-white"
                    >
                      <option value="AUDIO">Audio (R2 MP3/WAV)</option>
                      <option value="VIDEO">Video (R2 MP4)</option>
                      <option value="YOUTUBE">Enlace de YouTube</option>
                    </select>
                  </div>
                </div>

                {newType === 'YOUTUBE' ? (
                  <div>
                    <label className="label">Link de YouTube</label>
                    <div className="relative">
                      <LinkIcon
                        size={16}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="url"
                        value={newUrl}
                        onChange={(e) => setNewUrl(e.target.value)}
                        className="input bg-white !pl-10"
                        placeholder="https://www.youtube.com/watch?v=..."
                      />
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-4">
                    {newUrl ? (
                      <div className="flex items-center justify-between gap-3 rounded-lg border border-green-100 bg-green-50 p-2.5">
                        <span className="truncate text-xs font-semibold text-green-800">
                          {newUrl}
                        </span>
                        <button
                          type="button"
                          onClick={() => setNewUrl('')}
                          className="text-xs font-bold text-red-600 hover:text-red-700"
                        >
                          Quitar
                        </button>
                      </div>
                    ) : (
                      <label className="flex cursor-pointer items-center justify-center gap-3 rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-100 hover:text-orange-600">
                        {mediaUploading ? (
                          <span className="animate-pulse">Subiendo a R2...</span>
                        ) : (
                          <>
                            {newType === 'AUDIO' ? <Music size={18} /> : <Video size={18} />}
                            Cargar {newType === 'AUDIO' ? 'audio' : 'video'}
                          </>
                        )}
                        <input
                          type="file"
                          accept={PRODUCT_MEDIA_ACCEPT[newType as Exclude<typeof newType, 'YOUTUBE'>]}
                          onChange={handleTrackUpload}
                          className="hidden"
                          disabled={mediaUploading}
                        />
                      </label>
                    )}
                    <p className="mt-2 text-center text-[10px] text-gray-400">
                      {newType === 'AUDIO' ? 'MP3 o WAV' : 'MP4'} hasta 200MB. Se guarda en media.zap.com.ar.
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleAddTrack}
                  disabled={mediaUploading || !newTitle.trim() || !newUrl.trim()}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow transition-all hover:bg-slate-800 disabled:opacity-55"
                >
                  <Plus size={16} />
                  Añadir pista a la lista
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="card flex items-start gap-3 border-red-100 bg-red-50 p-4 text-red-700">
              <AlertCircle size={20} className="mt-0.5 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || uploading || mediaUploading}
            className="btn-primary w-full justify-center !py-3.5 shadow-xl"
          >
            <Save size={18} />
            {loading ? 'Guardando...' : 'Guardar producto'}
          </button>
        </div>
      </form>
    </div>
  )
}
