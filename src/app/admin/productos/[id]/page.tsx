import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { updateProduct } from '@/lib/actions/products'
import { ProductBaseForm } from '../nuevo/page'

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const product = await prisma.product.findUnique({ where: { id: (await params).id } })
  if (!product) notFound()
  return <ProductBaseForm title={`Editar ${product.name}`} product={product} action={updateProduct.bind(null, product.id)} />
}
