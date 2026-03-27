import { getCategories } from '@/lib/categories'
import { updateProduct } from '@/lib/actions/products'
import ProductForm from '@/components/admin/ProductForm'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'

export const metadata = { title: 'Editar Producto | ZAP Admin' }

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      options: {
        include: { values: true },
        orderBy: { id: 'asc' },
      },
      variants: {
        include: {
          options: {
            include: { optionValue: true },
          },
        },
      },
    },
  })
  if (!product) notFound()

  const categories = await getCategories()
  const updateAction = updateProduct.bind(null, id)

  // Transform DB data to ProductOptionsConfigurator format
  // Options: { name, isRequired, values: string[] }
  const initialOptions = product.options.map(opt => ({
    id: opt.id,
    name: opt.name,
    isRequired: opt.isRequired,
    values: opt.values.map(v => v.value),  // Flatten to string[]
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
    }
  })

  return (
    <ProductForm
      product={product}
      categories={categories}
      action={updateAction}
      initialOptions={initialOptions}
      initialVariants={initialVariants}
    />
  )
}
