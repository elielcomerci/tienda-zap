import { prisma } from '@/lib/prisma'
import { getPromotions } from './actions'
import PromocionesClient from './PromocionesClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Promociones y Cupones | ZAP Admin' }

export default async function PromocionesAdminPage() {
  const [promotions, products, categories] = await Promise.all([
    getPromotions(),
    prisma.product.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, categoryId: true },
    }),
    prisma.category.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ])

  return (
    <PromocionesClient
      initialPromotions={promotions as any}
      products={products}
      categories={categories}
    />
  )
}
