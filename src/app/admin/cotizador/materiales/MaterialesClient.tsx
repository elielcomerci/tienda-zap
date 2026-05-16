'use client'

import { useState } from 'react'
import { Plus, Edit2, Trash2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createRawMaterial, updateRawMaterial, deleteRawMaterial } from '../actions'

type Tier = {
  id?: string
  minQty: number
  maxQty: number | null
  unitPrice: number
}

type Material = {
  id: string
  name: string
  width: number
  height: number
  unit: string
  active: boolean
  tiers: Tier[]
}

export default function MaterialesClient({
  initialMateriales,
}: {
  initialMateriales: Material[]
}) {
  const router = useRouter()
  const [materiales] = useState<Material[]>(initialMateriales)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  const [form, setForm] = useState({
    name: '',
    width: 0,
    height: 0,
    unit: 'PLIEGO',
    active: true,
  })
  
  const [tiers, setTiers] = useState<Tier[]>([])
  const [isSaving, setIsSaving] = useState(false)

  const openNew = () => {
    setEditingId(null)
    setForm({ name: '', width: 0, height: 0, unit: 'PLIEGO', active: true })
    setTiers([{ minQty: 1, maxQty: null, unitPrice: 0 }])
    setIsModalOpen(true)
  }

  const openEdit = (m: Material) => {
    setEditingId(m.id)
    setForm({ name: m.name, width: m.width, height: m.height, unit: m.unit, active: m.active })
    setTiers(m.tiers.map(t => ({ ...t })))
    setIsModalOpen(true)
  }

  const handleAddTier = () => {
    const lastTier = tiers[tiers.length - 1]
    setTiers([
      ...tiers,
      { minQty: lastTier ? (lastTier.maxQty || lastTier.minQty) + 1 : 1, maxQty: null, unitPrice: 0 }
    ])
  }

  const handleUpdateTier = (index: number, field: keyof Tier, value: number | null) => {
    const newTiers = [...tiers]
    newTiers[index] = { ...newTiers[index], [field]: value }
    setTiers(newTiers)
  }

  const handleRemoveTier = (index: number) => {
    setTiers(tiers.filter((_, i) => i !== index))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      if (editingId) {
        await updateRawMaterial(editingId, { ...form, tiers })
      } else {
        await createRawMaterial({ ...form, tiers })
      }
      router.refresh()
      setIsModalOpen(false)
    } catch (err) {
      alert('Error guardando material')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('¿Seguro que deseas eliminar este material?')) {
      await deleteRawMaterial(id)
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Materias Primas</h1>
          <p className="text-gray-500">Administra los pliegos y sus escalas de precios</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
        >
          <Plus size={18} />
          Nuevo Material
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {materiales.map((m) => (
          <div key={m.id} className={`rounded-xl border p-5 ${m.active ? 'bg-white' : 'bg-gray-50 opacity-75'}`}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">{m.name}</h3>
                <p className="text-sm text-gray-500">{m.width}cm x {m.height}cm ({m.unit})</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(m)} className="text-gray-400 hover:text-blue-600">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleDelete(m.id)} className="text-gray-400 hover:text-red-600">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            
            <div className="space-y-2 mt-4 pt-4 border-t border-gray-100">
              <h4 className="text-xs font-semibold text-gray-400 uppercase">Escalas de Precio</h4>
              {m.tiers.map((t, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {t.minQty} - {t.maxQty ? t.maxQty : '∞'} {m.unit.toLowerCase()}(s)
                  </span>
                  <span className="font-medium text-gray-900">${t.unitPrice.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 shrink-0">
              <h2 className="text-xl font-bold text-gray-900">
                {editingId ? 'Editar Material' : 'Nuevo Material'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:bg-gray-100 rounded-lg p-2">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">Nombre del material</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="input"
                    placeholder="Ej: Ilustración 300gr 32x47"
                  />
                </div>
                <div>
                  <label className="label">Ancho (cm)</label>
                  <input
                    required
                    type="number"
                    step="0.1"
                    min="1"
                    value={form.width}
                    onChange={(e) => setForm({ ...form, width: Number(e.target.value) })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Alto (cm)</label>
                  <input
                    required
                    type="number"
                    step="0.1"
                    min="1"
                    value={form.height}
                    onChange={(e) => setForm({ ...form, height: Number(e.target.value) })}
                    className="input"
                  />
                </div>
              </div>

              <div className="border-t border-gray-100 pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-gray-900">Escalas de Precio</h3>
                  <button type="button" onClick={handleAddTier} className="text-sm font-semibold text-orange-600 hover:text-orange-700">
                    + Añadir Escala
                  </button>
                </div>

                {/* Column headers */}
                <div className="grid grid-cols-[1fr_1fr_1fr_32px] gap-2 px-1 mb-1">
                  <span className="text-xs font-semibold text-gray-400">Desde</span>
                  <span className="text-xs font-semibold text-gray-400">Hasta</span>
                  <span className="text-xs font-semibold text-gray-400">Costo ($)</span>
                  <span />
                </div>

                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {tiers.map((tier, index) => (
                    <div key={index} className="grid grid-cols-[1fr_1fr_1fr_32px] gap-2 items-center">
                      <input
                        type="number" min="1" required value={tier.minQty}
                        onChange={(e) => handleUpdateTier(index, 'minQty', Number(e.target.value))}
                        className="input !py-1.5 !text-sm"
                      />
                      <input
                        type="number" min={tier.minQty} value={tier.maxQty || ''}
                        placeholder="∞"
                        onChange={(e) => handleUpdateTier(index, 'maxQty', e.target.value ? Number(e.target.value) : null)}
                        className="input !py-1.5 !text-sm"
                      />
                      <input
                        type="number" step="0.01" required value={tier.unitPrice}
                        onChange={(e) => handleUpdateTier(index, 'unitPrice', Number(e.target.value))}
                        className="input !py-1.5 !text-sm"
                      />
                      <button
                        type="button" onClick={() => handleRemoveTier(index)}
                        className="flex h-8 w-8 items-center justify-center text-red-400 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              </div> {/* end scrollable body */}

              <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl disabled:opacity-50"
                >
                  {isSaving ? 'Guardando...' : 'Guardar Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
