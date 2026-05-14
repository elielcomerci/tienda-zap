import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import UsersClientTable from './UsersClientTable'

export const dynamic = 'force-dynamic'

export default async function AdminUsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') redirect('/login')

  const { q } = await searchParams

  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { documentId: { contains: q } },
          ],
        }
      : undefined,
    orderBy: { createdAt: 'desc' },
    include: {
      sellerProfile: true,
      _count: {
        select: { orders: true, clients: true },
      },
    },
    take: 100, // limit to 100 recent users for performance
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Usuarios</h1>
        <p className="mt-2 text-sm text-gray-500">
          Gestioná los roles, convertí clientes en vendedores y controlá los accesos.
        </p>
      </div>

      <UsersClientTable users={users} initialQuery={q} />
    </div>
  )
}
