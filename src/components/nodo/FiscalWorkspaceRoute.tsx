import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { isFiscalFeatureEnabled } from '@/lib/fiscal-feature-flags'
import FiscalOnboardingClient from '@/components/fiscal/FiscalOnboardingClient'
import FiscalWorkspaceClient, { type FiscalWorkspaceSection } from '@/components/fiscal/FiscalWorkspaceClient'

export default async function FiscalWorkspaceRoute({ section }: { section: FiscalWorkspaceSection }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const ownAccount = await prisma.fiscalClientAccount.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })

  if (session.user.role === 'ADMIN' && !ownAccount) {
    return <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-900/5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">Tu espacio ZAP</p>
        <h1 className="mt-2 text-2xl font-semibold text-gray-950">Tu espacio NODO</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">Este usuario administrador no tiene una cuenta fiscal de cliente vinculada. El acceso de soporte está en la consola interna.</p>
        <a href="/admin/fiscal/clientes" className="mt-5 inline-flex rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">Ir a soporte fiscal</a>
      </section>
    </main>
  }

  if (!ownAccount && session.user.role === 'CUSTOMER') {
    return <FiscalOnboardingClient provisioningEnabled={await isFiscalFeatureEnabled('accountProvisioning')} />
  }

  return <main className="min-h-screen bg-[#FAF9F6]"><FiscalWorkspaceClient accountId={ownAccount?.id} section={section} /></main>
}
