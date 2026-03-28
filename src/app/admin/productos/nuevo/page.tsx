import { getCategories } from '@/lib/categories'
import { createProduct } from '@/lib/actions/products'
import ProductForm from '@/components/admin/ProductForm'
import { getProductRelationOptions } from '@/lib/products'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Nuevo Producto | ZAP Admin' }

export default async function NewProductPage() {
  const [categories, availableProducts] = await Promise.all([
    getCategories(),
    getProductRelationOptions(),
  ])

  return (
    <ProductForm
      categories={categories}
      action={createProduct}
      availableProducts={availableProducts}
    />
  )
}
