import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import FiscalWorkspaceClient from '@/components/fiscal/FiscalWorkspaceClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Mi cuenta fiscal | ZAP Tienda' }

export default async function PerfilFiscalPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  if (session.user.role === 'ADMIN') redirect('/admin/fiscal/clientes')
  return <FiscalWorkspaceClient />
}
