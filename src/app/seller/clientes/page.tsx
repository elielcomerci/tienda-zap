import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import ClientsTable from './ClientsTable'

export const dynamic = 'force-dynamic'

export default async function SellerClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const seller = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!seller || (seller.role !== 'SELLER' && seller.role !== 'ADMIN')) redirect('/')

  const { q } = await searchParams

  const clients = await prisma.user.findMany({
    where: {
      sellerId: seller.id,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { orders: true } }
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Mis Clientes</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestioná tu cartera de clientes activos.
          </p>
        </div>
        <Link href="/seller/clientes/vincular" className="btn-primary inline-flex items-center gap-2">
          <Plus size={18} />
          Vincular Cliente
        </Link>
      </div>

      <ClientsTable clients={clients} initialQuery={q} />
    </div>
  )
}
