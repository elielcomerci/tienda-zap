import ClientesCrmClient from './ClientesCrmClient'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Clientes CRM | ZAP Admin' }

export default async function ClientesCrmPage() {
  const [accounts, businessTypes, sellers, users] = await Promise.all([
    prisma.businessAccount.findMany({
      orderBy: [{ updatedAt: 'desc' }],
      include: {
        businessType: { select: { name: true } },
        assignedSeller: { select: { id: true, name: true, email: true } },
        operationalSeller: { select: { id: true, name: true, email: true } },
        user: { select: { id: true, name: true, email: true } },
        contacts: { orderBy: [{ isPrimary: 'desc' }, { updatedAt: 'desc' }] },
        _count: { select: { coupons: true } },
      },
    }),
    prisma.businessType.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.user.findMany({
      where: { role: 'SELLER', isBanned: false },
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
      select: { id: true, name: true, email: true },
    }),
    prisma.user.findMany({
      where: { role: 'CUSTOMER', isBanned: false },
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
      select: { id: true, name: true, email: true },
    }),
  ])

  const serializedAccounts = accounts.map((account) => ({
    ...account,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
    nextActionAt: account.nextActionAt?.toISOString() || null,
    contacts: account.contacts.map((contact) => ({
      ...contact,
      createdAt: contact.createdAt.toISOString(),
      updatedAt: contact.updatedAt.toISOString(),
    })),
  }))

  return (
    <ClientesCrmClient
      accounts={serializedAccounts}
      businessTypes={businessTypes}
      sellers={sellers}
      users={users}
    />
  )
}
