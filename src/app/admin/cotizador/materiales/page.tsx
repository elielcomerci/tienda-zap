import { prisma } from '@/lib/prisma'
import MaterialesClient from './MaterialesClient'

export const metadata = {
  title: 'Materias Primas | Zap',
}

export default async function MaterialesPage() {
  const materiales = await prisma.rawMaterial.findMany({
    include: {
      tiers: {
        orderBy: { minQty: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="mx-auto max-w-6xl py-8">
      <MaterialesClient initialMateriales={materiales} />
    </div>
  )
}
