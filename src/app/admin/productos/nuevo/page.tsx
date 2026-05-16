import { getCategories } from '@/lib/categories'
import { createProduct } from '@/lib/actions/products'
import ProductForm from '@/components/admin/ProductForm'
import { getProductRelationOptions } from '@/lib/products'
import { getIntentions } from '@/lib/intentions'
import { getActiveBusinessTypes } from '@/lib/business-types'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Nuevo Producto | ZAP Admin' }

export default async function NewProductPage() {
  const [categories, availableProducts, availableIntentions, availableBusinessTypes] = await Promise.all([
    getCategories(),
    getProductRelationOptions(),
    getIntentions(),
    getActiveBusinessTypes(),
  ])

  return (
    <ProductForm
      categories={categories}
      action={createProduct}
      availableProducts={availableProducts}
      availableIntentions={availableIntentions}
      availableBusinessTypes={availableBusinessTypes}
    />
  )
}
