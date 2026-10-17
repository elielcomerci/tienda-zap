import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { updateProduct } from '@/lib/actions/products'
import { getAdminCategories } from '@/lib/categories'
import { getProductRelationOptions } from '@/lib/products'
import { ProductBaseForm } from '../nuevo/page'

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id
  const [product, categories, relationOptions] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        categoryLinks: { select: { categoryId: true, sortOrder: true } },
        outgoingRelations: { select: { relatedProductId: true, type: true } },
      },
    }),
    getAdminCategories(),
    getProductRelationOptions(id),
  ])
  if (!product) notFound()
  return <ProductBaseForm title={"Editar " + product.name} product={product} action={updateProduct.bind(null, product.id)} categories={categories} relationOptions={relationOptions} />
}
