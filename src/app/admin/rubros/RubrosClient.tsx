'use client'

import { useState } from 'react'
import { Briefcase, Pencil, Plus, Trash2, X } from 'lucide-react'
import {
  createBusinessTypeAction,
  updateBusinessTypeAction,
  deleteBusinessTypeAction,
} from '@/lib/actions/business-types'

type BusinessType = {
  id: string
  name: string
  slug: string
  categories: { id: string; name: string; slug: string }[]
  _count: { users: number }
}

type Category = {
  id: string
  name: string
  slug: string
}

export default function RubrosClient({
  businessTypes,
  categories,
}: {
  businessTypes: BusinessType[]
  categories: Category[]
}) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])

  const resetForm = () => {
    setShowForm(false)
    setEditingId(null)
    setName('')
    setSlug('')
    setSelectedCategoryIds([])
  }

  const startEdit = (bt: BusinessType) => {
    setEditingId(bt.id)
    setName(bt.name)
    setSlug(bt.slug)
    setSelectedCategoryIds(bt.categories.map((c) => c.id))
    setShowForm(true)
  }

  const toggleCategory = (catId: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    )
  }

  const handleNameChange = (value: string) => {
    setName(value)
    if (!editingId) {
      setSlug(
        value
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
      )
    }
  }

  return (
    <div className="space-y-6">
      {/* Create / Edit form */}
      {showForm ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">
              {editingId ? 'Editar rubro' : 'Nuevo rubro'}
            </h2>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>

          <form
            action={async (formData) => {
              if (editingId) {
                formData.set('id', editingId)
                await updateBusinessTypeAction(formData)
              } else {
                await createBusinessTypeAction(formData)
              }
              resetForm()
            }}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Nombre</label>
                <input
                  name="name"
                  type="text"
                  required
                  className="input"
                  placeholder="Gastronomía"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Slug</label>
                <input
                  name="slug"
                  type="text"
                  required
                  className="input"
                  placeholder="gastronomia"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="label">Categorías asociadas</label>
              <p className="mb-2 text-xs text-gray-500">
                Los usuarios de este rubro verán priorizados los productos de estas categorías en la
                página principal.
              </p>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => {
                  const isSelected = selectedCategoryIds.includes(cat.id)
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCategory(cat.id)}
                      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${
                        isSelected
                          ? 'border-[#ED2C71] bg-[#FEF1F6] text-[#C91F5B]'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {cat.name}
                    </button>
                  )
                })}
                {selectedCategoryIds.map((id) => (
                  <input key={id} type="hidden" name="categoryIds" value={id} />
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="btn-secondary !py-2 !px-4 !text-sm"
              >
                Cancelar
              </button>
              <button type="submit" className="btn-primary !py-2 !px-4 !text-sm">
                {editingId ? 'Guardar cambios' : 'Crear rubro'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary !py-2.5 !px-5 !text-sm"
        >
          <Plus size={16} />
          Nuevo rubro
        </button>
      )}

      {/* List */}
      {businessTypes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
          <Briefcase size={32} className="mx-auto text-gray-300" />
          <p className="mt-3 text-sm font-semibold text-gray-500">No hay rubros creados</p>
          <p className="mt-1 text-xs text-gray-400">
            Creá un rubro para que los usuarios puedan seleccionarlo al registrarse.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {businessTypes.map((bt) => (
            <div
              key={bt.id}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-gray-900">{bt.name}</h3>
                  <p className="text-xs text-gray-400 font-mono">{bt.slug}</p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => startEdit(bt)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    title="Editar"
                  >
                    <Pencil size={14} />
                  </button>
                  <form action={deleteBusinessTypeAction}>
                    <input type="hidden" name="id" value={bt.id} />
                    <button
                      type="submit"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                      title="Eliminar"
                      onClick={(e) => {
                        if (!confirm(`¿Eliminar rubro "${bt.name}"?`)) e.preventDefault()
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </form>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {bt.categories.length > 0 ? (
                  bt.categories.map((cat) => (
                    <span
                      key={cat.id}
                      className="rounded-full bg-[#FEF1F6] px-2.5 py-0.5 text-[11px] font-semibold text-[#C91F5B]"
                    >
                      {cat.name}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-400 italic">Sin categorías</span>
                )}
              </div>

              <p className="mt-3 text-xs text-gray-400">
                {bt._count.users} usuario{bt._count.users !== 1 ? 's' : ''} registrado
                {bt._count.users !== 1 ? 's' : ''}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
