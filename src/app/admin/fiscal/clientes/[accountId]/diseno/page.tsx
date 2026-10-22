import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import FiscalTemplateClient from '../../../diseno/FiscalTemplateClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Diseño de comprobantes del cliente | ZAP Admin' }

export default async function AdminFiscalCustomerDesignPage({ params }: { params: Promise<{ accountId: string }> }) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'ADMIN') redirect('/login')
  const { accountId } = await params
  const account = await prisma.fiscalClientAccount.findUnique({
    where: { id: accountId },
    select: { id: true, tenantName: true, user: { select: { name: true, email: true } } },
  })
  if (!account) notFound()
  return <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
    <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
      Configuración exclusiva de <strong>{account.user.name || account.user.email}</strong> · {account.tenantName}
    </div>
    <FiscalTemplateClient accountId={account.id} />
  </div>
}
