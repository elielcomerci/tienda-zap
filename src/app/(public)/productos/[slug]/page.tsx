import { Package } from 'lucide-react'
import { notFound } from 'next/navigation'
import { getActiveProductSlugs, getProduct } from '@/lib/products'
import { buildWhatsappUrl } from '@/lib/whatsapp'
import ProductConfigurator from '@/components/public/ProductConfigurator'
import ProductImageGallery from '@/components/public/ProductImageGallery'
import ProductZapCreditPromo from '@/components/public/ProductZapCreditPromo'
import RelatedProductsSection from '@/components/public/RelatedProductsSection'

export const revalidate = 300

export async function generateStaticParams() {
  const products = await getActiveProductSlugs()
  return products.map((product) => ({
    slug: product.slug,
  }))
}

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

  const relatedProducts = product.outgoingRelations
    .map((relation) => relation.relatedProduct)
    .filter((relatedProduct) => relatedProduct.active)

  const creditWhatsappUrl = buildWhatsappUrl(
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER,
    `Hola! Vi el producto "${product.name}" en la tienda y quiero evaluarlo con Credito ZAP para mi negocio.`
  )

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="grid gap-10 md:grid-cols-2">
        <div className="w-full">
          <ProductImageGallery images={product.images} productName={product.name} />
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-orange-500">{product.category.name}</p>
          <h1 className="mb-4 text-3xl font-bold text-gray-900">{product.name}</h1>

          {product.description && (
            <p className="mb-6 leading-relaxed text-gray-600">{product.description}</p>
          )}

          <ProductConfigurator product={product} />

          <ProductZapCreditPromo
            downPaymentPercent={product.creditDownPaymentPercent || 30}
            whatsappUrl={creditWhatsappUrl}
          />

          <div className="mt-6 rounded-xl bg-orange-50 p-4">
            <div className="flex items-start gap-2">
              <Package size={16} className="mt-0.5 shrink-0 text-orange-500" />
              <p className="text-sm text-orange-700">
                Podes incluir una nota personalizada al confirmar tu pedido: texto para carteleria,
                nombres para tarjetas o cualquier aclaracion que necesite tu trabajo.
              </p>
            </div>
          </div>
        </div>
      </div>

      <RelatedProductsSection products={relatedProducts} />
    </div>
  )
}
