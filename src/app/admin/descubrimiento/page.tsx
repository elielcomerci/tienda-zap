import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Descubrimiento comercial — Admin' }

export default async function DiscoveryAdminPage() {
  const [situations, needs, offers] = await Promise.all([
    prisma.situation.findMany({ include: { _count: { select: { offerEntries: true } } }, orderBy: [{ order: 'asc' }, { name: 'asc' }] }),
    prisma.need.findMany({ include: { _count: { select: { offerEntries: true } } }, orderBy: [{ order: 'asc' }, { name: 'asc' }] }),
    prisma.offerMatrixEntry.count(),
  ])
  return <div className="mx-auto max-w-5xl space-y-6"><header><h1 className="text-2xl font-bold text-gray-950">Descubrimiento comercial</h1><p className="mt-1 text-sm text-gray-600">Situaciones y necesidades se vinculan a los Product Bases exclusivamente mediante la matriz editorial versionada.</p></header><p className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">{offers} ofertas activas en la matriz. Para modificar relaciones, actualizá el dataset de seed y ejecutá su auditoría; esta pantalla no crea relaciones paralelas.</p><div className="grid gap-5 md:grid-cols-2"><EntityList title="Situaciones" entries={situations.map((item) => ({ name: item.name, slug: item.slug, count: item._count.offerEntries }))} /><EntityList title="Necesidades" entries={needs.map((item) => ({ name: item.name, slug: item.slug, count: item._count.offerEntries }))} /></div></div>
}

function EntityList({ title, entries }: { title: string; entries: Array<{ name: string; slug: string; count: number }> }) {
  return <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white"><h2 className="border-b border-gray-100 px-4 py-3 font-semibold text-gray-900">{title}</h2><ul className="divide-y divide-gray-100">{entries.map((item) => <li key={item.slug} className="flex items-center justify-between px-4 py-3"><div><p className="font-medium text-gray-900">{item.name}</p><p className="font-mono text-xs text-gray-500">/{item.slug}</p></div><span className="text-sm text-gray-600">{item.count} ofertas</span></li>)}</ul></section>
}
