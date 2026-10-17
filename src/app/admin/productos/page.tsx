import Link from 'next/link'
import { Image as ImageIcon } from 'lucide-react'
import { deleteProduct, duplicateProduct } from '@/lib/actions/products'
import { getAllProductsAdmin } from '@/lib/products'
import { getProductFamilyLabel, getProductModalityLabel } from '@/lib/catalog-domain'

export const dynamic = 'force-dynamic'

export default async function AdminProductsPage() {
  const products = await getAllProductsAdmin()

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-950">Product Bases</h1>
          <p className="mt-1 text-sm text-gray-600">Cada producto tiene un motor comercial y una o más categorías visibles en la tienda. Los configuradores se versionan por separado.</p>
        </div>
        <Link href="/admin/productos/nuevo" className="btn-primary">Nuevo Product Base</Link>
      </header>
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500"><tr><th className="px-4 py-3">Producto</th><th className="px-4 py-3">Motor</th><th className="px-4 py-3">Categorías comerciales</th><th className="px-4 py-3">Modalidad</th><th className="px-4 py-3">Configurador</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3" /></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {products.map((product) => (
              <tr key={product.id}>
                <td className="px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                      {product.images[0] ? (
                        <img src={product.images[0]} alt="" loading="lazy" className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon aria-hidden="true" size={20} className="text-gray-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900">{product.name}</p>
                      <p className="font-mono text-xs text-gray-500">/{product.slug}</p>
                      {product.images.length > 1 && <p className="mt-1 text-xs text-gray-500">{product.images.length} imágenes</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-700">{getProductFamilyLabel(product)}</td>
                <td className="px-4 py-3 text-gray-700">{product.categoryLinks.map((link) => link.category.name).join(', ') || 'Sin categoría'}</td>
                <td className="px-4 py-3 text-gray-700">{getProductModalityLabel(product.modality)}</td>
                <td className="px-4 py-3 text-gray-700">{[...product.configuratorVersions].sort((a, b) => b.schemaVersion.localeCompare(a.schemaVersion, undefined, { numeric: true })).map((version) => `${version.schemaVersion} · ${version.status}`).join(', ') || '—'}</td>
                <td className="px-4 py-3"><span className={product.active ? 'text-emerald-700' : 'text-gray-500'}>{product.active ? 'Activo' : 'Inactivo'}</span></td>
                <td className="px-4 py-3"><div className="flex justify-end gap-2"><Link className="btn-secondary !px-2 !py-1 text-xs" href={`/admin/productos/${product.id}`}>Editar</Link><form action={duplicateProduct.bind(null, product.id)}><button className="btn-secondary !px-2 !py-1 text-xs">Duplicar</button></form><form action={deleteProduct.bind(null, product.id)}><button className="rounded border border-red-200 px-2 py-1 text-xs text-red-700">Desactivar</button></form></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
