import Link from 'next/link'
import { ChevronRight, Package, ShieldCheck, Wallet } from 'lucide-react'
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
          </div>

          <div className="space-y-6">
            <section className="rounded-[32px] border border-gray-200 bg-white p-6 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.35)] sm:p-8">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="rounded-full bg-orange-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700">
                  {product.category.name}
                </span>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-600">
                  {product.category.isService ? 'Servicio coordinado' : 'Produccion fisica'}
                </span>
              </div>

              <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight text-gray-950 sm:text-5xl">
                {product.name}
              </h1>

              {product.description && (
                <p className="mt-4 max-w-2xl text-base leading-8 text-gray-600">
                  {product.description}
                </p>
              )}

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                    Compra guiada
                  </p>
                  <p className="mt-2 text-sm font-semibold text-gray-900">
                    Configuras medidas, variantes y cantidades sin perderte.
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                    Precio claro
                  </p>
                  <p className="mt-2 text-sm font-semibold text-gray-900">
                    Mostramos el valor final o el minimo real segun la combinacion elegida.
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                    Produccion ordenada
                  </p>
                  <p className="mt-2 text-sm font-semibold text-gray-900">
                    Dejas notas, archivos y condiciones listas desde el arranque.
                  </p>
                </div>
              </div>
            </section>

            <ProductConfigurator product={product} />
          </div>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <ProductZapCreditPromo
            downPaymentPercent={product.creditDownPaymentPercent || 30}
            whatsappUrl={creditWhatsappUrl}
          />

          <aside className="rounded-[28px] border border-orange-200 bg-white/95 p-6 shadow-[0_18px_50px_-42px_rgba(249,115,22,0.55)]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
              Antes de producir
            </p>
            <h2 className="mt-2 text-2xl font-black leading-tight text-gray-950">
              Dejamos el pedido bien definido desde la ficha.
            </h2>

            <div className="mt-6 space-y-4">
              <div className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
                <Package size={18} className="mt-0.5 shrink-0 text-orange-500" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">Notas y detalles</p>
                  <p className="mt-1 text-sm leading-6 text-gray-600">
                    Puedes dejarnos textos, nombres, medidas o referencias apenas confirmas.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
                <ShieldCheck size={18} className="mt-0.5 shrink-0 text-orange-500" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">Condiciones visibles</p>
                  <p className="mt-1 text-sm leading-6 text-gray-600">
                    Precio, anticipo y pasos siguientes quedan claros antes de avanzar.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
                <Wallet size={18} className="mt-0.5 shrink-0 text-orange-500" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">Pago mas flexible</p>
                  <p className="mt-1 text-sm leading-6 text-gray-600">
                    Tarjeta, transferencia o Credito ZAP segun como mejor te convenga cerrar.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <RelatedProductsSection products={relatedProducts} />
      </div>
    </div>
  )
}
