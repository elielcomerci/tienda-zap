import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { importCustomerConversation } from './actions'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Conversaciones de clientes | ZAP Tienda' }

export default async function CustomerConversationsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { sellerProfile: true },
  })
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SELLER')) redirect('/')
  if (user.role === 'SELLER' && !user.sellerProfile?.active) redirect('/seller')

  const accountWhere = user.role === 'ADMIN'
    ? {}
    : {
        OR: [
          { assignedSellerId: user.id },
          { operationalSellerId: user.id },
          { sellerLeads: { some: { sellerId: user.id } } },
        ],
      }

  const accounts = await prisma.businessAccount.findMany({
    where: accountWhere,
    orderBy: { name: 'asc' },
    select: { id: true, name: true, assignedSellerId: true, operationalSellerId: true },
  })
  const accountIds = accounts.map((account) => account.id)
  const conversations = accountIds.length
    ? await prisma.customerConversation.findMany({
        where: { businessAccountId: { in: accountIds } },
        orderBy: [{ conversationAt: 'desc' }, { importedAt: 'desc' }],
        take: 30,
        include: {
          businessAccount: { select: { id: true, name: true } },
          importedBy: { select: { name: true, email: true } },
        },
      })
    : []
  const params = await searchParams

  const errorMessages: Record<string, string> = {
    missing: 'Elegí una cuenta y pegá el texto de la conversación.',
    length: 'El texto supera el límite de 100.000 caracteres.',
    date: 'La fecha indicada no es válida.',
    duplicate: 'Esta conversación ya fue importada para esa cuenta.',
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <a href="/seller/clientes" className="text-sm font-bold text-gray-500 hover:text-gray-900">← Mis clientes</a>
        <h1 className="mt-3 text-2xl font-black text-gray-950">Conversaciones de clientes</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-600">
          Pegá una conversación de WhatsApp para conservarla en la historia comercial de la cuenta.
          En esta etapa guardamos la fuente original; no se analiza ni se envía a una IA.
        </p>
      </div>

      {params.saved === '1' && (
        <div role="status" className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-800">
          Conversación guardada en la ficha del cliente.
        </div>
      )}
      {params.error && errorMessages[params.error] && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">
          {errorMessages[params.error]}
        </div>
      )}

      <form action={importCustomerConversation} className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <input type="hidden" name="returnPath" value="/seller/clientes/conversaciones" />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-gray-800">Cuenta / cliente</span>
            <select name="businessAccountId" required defaultValue="" className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm">
              <option value="" disabled>Elegí una cuenta…</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>{account.name}</option>
              ))}
            </select>
            {accounts.length === 0 && <span className="mt-1 block text-xs text-amber-700">No hay cuentas comerciales asignadas para importar conversaciones.</span>}
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-gray-800">Fecha de la conversación (opcional)</span>
            <input name="conversationAt" type="date" className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm" />
          </label>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-sm font-bold text-gray-800">Referencia (opcional)</span>
          <input name="title" maxLength={180} placeholder="Ej.: Consulta por packaging, seguimiento de presupuesto…" className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-bold text-gray-800">Texto de WhatsApp</span>
          <textarea
            name="rawTranscript"
            required
            minLength={10}
            maxLength={100000}
            rows={10}
            placeholder={'Pegá acá el texto copiado desde WhatsApp. Se conserva tal como lo pegás.'}
            className="w-full rounded-xl border border-gray-300 px-3 py-3 font-mono text-sm leading-6"
          />
          <span className="mt-1 block text-xs text-gray-500">Máximo 100.000 caracteres. Si pegás el mismo texto dos veces en la misma cuenta, evitamos duplicarlo.</span>
        </label>
        <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-xs leading-5 text-gray-500">
            Pegá solo conversaciones que estés autorizado a registrar. El texto queda almacenado en el CRM y todavía no se procesa automáticamente.
          </p>
          <button type="submit" disabled={accounts.length === 0} className="shrink-0 rounded-xl bg-gray-950 px-5 py-3 text-sm font-bold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40">
            Guardar conversación
          </button>
        </div>
      </form>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-gray-950">Últimas conversaciones importadas</h2>
            <p className="text-sm text-gray-500">Se muestran hasta 30 registros de las cuentas a las que tenés acceso.</p>
          </div>
        </div>
        {conversations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
            Todavía no hay conversaciones importadas.
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map((conversation) => (
              <details key={conversation.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <summary className="cursor-pointer list-none">
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                    <div>
                      <p className="font-bold text-gray-900">{conversation.title || 'Conversación de WhatsApp'}</p>
                      <p className="mt-1 text-sm text-gray-600">{conversation.businessAccount.name}</p>
                    </div>
                    <div className="text-xs text-gray-500 sm:text-right">
                      <p>{(conversation.conversationAt || conversation.importedAt).toLocaleDateString('es-AR')}</p>
                      <p>Importó: {conversation.importedBy.name || conversation.importedBy.email}</p>
                    </div>
                  </div>
                </summary>
                <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-gray-50 p-3 text-xs leading-5 text-gray-700">{conversation.rawTranscript}</pre>
              </details>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
