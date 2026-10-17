import { catalogFamilies, catalogGroups } from '@/lib/catalog-domain'

export const metadata = { title: 'Familias y agrupaciones de catálogo | ZAP Admin' }

export default function AdminCategoriesPage() {
  return <div className="mx-auto max-w-3xl space-y-8">
    <section className="space-y-4">
      <div><h1 className="text-2xl font-bold text-gray-950">Familias comerciales</h1><p className="mt-1 text-sm text-gray-600">Definen el motor comercial de cada producto; no son categorías editoriales.</p></div>
      <div className="grid gap-3 sm:grid-cols-2">{catalogFamilies.map((family) => <article key={family.slug} className="rounded-xl border border-gray-200 bg-white p-4"><p className="font-semibold text-gray-900">{family.label}</p><p className="mt-1 font-mono text-xs text-gray-500">{family.engine}</p></article>)}</div>
    </section>
    <section className="space-y-3">
      <div><h2 className="text-lg font-bold text-gray-950">Agrupaciones de catálogo</h2><p className="text-sm text-gray-600">Agrupan productos relacionados para que el cliente los encuentre juntos, sin cambiar su familia ni su motor comercial.</p></div>
      <div className="grid gap-3 sm:grid-cols-2">{catalogGroups.map((group) => <article key={group.slug} className="rounded-xl border border-gray-200 bg-white p-4"><p className="font-semibold text-gray-900">{group.label}</p><p className="mt-1 font-mono text-xs text-gray-500">/{group.slug}</p><p className="mt-2 text-xs text-gray-600">{group.productSlugs.length} productos previstos</p></article>)}</div>
    </section>
  </div>
}
