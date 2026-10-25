import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import NodoCustomersClient from '@/components/nodo/NodoCustomersClient'

export const metadata = { title: 'Clientes | NODO ZAP' }

export default async function NodoClientesPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  return <main className="mx-auto max-w-7xl space-y-7 px-4 py-8 sm:px-6 lg:py-10">
    <header>
      <p className="text-xs font-bold uppercase tracking-[.16em] text-[#ED164F]">NODO ZAP</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-gray-950">Clientes</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">Guardá los datos de tus receptores para seleccionarlos al preparar un comprobante.</p>
    </header>
    <NodoCustomersClient />
  </main>
}
