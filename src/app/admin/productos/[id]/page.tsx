import { getCategories } from '@/lib/actions/categories'
import { getProduct, updateProduct } from '@/lib/actions/products'
import ProductForm from '@/components/admin/ProductForm'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'

export const metadata = { title: 'Editar Producto | ZAP Admin' }

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  // getProduct works by slug, so we fetch by ID directly here
  const product = await prisma.product.findUnique({ where: { id } })
  if (!product) notFound()

  const categories = await getCategories()

  const updateAction = updateProduct.bind(null, id)

  return <ProductForm product={product} categories={categories} action={updateAction} />
}
