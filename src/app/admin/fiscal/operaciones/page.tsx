import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import FiscalOperationsClient from './FiscalOperationsClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Operaciones fiscales | ZAP Admin' }

export default async function FiscalOperationsPage() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'ADMIN') redirect('/login')
  return <FiscalOperationsClient />
}
