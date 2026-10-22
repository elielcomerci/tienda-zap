import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import FiscalWorkspaceClient from '@/components/fiscal/FiscalWorkspaceClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Soporte fiscal de cliente | ZAP Admin' }

export default async function AdminFiscalCustomerPage({ params }: { params: Promise<{ accountId: string }> }) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'ADMIN') redirect('/login')
  const { accountId } = await params
  const account = await prisma.fiscalClientAccount.findUnique({ where: { id: accountId }, select: { id: true } })
  if (!account) notFound()
  return <FiscalWorkspaceClient accountId={account.id} adminMode />
}
