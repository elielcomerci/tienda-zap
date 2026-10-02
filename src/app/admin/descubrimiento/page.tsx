import { prisma } from '@/lib/prisma'
import DiscoveryAdminClient from './DiscoveryAdminClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Descubrimiento comercial — Admin' }

export default async function DiscoveryAdminPage() {
  const [situations, needs, businessTypes] = await Promise.all([
    prisma.situation.findMany({ include: { businessTypes: { select: { id: true, name: true } }, needs: { select: { id: true, name: true } }, _count: { select: { needs: true } } }, orderBy: [{ order: 'asc' }, { name: 'asc' }] }),
    prisma.need.findMany({ include: { businessTypes: { select: { id: true, name: true } }, situations: { select: { id: true, name: true } }, _count: { select: { products: true } } }, orderBy: [{ order: 'asc' }, { name: 'asc' }] }),
    prisma.businessType.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ])
  return <DiscoveryAdminClient situations={situations} needs={needs} businessTypes={businessTypes} />
}
