'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, UploadCloud, X, Save, AlertCircle } from 'lucide-react'
import ProductOptionsConfigurator from './ProductOptionsConfigurator'

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
  const router = useRouter()
  const [images, setImages] = useState<string[]>(product?.images || [])
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasVariants, setHasVariants] = useState((initialOptions?.length || product?.options?.length) > 0 || false)

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
      } catch (e) {
        alert('Error al subir imagen')
      }
    }

    setImages((prev) => [...prev, ...newUrls])
    setUploading(false)
  }

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const formData = new FormData(e.currentTarget)
      formData.append('images', JSON.stringify(images))
      
      // La subida de options y variants ya viene en inputs hidden desde ProductOptionsConfigurator, 
      // y están listos como JSON strings ('options' y 'variants')
      
      if (!formData.get('active')) formData.set('active', 'false')
      else formData.set('active', 'true')

      await action(formData)
    } catch (err: any) {
      setError(err.message || 'Error al guardar el producto')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/productos" className="btn-secondary !p-2">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {product ? 'Editar producto' : 'Nuevo producto'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-3 grid md:grid-cols-2 gap-6">
          <div className="card p-6 space-y-4">
            <h2 className="font-bold text-gray-900 border-b border-gray-100 pb-3">Información básica</h2>

            <div>
              <label className="label">Nombre del producto *</label>
              <input type="text" name="name" defaultValue={product?.name} required className="input" placeholder="Ej: Tarjetas 350gr MATE" />
            </div>

            <div>
              <label className="label">Slug (URL) *</label>
              <input type="text" name="slug" defaultValue={product?.slug} required className="input font-mono !text-sm text-gray-500" placeholder="tarjetas-350gr-mate" />
              <p className="text-xs text-gray-500 mt-1">Solo minúsculas, números y guiones</p>
            </div>

            <div>
              <label className="label">Descripción</label>
              <textarea name="description" defaultValue={product?.description} rows={4} className="input resize-none" placeholder="Características detalladas, gramaje, tiempos de producción..." />
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-bold text-gray-900 border-b border-gray-100 pb-3 mb-4">Pricing e Inventario</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Precio ARS *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">$</span>
                  <input type="number" name="price" defaultValue={product?.price} step="0.01" min="0" required={!hasVariants} disabled={hasVariants} className="input !pl-8 disabled:opacity-60 disabled:bg-gray-50" placeholder="0.00" />
                </div>
              </div>

              <div>
                <label className="label">Stock inicial *</label>
                <input type="number" name="stock" defaultValue={product?.stock ?? 100} min="0" required={!hasVariants} disabled={hasVariants} className="input disabled:opacity-60 disabled:bg-gray-50" />
              </div>
            </div>
            {hasVariants && (
              <p className="text-xs text-orange-600 mt-3 font-medium bg-orange-50 p-2.5 rounded-xl border border-orange-100 flex items-center gap-2">
                 <AlertCircle size={14} /> El precio y stock se definen individualmente en la matriz de variantes.
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

        <div className="md:col-span-3 space-y-6">
          <div className="card p-6">
            <h2 className="font-bold text-gray-900 border-b border-gray-100 pb-3 mb-4">Clasificación</h2>

            <div className="space-y-4">
              <div>
                <label className="label">Categoría *</label>
                <select name="categoryId" defaultValue={product?.categoryId} required className="input">
                  <option value="">Seleccionar...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="active" defaultChecked={product ? product.active : true} className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500" />
                  <div>
                    <span className="block text-sm font-semibold text-gray-900">Producto Activo</span>
                    <span className="block text-xs text-gray-500">Visible en la tienda pública</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-bold text-gray-900 border-b border-gray-100 pb-3 mb-4">Imágenes</h2>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {images.map((url, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group border border-gray-200">
                  <Image src={url} alt={`Preview ${i}`} fill className="object-cover" />
                  <button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <X size={14} />
                  </button>
                </div>
              ))}

              <label className="aspect-square rounded-xl border-2 border-dashed border-gray-200 hover:border-orange-400 bg-gray-50 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors">
                {uploading ? (
                  <span className="text-xs text-gray-500 font-medium animate-pulse">Subiendo...</span>
                ) : (
                  <>
                     <UploadCloud size={24} className="text-gray-400" />
                     <span className="text-xs text-gray-500 font-medium">Agregar</span>
                  </>
                )}
                <input type="file" multiple accept="image/*" onChange={handleUpload} className="hidden" disabled={uploading} />
              </label>
            </div>
            <p className="text-xs text-gray-400 text-center">JPG, PNG o WEBP. Max 5MB c/u.</p>
          </div>

          {error && (
            <div className="card p-4 bg-red-50 text-red-700 flex items-start gap-3 border-red-100">
              <AlertCircle size={20} className="shrink-0 mt-0.5"/>
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <button type="submit" disabled={loading || uploading} className="btn-primary w-full justify-center !py-3.5 shadow-xl">
             <Save size={18} /> {loading ? 'Guardando...' : 'Guardar producto'}
          </button>
        </div>
      </form>
    </div>
  )
}
