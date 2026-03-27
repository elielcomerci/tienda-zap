'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, UploadCloud, X, Save, AlertCircle } from 'lucide-react'
import ProductOptionsConfigurator from './ProductOptionsConfigurator'
import { slugify } from '@/lib/slug'

export default function ProductForm({
  product,
  categories,
  action,
  initialOptions,
  initialVariants,
}: {
  product?: any
  categories: any[]
  action: (formData: FormData) => Promise<void>
  initialOptions?: any[]
  initialVariants?: any[]
}) {
  const [images, setImages] = useState<string[]>(product?.images || [])
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasVariants, setHasVariants] = useState(
    (initialOptions?.length || product?.options?.length) > 0 || false
  )

  const initialName = product?.name || ''
  const generatedInitialSlug = slugify(initialName)
  const initialSlug = product?.slug || generatedInitialSlug

  const [name, setName] = useState(initialName)
  const [slug, setSlug] = useState(initialSlug)
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(
    Boolean(product?.slug && product.slug !== generatedInitialSlug)
  )

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return
    setUploading(true)

    const files = Array.from(e.target.files)
    const newUrls: string[] = []

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Una imagen supera los 5MB')
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
        alert('Error al subir imagen')
      }
    }

    setImages((prev) => [...prev, ...newUrls])
    setUploading(false)
  }

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
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

      await action(formData)
    } catch (err: any) {
      setError(err.message || 'Error al guardar el producto')
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/productos" className="btn-secondary !p-2">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {product ? 'Editar producto' : 'Nuevo producto'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-3">
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
            </div>
            {hasVariants && (
              <p className="mt-3 flex items-center gap-2 rounded-xl border border-orange-100 bg-orange-50 p-2.5 text-xs font-medium text-orange-600">
                <AlertCircle size={14} />
                El precio y stock se definen individualmente en la matriz de variantes.
              </p>
            )}
          </div>
        </div>

        <div className="md:col-span-3">
          <ProductOptionsConfigurator
            initialOptions={initialOptions || product?.options || []}
            initialVariants={initialVariants || product?.variants || []}
            basePrice={product?.price || 0}
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
                <label className="label">Categoria *</label>
                <select
                  name="categoryId"
                  defaultValue={product?.categoryId}
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
            </div>
          </div>

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

          {error && (
            <div className="card flex items-start gap-3 border-red-100 bg-red-50 p-4 text-red-700">
              <AlertCircle size={20} className="mt-0.5 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || uploading}
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
