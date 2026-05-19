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
  const [mediaType, setMediaType] = useState<ProductMediaType>(product?.mediaType || 'NONE')
  const [mediaUrl, setMediaUrl] = useState(product?.mediaUrl || '')
  const [mediaTitle, setMediaTitle] = useState(product?.mediaTitle || '')
  
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

  const handleMediaTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextType = event.target.value as ProductMediaType
    setMediaType(nextType)
    if (nextType === 'NONE') {
      setMediaUrl('')
      setMediaTitle('')
    }
  }

  const handleMediaUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || (mediaType !== 'AUDIO' && mediaType !== 'VIDEO')) return

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

      setMediaType(data.mediaType)
      setMediaUrl(data.publicUrl)
      setMediaTitle((current) => current || file.name)
    } catch (err: any) {
      setError(err.message || 'No pudimos subir el archivo multimedia. Intenta de nuevo.')
    } finally {
      setMediaUploading(false)
      event.target.value = ''
    }
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
        mediaType,
        mediaUrl,
        mediaTitle,
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
        <input type="hidden" name="mediaType" value={mediaType} />
        <input type="hidden" name="mediaUrl" value={mediaUrl} />
        <input type="hidden" name="mediaTitle" value={mediaTitle} />

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

        <div className="md:col-span-3">
          <ProductRelationsPicker
            products={availableProducts}
            initialSelectedIds={initialRelatedProductIds || []}
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
              Audio y video
            </h2>

            <div className="grid gap-4">
              <div>
                <label className="label">Tipo de medio</label>
                <select value={mediaType} onChange={handleMediaTypeChange} className="input">
                  <option value="NONE">Sin medio adicional</option>
                  <option value="AUDIO">Audio subido a R2 (MP3/WAV)</option>
                  <option value="VIDEO">Video subido a R2 (MP4)</option>
                  <option value="YOUTUBE">Video desde YouTube</option>
                </select>
              </div>

              {mediaType !== 'NONE' && (
                <div>
                  <label className="label">Titulo del medio</label>
                  <input
                    type="text"
                    value={mediaTitle}
                    onChange={(event) => setMediaTitle(event.target.value)}
                    className="input"
                    placeholder="Ej: Demo de audio o video del producto"
                  />
                </div>
              )}

              {(mediaType === 'AUDIO' || mediaType === 'VIDEO') && (
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4">
                  <label className="flex cursor-pointer items-center justify-center gap-3 rounded-lg bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:text-orange-600">
                    {mediaUploading ? (
                      <span className="animate-pulse">Subiendo a R2...</span>
                    ) : (
                      <>
                        {mediaType === 'AUDIO' ? <Music size={18} /> : <Video size={18} />}
                        Cargar {mediaType === 'AUDIO' ? 'audio' : 'video'}
                      </>
                    )}
                    <input
                      type="file"
                      accept={PRODUCT_MEDIA_ACCEPT[mediaType]}
                      onChange={handleMediaUpload}
                      className="hidden"
                      disabled={mediaUploading}
                    />
                  </label>
                  <p className="mt-3 text-center text-xs text-gray-400">
                    {mediaType === 'AUDIO' ? 'MP3 o WAV' : 'MP4'} hasta 200MB. Se guarda en media.zap.com.ar.
                  </p>
                </div>
              )}

              {mediaType === 'YOUTUBE' && (
                <div>
                  <label className="label">Link de YouTube</label>
                  <div className="relative">
                    <LinkIcon
                      size={16}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="url"
                      value={mediaUrl}
                      onChange={(event) => setMediaUrl(event.target.value)}
                      className="input !pl-10"
                      placeholder="https://www.youtube.com/watch?v=..."
                    />
                  </div>
                </div>
              )}

              {mediaUrl && mediaType !== 'NONE' && (
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-950 p-3 text-white">
                  <div className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-gray-300">
                    <span>Preview</span>
                    <button
                      type="button"
                      onClick={() => {
                        setMediaUrl('')
                        setMediaTitle('')
                      }}
                      className="rounded bg-white/10 px-2 py-1 text-[11px] text-white hover:bg-white/20"
                    >
                      Quitar
                    </button>
                  </div>
                  {mediaType === 'AUDIO' && (
                    <audio controls src={mediaUrl} preload="none" className="w-full">
                      Tu navegador no soporta audio.
                    </audio>
                  )}
                  {mediaType === 'VIDEO' && (
                    <video controls src={mediaUrl} preload="metadata" className="aspect-video w-full rounded-lg bg-black">
                      Tu navegador no soporta video.
                    </video>
                  )}
                  {mediaType === 'YOUTUBE' && (
                    <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
                      <iframe
                        className="absolute inset-0 h-full w-full"
                        src={getYouTubeEmbedUrl(mediaUrl)}
                        title={mediaTitle || 'Video del producto'}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  )}
                </div>
              )}
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
