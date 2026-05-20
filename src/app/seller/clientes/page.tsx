import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { Plus } from 'lucide-react'
import ClientsTable from './ClientsTable'

export const dynamic = 'force-dynamic'

export default async function SellerClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; followUp?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const seller = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!seller || (seller.role !== 'SELLER' && seller.role !== 'ADMIN')) redirect('/')

  const { q, status, followUp } = await searchParams
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  const leadStatus = ['NEW', 'CONTACTED', 'QUOTED', 'WON', 'LOST'].includes(status || '')
    ? status
    : undefined
  const leadConditions: any[] = []

  if (leadStatus) {
    leadConditions.push({ status: leadStatus })
  }

  if (followUp === 'due') {
    leadConditions.push({
      nextContactAt: { lte: today },
      status: { notIn: ['WON', 'LOST'] },
    })
  }

  if (followUp === 'none') {
    leadConditions.push({
      nextContactAt: null,
      status: { notIn: ['WON', 'LOST'] },
    })
  }

  const [clients, leads, businessTypes] = await Promise.all([
    prisma.user.findMany({
      where: {
        OR: [
          { sellerId: seller.id },
          { operationalSellerId: seller.id },
        ],
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
                { phone: { contains: q } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        seller: { select: { id: true, name: true, email: true } },
        operationalSeller: { select: { id: true, name: true, email: true } },
        _count: { select: { orders: true } }
      }
    }),
    prisma.sellerLead.findMany({
      where: {
        sellerId: seller.id,
        ...(leadConditions.length > 0 ? { AND: leadConditions } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
                { phone: { contains: q } },
                { businessName: { contains: q, mode: 'insensitive' } },
                { interest: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        businessType: { select: { name: true } },
        convertedUser: { select: { id: true, name: true, email: true } },
        events: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    }),
    prisma.businessType.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Mis Clientes</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestioná tu cartera de clientes activos.
          </p>
        </div>
        <div className="hidden items-center gap-2 text-sm font-semibold text-[#ED2C71] sm:flex">
          <Plus size={18} />
          Cargar prospectos y clientes
        </div>
      </div>

      <ClientsTable
        clients={clients}
        leads={leads}
        businessTypes={businessTypes}
        initialQuery={q}
        initialStatus={leadStatus}
        initialFollowUp={followUp}
      />
    </div>
  )
}
