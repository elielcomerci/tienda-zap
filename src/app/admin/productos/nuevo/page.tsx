export const dynamic = 'force-dynamic'
import { getCategories } from '@/lib/actions/categories'
import { createProduct } from '@/lib/actions/products'
import ProductForm from '@/components/admin/ProductForm'

export const metadata = { title: 'Nuevo Producto | ZAP Admin' }

export default async function NewProductPage() {
  const categories = await getCategories()

  return <ProductForm categories={categories} action={createProduct} />
}
