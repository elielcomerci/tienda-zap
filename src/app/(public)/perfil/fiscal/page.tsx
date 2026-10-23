import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import FiscalWorkspaceClient from '@/components/fiscal/FiscalWorkspaceClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Mi cuenta fiscal | ZAP Tienda' }

export default async function PerfilFiscalPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const ownAccount = session.user.role === 'ADMIN'
    ? await prisma.fiscalClientAccount.findFirst({
      where: { userId: session.user.id },
      select: { id: true },
    })
    : null

  if (session.user.role === 'ADMIN' && !ownAccount) {
    return <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-zap-magenta">Tu espacio ZAP</p>
        <h1 className="mt-2 text-2xl font-semibold text-gray-950">Tu cuenta fiscal</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">Este usuario administrador todavía no tiene una cuenta fiscal de cliente vinculada. El acceso a clientes permanece en la consola de soporte.</p>
        <a href="/admin/fiscal/clientes" className="mt-5 inline-flex rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">Ir a soporte fiscal</a>
      </section>
    </main>
  }

  return <FiscalWorkspaceClient accountId={ownAccount?.id} />
}
