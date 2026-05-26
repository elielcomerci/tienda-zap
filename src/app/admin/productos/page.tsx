import Link from 'next/link'
import Image from 'next/image'
import { deleteProduct, duplicateProduct } from '@/lib/actions/products'
import { getAllProductsAdmin } from '@/lib/products'
import { Plus, Edit2, Copy, Trash2, Search, Check, X } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Productos | ZAP Admin' }

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    q?: string
    category?: string
    status?: string
    type?: string
  }>
}) {
  const products = await getAllProductsAdmin()
  const params = (await searchParams) || {}
  const query = (params.q || '').trim().toLowerCase()
  const categoryFilter = params.category || 'ALL'
  const statusFilter = params.status || 'ALL'
  const typeFilter = params.type || 'ALL'
  const categories = Array.from(
    new Map(products.map((product) => [product.category.id, product.category])).values()
  ).sort((a, b) => a.name.localeCompare(b.name))
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      !query ||
      product.name.toLowerCase().includes(query) ||
      product.slug.toLowerCase().includes(query) ||
      product.category.name.toLowerCase().includes(query)
    const matchesCategory = categoryFilter === 'ALL' || product.category.id === categoryFilter
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && product.active) ||
      (statusFilter === 'INACTIVE' && !product.active)
    const matchesType =
      typeFilter === 'ALL' ||
      (typeFilter === 'SERVICE' && product.category.isService) ||
      (typeFilter === 'PHYSICAL' && !product.category.isService && !product.isCombo) ||
      (typeFilter === 'COMBO' && product.isCombo)

    return matchesSearch && matchesCategory && matchesStatus && matchesType
  })

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
          <p className="text-gray-500 text-sm mt-1">{products.length} productos registrados</p>
        </div>

        <Link href="/admin/productos/nuevo" className="btn-primary !px-6">
          <Plus size={18} /> Nuevo producto
        </Link>
      </div>

      <form className="mb-5 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_170px_180px_auto]">
          <label className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500">
            Buscar
            <div className="relative mt-2">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                name="q"
                defaultValue={params.q || ''}
                className="input !pl-9 !text-sm"
                placeholder="Producto, slug o categoria"
              />
            </div>
          </label>
          <label className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500">
            Categoria
            <select name="category" defaultValue={categoryFilter} className="input mt-2 !text-sm">
              <option value="ALL">Todas</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500">
            Estado
            <select name="status" defaultValue={statusFilter} className="input mt-2 !text-sm">
              <option value="ALL">Todos</option>
              <option value="ACTIVE">Activos</option>
              <option value="INACTIVE">Inactivos</option>
            </select>
          </label>
          <label className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500">
            Tipo
            <select name="type" defaultValue={typeFilter} className="input mt-2 !text-sm">
              <option value="ALL">Todos</option>
              <option value="PHYSICAL">Fisicos</option>
              <option value="SERVICE">Servicios</option>
              <option value="COMBO">Combos</option>
            </select>
          </label>
          <div className="flex items-end gap-2">
            <button type="submit" className="btn-primary h-11 justify-center !px-4">
              Filtrar
            </button>
            <Link href="/admin/productos" className="h-11 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50">
              Limpiar
            </Link>
          </div>
        </div>
        <p className="mt-3 text-xs font-semibold text-gray-500">
          Mostrando {filteredProducts.length} de {products.length} productos.
        </p>
      </form>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Producto</th>
                <th className="px-6 py-4">Categoría</th>
                <th className="px-6 py-4">Precio</th>
                <th className="px-6 py-4 text-center">Stock</th>
                <th className="px-6 py-4 text-center">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    No hay productos que coincidan con los filtros.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                          {product.images[0] ? (
                            <Image src={product.images[0]} alt={product.name} width={40} height={40} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg">ðŸ–¨ï¸</div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 group-hover:text-orange-500 transition-colors">{product.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">/{product.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="badge bg-gray-100 text-gray-600">
                        {product.category.name}
                      </span>
                      {product.category.isService && (
                        <span className="badge ml-2 bg-blue-100 text-blue-700">
                          Servicio
                        </span>
                      )}
                      {product.isCombo && (
                        <span className="badge ml-2 bg-[#FEF1F6] border border-[#F66B9A]/30 text-[#C91F5B]">
                          Combo ZAP
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900">
                      ${product.price.toLocaleString('es-AR')}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {product.category.isService ? (
                        <span className="font-semibold text-blue-600">N/A</span>
                      ) : (
                        <span className={`font-semibold ${product.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {product.stock}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center">
                        {product.active ? (
                          <span className="badge bg-green-100 text-green-700 gap-1"><Check size={12}/> Activo</span>
                        ) : (
                          <span className="badge bg-red-100 text-red-700 gap-1"><X size={12}/> Inactivo</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <Link href={`/admin/productos/${product.id}`} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                          <Edit2 size={16} />
                        </Link>
                        <form action={async () => {
                          'use server'
                          await duplicateProduct(product.id)
                        }}>
                          <button type="submit" className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors" title="Duplicar">
                            <Copy size={16} />
                          </button>
                        </form>
                        <form action={async () => {
                          'use server'
                          await deleteProduct(product.id)
                        }}>
                          <button type="submit" className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Archivar">
                            <Trash2 size={16} />
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
