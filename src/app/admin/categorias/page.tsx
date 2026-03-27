export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Categorías | ZAP Admin',
}

import { createCategory, deleteCategory } from '@/lib/actions/categories'
import { getCategories } from '@/lib/categories'
import { prisma } from '@/lib/prisma'
import { Tag, Trash2, Plus } from 'lucide-react'

export default async function AdminCategoriesPage() {
  const categories = await getCategories()

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Categorías</h1>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Formulario Crear */}
        <div>
          <form action={createCategory} className="card p-6 sticky top-24">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Plus size={18} className="text-orange-500" /> Nueva categoría
            </h2>
            <div className="space-y-4">
              <div>
                <label className="label">Nombre</label>
                <input type="text" name="name" required className="input" placeholder="Ej: Tarjetas Personales" />
              </div>
              <button type="submit" className="btn-primary w-full justify-center">Guardar categoría</button>
            </div>
          </form>
        </div>

        {/* Lista */}
        <div className="md:col-span-2">
          <div className="card overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-100 font-semibold text-gray-500 text-sm">
              {categories.length} categorías registradas
            </div>
            {categories.length === 0 ? (
              <div className="p-8 text-center text-gray-400">No hay categorías cargadas</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {categories.map((cat) => (
                  <li key={cat.id} className="p-4 flex items-center justify-between hover:bg-orange-50/50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                        <Tag size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{cat.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5 font-mono">/{cat.slug}</p>
                      </div>
                    </div>
                    <form action={async () => {
                      'use server'
                      await deleteCategory(cat.id)
                    }}>
                      <button type="submit" className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100" title="Eliminar categoría">
                        <Trash2 size={18} />
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
