import { getCategories } from '@/lib/categories'
import { updateProduct } from '@/lib/actions/products'
import ProductForm from '@/components/admin/ProductForm'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getProductRelationOptions } from '@/lib/products'
import { getIntentions } from '@/lib/intentions'
import { getActiveBusinessTypes } from '@/lib/business-types'

export const metadata = { title: 'Editar Producto | ZAP Admin' }

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      options: {
        include: { values: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      },
      variants: {
        include: {
          options: {
            include: { optionValue: true },
          },
        },
      },
      outgoingRelations: {
        select: {
          relatedProductId: true,
        },
      },
      intentions: {
        select: { id: true }
      },
      targetBusinessTypes: {
        select: { id: true }
      }
    },
  })
  if (!product) notFound()

  const [categories, availableProducts, availableIntentions, availableBusinessTypes] = await Promise.all([
    getCategories(),
    getProductRelationOptions(id),
    getIntentions(),
    getActiveBusinessTypes()
  ])
  const updateAction = updateProduct.bind(null, id)

  // Transform DB data to ProductOptionsConfigurator format
  // Options: { name, isRequired, values: string[] }
  const initialOptions = product.options.map(opt => ({
    id: opt.id,
    name: opt.name,
    displayType: opt.displayType,
    isRequired: opt.isRequired,
    values: opt.values.map(v => ({ id: v.id, value: v.value, colorHex: v.colorHex ?? undefined })),
  }))

  // Variants: { combinations: { optionName: value }, price, sku, stock }
  const initialVariants = product.variants.map(variant => {
    const combinations: Record<string, string> = {}
    variant.options.forEach(vo => {
      const optionDef = product.options.find(o => o.id === vo.optionValue.optionId)
      if (optionDef) combinations[optionDef.name] = vo.optionValue.value
    })
    return {
      id: variant.id,
      combinations,
      price: variant.price,
      sku: variant.sku ?? undefined,
      stock: variant.stock ?? undefined,
      imageUrl: variant.imageUrl ?? undefined,
    }
  })

  const initialRelatedProductIds = product.outgoingRelations.map(
    (relation) => relation.relatedProductId
  )

  return (
    <ProductForm
      product={product}
      categories={categories}
      action={updateAction}
      initialOptions={initialOptions}
      initialVariants={initialVariants}
      availableProducts={availableProducts}
      initialRelatedProductIds={initialRelatedProductIds}
      availableIntentions={availableIntentions}
      initialIntentionIds={product.intentions.map(i => i.id)}
      availableBusinessTypes={availableBusinessTypes}
      initialTargetBusinessTypeIds={product.targetBusinessTypes.map(bt => bt.id)}
    />
  )
}
