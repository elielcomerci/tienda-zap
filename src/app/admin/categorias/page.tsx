export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Categorias | ZAP Admin',
}

import { Plus, Tag, Trash2, Wrench } from 'lucide-react'
import {
  createCategory,
  deleteCategory,
  setCategoryServiceFlag,
} from '@/lib/actions/categories'
import { getCategories } from '@/lib/categories'

export default async function AdminCategoriesPage() {
  const categories = await getCategories()

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Categorias</h1>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        <div>
          <form action={createCategory} className="card sticky top-24 p-6">
            <h2 className="mb-4 flex items-center gap-2 font-bold text-gray-900">
              <Plus size={18} className="text-orange-500" />
              Nueva categoria
            </h2>
            <div className="space-y-4">
              <div>
                <label className="label">Nombre</label>
                <input
                  type="text"
                  name="name"
                  required
                  className="input"
                  placeholder="Ej: Tarjetas Personales"
                />
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <input type="hidden" name="isService" value="false" />
                <input
                  type="checkbox"
                  name="isService"
                  value="true"
                  className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                />
                <div>
                  <p className="text-sm font-semibold text-gray-900">Categoria de servicio</p>
                  <p className="text-xs text-gray-500">
                    Oculta archivos y stock fisico en checkout.
                  </p>
                </div>
              </label>

              <button type="submit" className="btn-primary w-full justify-center">
                Guardar categoria
              </button>
            </div>
          </form>
        </div>

        <div className="md:col-span-2">
          <div className="card overflow-hidden">
            <div className="border-b border-gray-100 bg-gray-50 p-4 text-sm font-semibold text-gray-500">
              {categories.length} categorias registradas
            </div>
            {categories.length === 0 ? (
              <div className="p-8 text-center text-gray-400">No hay categorias cargadas</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {categories.map((category) => (
                  <li
                    key={category.id}
                    className="group flex items-center justify-between gap-4 p-4 transition-colors hover:bg-orange-50/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                        {category.isService ? <Wrench size={18} /> : <Tag size={18} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-gray-900">{category.name}</p>
                          {category.isService && (
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-700">
                              Servicio
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 font-mono text-xs text-gray-500">/{category.slug}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <form
                        action={async () => {
                          'use server'
                          await setCategoryServiceFlag(category.id, !category.isService)
                        }}
                      >
                        <button
                          type="submit"
                          className="btn-secondary !py-1.5 !text-xs"
                          title="Cambiar tipo"
                        >
                          {category.isService ? 'Marcar fisica' : 'Marcar servicio'}
                        </button>
                      </form>

                      <form
                        action={async () => {
                          'use server'
                          await deleteCategory(category.id)
                        }}
                      >
                        <button
                          type="submit"
                          className="rounded-lg p-2 text-gray-400 opacity-0 transition-colors group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 focus:opacity-100"
                          title="Eliminar categoria"
                        >
                          <Trash2 size={18} />
                        </button>
                      </form>
                    </div>
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
