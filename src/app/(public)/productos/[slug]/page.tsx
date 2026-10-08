import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { notFound } from 'next/navigation'
import { getActiveProductSlugs, getProduct } from '@/lib/products'
import { buildProductInquiryMessage, buildWhatsappUrl } from '@/lib/whatsapp'
import ProductDetailExperience from '@/components/public/ProductDetailExperience'
import RelatedProductsSection from '@/components/public/RelatedProductsSection'
import { getProductDisplayPrice } from '@/lib/product-pricing'
import { getPublicBusinessTypes } from '@/lib/business-types'
import { getPublicSituationBySlug } from '@/lib/discovery'
import { buildProductUrl, buildProductsUrl, type ExplorationContext } from '@/lib/exploration-context'
import ExplorationContextIndicator from '@/components/public/ExplorationContextIndicator'
import { getProductFamilyLabel, isDevelopment } from '@/lib/catalog-domain'

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

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ rubro?: string; situacion?: string; necesidad?: string; mode?: string }>
}) {
  const [{ slug }, { rubro, situacion, necesidad }] = await Promise.all([params, searchParams])
  const product = await getProduct(slug)
  if (!product || !product.active) notFound()

  const [businessTypes, selectedSituation] = await Promise.all([
    getPublicBusinessTypes(),
    getPublicSituationBySlug(situacion, rubro),
  ])
  const selectedBusinessType = rubro ? businessTypes.find((businessType) => businessType.slug === rubro) : undefined
  const selectedNeed = selectedSituation?.needs.find((need) => need.slug === necesidad)
  const explorationContext: ExplorationContext = {
    businessTypeSlug: selectedBusinessType?.slug,
    situationSlug: selectedSituation?.slug,
    needSlug: selectedNeed?.slug,
  }

  const relatedProducts = product.outgoingRelations
    .map((relation) => relation.relatedProduct)
    .filter((relatedProduct) => relatedProduct.active)
  const displayPrice = getProductDisplayPrice(product)
  const inquiryUrl = buildWhatsappUrl(
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER,
    buildProductInquiryMessage({
      name: product.name,
      categoryName: getProductFamilyLabel(product),
      price: displayPrice,
      slug: product.slug,
      intent: isDevelopment(product) || displayPrice === null ? 'cotizar' : 'consultar',
      contextLabel: selectedBusinessType?.name || selectedSituation?.name || selectedNeed?.name || null,
      context: explorationContext,
    })
  )

  return (
    <div className="bg-[linear-gradient(180deg,#ffffff_0%,#fff8f1_22%,#f8fafc_100%)]">
      <div className="mx-auto max-w-[1380px] px-4 pb-16 pt-8 sm:pt-10 xl:px-8">
        <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-gray-500">
          <Link href="/" className="transition-colors hover:text-gray-900">
            Inicio
          </Link>
          <ChevronRight size={14} />
          <Link href={buildProductsUrl(explorationContext)} className="transition-colors hover:text-gray-900">
            Productos
          </Link>
          <ChevronRight size={14} />
          <span className="font-medium text-gray-900">{product.name}</span>
        </nav>

        <ExplorationContextIndicator
          context={explorationContext}
          businessTypeName={selectedBusinessType?.name}
          situationName={selectedSituation?.name}
          needName={selectedNeed?.name}
        />

        <ProductDetailExperience
          product={product}
          inquiryUrl={inquiryUrl}
          explorationContext={explorationContext}
          businessTypeId={selectedBusinessType?.id || null}
        />

        <RelatedProductsSection products={relatedProducts} context={explorationContext} />
      </div>
    </div>
  )
}
