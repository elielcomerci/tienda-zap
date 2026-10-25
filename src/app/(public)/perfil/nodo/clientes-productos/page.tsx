import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import NodoCustomersClient from '@/components/nodo/NodoCustomersClient'
import NodoProductsClient from '@/components/nodo/NodoProductsClient'

export const metadata = { title: 'Clientes y productos | NODO ZAP' }

export default async function NodoClientDataPage({ searchParams }: { searchParams: Promise<{ vista?: string; returnTo?: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const account = await prisma.fiscalClientAccount.findUnique({ where: { userId: session.user.id }, select: { id: true } })
  if (!account) redirect('/perfil/nodo')

  const params = await searchParams
  const activeView = params.vista === 'productos' ? 'productos' : 'clientes'
  const returnQuery = params.returnTo === 'emit' ? '&returnTo=emit' : ''
  const views = [
    { id: 'clientes', label: 'Clientes' },
    { id: 'productos', label: 'Productos y servicios' },
  ] as const

  return <main className="mx-auto max-w-7xl space-y-7 px-4 py-8 sm:px-6 lg:py-10">
    <header>
      <p className="text-xs font-bold uppercase tracking-[.16em] text-[#C2103F]">NODO ZAP / {activeView === 'clientes' ? 'CLIENTES' : 'CATÁLOGO'}</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-gray-950">{activeView === 'clientes' ? 'Tus clientes.' : 'Productos y servicios.'}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">{activeView === 'clientes' ? 'Guardá sus datos una vez y reutilizalos al facturar.' : 'Cargalos una vez. Usalos cada vez que facturás.'}</p>
    </header>
    <nav aria-label="Datos para facturar" className="flex gap-2 border-b border-gray-200">
      {views.map(view => <Link key={view.id} href={`/perfil/nodo/clientes-productos?vista=${view.id}${returnQuery}`} aria-current={activeView === view.id ? 'page' : undefined} className={`border-b-2 px-3 py-3 text-sm font-semibold ${activeView === view.id ? 'border-[#C2103F] text-[#C2103F]' : 'border-transparent text-gray-600 hover:text-gray-950'}`}>{view.label}</Link>)}
    </nav>
    {activeView === 'clientes' ? <NodoCustomersClient accountId={account.id} /> : <NodoProductsClient accountId={account.id} />}
  </main>
}
