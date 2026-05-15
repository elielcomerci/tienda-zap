import { prisma } from '@/lib/prisma'
import TerminacionesClient from './TerminacionesClient'

export const metadata = {
  title: 'Terminaciones | Zap',
}

export default async function TerminacionesPage() {
  const finishings = await prisma.finishingOperation.findMany({
    include: { tiers: { orderBy: { minQty: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="mx-auto max-w-6xl py-8">
      <TerminacionesClient initialFinishings={finishings} />
    </div>
  )
}
