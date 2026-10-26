import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import FiscalWorkspaceRoute from '@/components/nodo/FiscalWorkspaceRoute'
import NodoIntegrationsRoute from '@/components/nodo/NodoIntegrationsRoute'

export const metadata = { title: 'Integraciones | NODO ZAP' }

export default async function NodoAdvancedPage({ searchParams }: { searchParams: Promise<{ vista?: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const params = await searchParams
  const activeView = params.vista === 'consultas' ? 'consultas' : 'integraciones'
  const views = [
    { id: 'integraciones', label: 'Integraciones' },
    { id: 'consultas', label: 'Consultas y diagnóstico' },
  ] as const

  return <div>
    <header className="mx-auto max-w-7xl px-4 pb-4 pt-8 sm:px-6 lg:pt-10">
      <p className="text-xs font-bold uppercase tracking-[.16em] text-[#C2103F]">NODO ZAP</p>
      {activeView === 'consultas' && <><h1 className="mt-1 text-3xl font-semibold tracking-tight text-gray-950">Consultas y diagnóstico</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">Revisá el estado de tus consultas fiscales.</p></>}
      <nav aria-label="Herramientas avanzadas" className="mt-5 flex gap-2 border-b border-gray-200">
        {views.map(view => <Link key={view.id} href={`/perfil/nodo/avanzado?vista=${view.id}`} aria-current={activeView === view.id ? 'page' : undefined} className={`border-b-2 px-3 py-3 text-sm font-semibold ${activeView === view.id ? 'border-[#C2103F] text-[#C2103F]' : 'border-transparent text-gray-600 hover:text-gray-950'}`}>{view.label}</Link>)}
      </nav>
    </header>
    {activeView === 'integraciones' ? <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6"><NodoIntegrationsRoute /></main> : <FiscalWorkspaceRoute section="tools" />}
  </div>
}
