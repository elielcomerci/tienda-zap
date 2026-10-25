import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import IntegrationGenerator from '@/components/integrations/IntegrationGenerator'
import { isFiscalFeatureEnabled } from '@/lib/fiscal-feature-flags'

export default async function NodoIntegrationsRoute() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  if (!(await isFiscalFeatureEnabled('apiKeyManagement'))) {
    return <section className="mx-auto max-w-4xl rounded-2xl border border-amber-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Integraciones API</p>
      <h1 className="mt-2 text-2xl font-semibold text-gray-950">La gestión de claves todavía no está habilitada</h1>
      <p className="mt-3 text-sm leading-6 text-gray-600">Esta vista se va a habilitar cuando la cuenta tenga activa la administración de claves.</p>
    </section>
  }
  return <IntegrationGenerator />
}
