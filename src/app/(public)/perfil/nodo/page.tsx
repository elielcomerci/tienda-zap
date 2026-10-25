import FiscalWorkspaceRoute from '@/components/nodo/FiscalWorkspaceRoute'

export const metadata = { title: 'Resumen | NODO ZAP' }

export default function NodoHomePage() {
  return <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:py-10">
    <header>
      <p className="text-xs font-bold uppercase tracking-[.16em] text-[#ED164F]">NODO ZAP</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-gray-950">Tu operación fiscal</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">Estado de la cuenta, actividad y próximos pasos para emitir.</p>
    </header>
    <FiscalWorkspaceRoute section="summary" />
  </main>
}
