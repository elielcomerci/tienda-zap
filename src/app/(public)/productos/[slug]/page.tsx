import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getProduct, getProducts } from '@/lib/actions/products'
import AddToCartButton from '@/components/public/AddToCartButton'
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
        {/* Imágenes */}
        <div className="space-y-3">
          <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100">
            {product.images[0] ? (
              <Image src={product.images[0]} alt={product.name} width={600} height={600}
                className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-6xl">🖨️</div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-2">
              {product.images.slice(1).map((img, i) => (
                <div key={i} className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100">
                  <Image src={img} alt={`${product.name} ${i + 2}`} width={80} height={80}
                    className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <p className="text-sm text-orange-500 font-semibold mb-2">{product.category.name}</p>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{product.name}</h1>
          {product.description && (
            <p className="text-gray-600 mb-6 leading-relaxed">{product.description}</p>
          )}
          <div className="card p-5 mb-6">
            <p className="text-3xl font-black text-gray-900 mb-1">
              ${product.price.toLocaleString('es-AR')}
            </p>
            <p className="text-sm text-gray-500">Precio unitario · IVA incluido</p>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className={`w-2 h-2 rounded-full ${product.stock > 0 ? 'bg-green-500' : 'bg-red-400'}`} />
            <p className="text-sm text-gray-600">
              {product.stock > 0 ? `${product.stock} unidades disponibles` : 'Sin stock — consultarnos'}
            </p>
          </div>

          <div className="flex gap-3">
            <AddToCartButton product={{
              productId: product.id,
              name: product.name,
              price: product.price,
              image: product.images[0] || '',
              quantity: 1,
            }} />
          </div>

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
