import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import Image from 'next/image'
import { getAllProductsAdmin, deleteProduct, duplicateProduct } from '@/lib/actions/products'
import { Plus, Edit2, Copy, Trash2, Tag, Search, Check, X } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Productos | ZAP Admin' }

export default async function AdminProductsPage() {
  const products = await getAllProductsAdmin()

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
              {products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    No hay productos cargados todavía.
                  </td>
                </tr>
              ) : (
                products.map((product) => (
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
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900">
                      ${product.price.toLocaleString('es-AR')}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`font-semibold ${product.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {product.stock}
                      </span>
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
