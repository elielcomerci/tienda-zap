import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { notFound } from 'next/navigation'
import { getActiveProductSlugs, getProduct } from '@/lib/products'
import { buildProductInquiryMessage, buildWhatsappUrl } from '@/lib/whatsapp'
import ProductConfigurator from '@/components/public/ProductConfigurator'
import ProductImageGallery from '@/components/public/ProductImageGallery'
import ProductMediaBlock from '@/components/public/ProductMediaBlock'
import ProductZapCreditPromo from '@/components/public/ProductZapCreditPromo'
import RelatedProductsSection from '@/components/public/RelatedProductsSection'
import { getProductDisplayPrice } from '@/lib/product-pricing'

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
  const displayPrice = getProductDisplayPrice(product)
  const inquiryUrl = buildWhatsappUrl(
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER,
    buildProductInquiryMessage({
      name: product.name,
      categoryName: product.category.name,
      price: displayPrice,
      creditDownPaymentPercent: product.creditDownPaymentPercent || 30,
      slug: product.slug,
      intent: displayPrice === null ? 'cotizar' : 'consultar',
    })
  )

  const creditWhatsappUrl = buildWhatsappUrl(
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER,
    `Hola! Vi el producto "${product.name}" en la tienda y quiero evaluarlo con Crédito ZAP para mi negocio.`
  )

  return (
    <div className="bg-[linear-gradient(180deg,#ffffff_0%,#fff8f1_22%,#f8fafc_100%)]">
      <div className="mx-auto max-w-[1380px] px-4 pb-16 pt-8 sm:pt-10 xl:px-8">
        <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-gray-500">
          <Link href="/" className="transition-colors hover:text-gray-900">
            Inicio
          </Link>
          <ChevronRight size={14} />
          <Link href="/productos" className="transition-colors hover:text-gray-900">
            Productos
          </Link>
          <ChevronRight size={14} />
          <span className="font-medium text-gray-900">{product.name}</span>
        </nav>

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)] 2xl:gap-12">
          <div className="self-start xl:sticky xl:top-24">
            <ProductImageGallery images={product.images} productName={product.name} />
            <ProductMediaBlock
              mediaType={product.mediaType}
              mediaUrl={product.mediaUrl}
              mediaTitle={product.mediaTitle}
              mediaList={product.mediaList}
              productName={product.name}
            />
          </div>

          <div className="space-y-6">
            <section className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.35)] sm:p-7">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="rounded-full bg-[#FEF1F6] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C91F5B]">
                  {product.category.name}
                </span>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-600">
                  {product.category.isService ? 'Servicio' : 'Producto'}
                </span>
              </div>

              <h1 className="mt-4 max-w-3xl text-3xl font-black tracking-tight text-gray-950 sm:text-5xl">
                {product.name}
              </h1>

              {product.description && (
                <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-600 sm:text-base">
                  {product.description}
                </p>
              )}

              <dl className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                    Tipo
                  </dt>
                  <dd className="mt-2 text-sm font-semibold text-gray-900">
                    {product.category.isService ? 'Servicio coordinado' : 'Pieza producida'}
                  </dd>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                    Crédito ZAP
                  </dt>
                  <dd className="mt-2 text-sm font-semibold text-gray-900">
                    Desde {product.creditDownPaymentPercent || 30}% de anticipo
                  </dd>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                    Siguiente paso
                  </dt>
                  <dd className="mt-2 text-sm font-semibold text-gray-900">
                    Configurar y agregar
                  </dd>
                </div>
              </dl>
            </section>

            <ProductConfigurator product={product} inquiryUrl={inquiryUrl} />
          </div>
        </div>

        <div className="mt-8">
          <ProductZapCreditPromo
            downPaymentPercent={product.creditDownPaymentPercent || 30}
            whatsappUrl={creditWhatsappUrl}
          />
        </div>

        <RelatedProductsSection products={relatedProducts} isCombo={product.isCombo} />
      </div>
    </div>
  )
}
