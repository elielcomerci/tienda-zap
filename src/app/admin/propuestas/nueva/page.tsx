import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import ProposalCreateForm from './ProposalCreateForm'

export const dynamic = 'force-dynamic'
export default async function NewProposalPage() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') redirect('/login')
  const [users, accounts] = await Promise.all([
    prisma.user.findMany({ where: { role: 'CUSTOMER', isBanned: false }, select: { id: true, name: true, email: true }, orderBy: { name: 'asc' }, take: 500 }),
    prisma.businessAccount.findMany({ select: { id: true, name: true, userId: true }, orderBy: { updatedAt: 'desc' }, take: 500 }),
  ])
  return <div className="mx-auto max-w-4xl space-y-6"><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-gray-500">Equipo comercial / Propuestas</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-gray-950">Nueva propuesta</h1><p className="mt-2 text-sm text-gray-500">Armá el planteo comercial. El importe es opcional y el enlace se genera una vez guardada.</p></div><ProposalCreateForm users={users} accounts={accounts} /></div>
}
