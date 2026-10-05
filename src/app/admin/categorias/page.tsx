import { catalogFamilies } from '@/lib/catalog-domain'

export const metadata = { title: 'Familias comerciales | ZAP Admin' }

export default function AdminCategoriesPage() {
  return <div className="mx-auto max-w-3xl space-y-5"><div><h1 className="text-2xl font-bold text-gray-950">Familias comerciales</h1><p className="mt-1 text-sm text-gray-600">Reemplazan a las categorías heredadas. Se derivan de los motores definidos en el dominio y no se editan desde esta pantalla.</p></div><div className="grid gap-3 sm:grid-cols-2">{catalogFamilies.map((family) => <article key={family.slug} className="rounded-xl border border-gray-200 bg-white p-4"><p className="font-semibold text-gray-900">{family.label}</p><p className="mt-1 font-mono text-xs text-gray-500">{family.engine}</p></article>)}</div></div>
}
