import { getCategories } from '@/lib/categories'
import { createProduct } from '@/lib/actions/products'
import ProductForm from '@/components/admin/ProductForm'
import { getProductRelationOptions } from '@/lib/products'
import { getIntentions } from '@/lib/intentions'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Nuevo Producto | ZAP Admin' }

export default async function NewProductPage() {
  const [categories, availableProducts, availableIntentions] = await Promise.all([
    getCategories(),
    getProductRelationOptions(),
    getIntentions(),
  ])

  return (
    <ProductForm
      categories={categories}
      action={createProduct}
      availableProducts={availableProducts}
      availableIntentions={availableIntentions}
    />
  )
}
