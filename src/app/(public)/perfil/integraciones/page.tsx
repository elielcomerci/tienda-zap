import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import IntegrationGenerator from '@/components/integrations/IntegrationGenerator'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Integraciones API | ZAP Tienda' }

export default async function IntegracionesPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  return <IntegrationGenerator />
}
