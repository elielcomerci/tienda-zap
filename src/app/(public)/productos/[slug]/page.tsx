import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getProduct } from '@/lib/actions/products'
import ProductConfigurator from '@/components/public/ProductConfigurator'
import ProductImageGallery from '@/components/public/ProductImageGallery'
import { Package } from 'lucide-react'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const product = await getProduct(slug)
  if (!product) return { title: 'Producto no encontrado' }
  return { title: product.name, description: product.description || '' }
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const product = await getProduct(slug)
  if (!product || !product.active) notFound()

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="grid md:grid-cols-2 gap-10">
        {/* Imágenes Activas */}
        <div className="w-full">
          <ProductImageGallery images={product.images} productName={product.name} />
        </div>

        {/* Info */}
        <div>
          <p className="text-sm text-orange-500 font-semibold mb-2">{product.category.name}</p>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{product.name}</h1>
          {product.description && (
            <p className="text-gray-600 mb-6 leading-relaxed">{product.description}</p>
          )}

          {/* Configurator handles both simple and variant products */}
          <ProductConfigurator product={product} />

          <div className="mt-6 p-4 bg-orange-50 rounded-xl">
            <div className="flex items-start gap-2">
              <Package size={16} className="text-orange-500 mt-0.5 shrink-0" />
              <p className="text-sm text-orange-700">
                Podés incluir una nota personalizada (texto para cartelería, nombre para tarjetas, etc.) al confirmar tu pedido.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
