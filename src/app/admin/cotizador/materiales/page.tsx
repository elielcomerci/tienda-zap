import { prisma } from '@/lib/prisma'
import MaterialesClient from './MaterialesClient'

export const metadata = {
  title: 'Materias Primas | Zap',
}

export default async function MaterialesPage() {
  const [materiales, categories] = await Promise.all([
    prisma.rawMaterial.findMany({
      include: {
        tiers: {
          orderBy: { minQty: 'asc' },
        },
        applicableCategories: {
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.category.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ])

  return (
    <div className="mx-auto max-w-6xl py-8">
      <MaterialesClient initialMateriales={materiales} categories={categories} />
    </div>
  )
}
