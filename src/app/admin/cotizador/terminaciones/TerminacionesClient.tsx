'use client'

import { useState } from 'react'
import { Plus, Edit2, Trash2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createFinishing, updateFinishing, deleteFinishing } from '../actions'
import { FinishingCostType } from '@prisma/client'

type Tier = {
  id?: string
  minQty: number
  maxQty: number | null
  unitPrice: number
}

type Finishing = {
  id: string
  name: string
  costType: FinishingCostType
  active: boolean
  tiers: Tier[]
}

const COST_TYPE_LABELS: Record<FinishingCostType, string> = {
  FIXED_SETUP: 'Fijo por Lote (Setup)',
  PER_SHEET: 'Por Pliego Utilizado',
  PER_UNIT: 'Por Unidad Final',
}

export default function TerminacionesClient({
  initialFinishings,
}: {
  initialFinishings: Finishing[]
}) {
  const router = useRouter()
  const [finishings] = useState<Finishing[]>(initialFinishings)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  const [form, setForm] = useState<{
    name: string
    costType: FinishingCostType
    active: boolean
  }>({
    name: '',
    costType: 'PER_SHEET',
    active: true,
  })
  
  const [tiers, setTiers] = useState<Tier[]>([])
  const [isSaving, setIsSaving] = useState(false)

  const openNew = () => {
    setEditingId(null)
    setForm({ name: '', costType: 'PER_SHEET', active: true })
    setTiers([{ minQty: 1, maxQty: null, unitPrice: 0 }])
    setIsModalOpen(true)
  }

  const openEdit = (f: Finishing) => {
    setEditingId(f.id)
    setForm({ name: f.name, costType: f.costType, active: f.active })
    setTiers(f.tiers.map(t => ({ ...t })))
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
        await updateFinishing(editingId, { ...form, tiers })
      } else {
        await createFinishing({ ...form, tiers })
      }
      router.refresh()
      setIsModalOpen(false)
    } catch (err) {
      alert('Error guardando terminación')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('¿Seguro que deseas eliminar esta terminación?')) {
      await deleteFinishing(id)
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Terminaciones y Procesos</h1>
          <p className="text-gray-500">Administra cortes, laminados, troqueles y sus costos</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
        >
          <Plus size={18} />
          Nueva Terminación
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {finishings.map((f) => (
          <div key={f.id} className={`rounded-xl border p-5 ${f.active ? 'bg-white' : 'bg-gray-50 opacity-75'}`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{f.name}</h3>
                <p className="text-sm text-gray-500">{COST_TYPE_LABELS[f.costType]}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(f)} className="p-2 text-gray-400 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 rounded-lg">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleDelete(f.id)} className="p-2 text-gray-400 hover:text-red-600 bg-gray-50 hover:bg-red-50 rounded-lg">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="space-y-2 mt-4 pt-4 border-t border-gray-100">
              <h4 className="text-xs font-semibold text-gray-400 uppercase">Escalas de Precio</h4>
              {f.tiers.map((t, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {t.minQty} - {t.maxQty ? t.maxQty : '∞'} {f.costType === 'PER_SHEET' ? 'pliego(s)' : 'u.'}
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
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
              <h2 className="text-xl font-bold text-gray-900">
                {editingId ? 'Editar Terminación' : 'Nueva Terminación'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:bg-gray-100 rounded-lg p-2">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-6">
              <div>
                <label className="label">Nombre del proceso</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input"
                  placeholder="Ej: Laminado Mate Frente y Dorso"
                />
              </div>

              <div>
                <label className="label">Tipo de Costo</label>
                <select
                  value={form.costType}
                  onChange={(e) => setForm({ ...form, costType: e.target.value as FinishingCostType })}
                  className="input"
                >
                  {Object.entries(COST_TYPE_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {form.costType === 'FIXED_SETUP' && 'Cobra un valor único sin importar cuántos pliegos o unidades sean (Ej: Matriz de Troquel).'}
                  {form.costType === 'PER_SHEET' && 'Multiplica el costo por la cantidad de pliegos necesarios.'}
                  {form.costType === 'PER_UNIT' && 'Multiplica el costo por la cantidad de piezas/productos finales.'}
                </p>
              </div>

              <div className="border-t border-gray-100 pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-gray-900">Escalas de Precio</h3>
                  <button type="button" onClick={handleAddTier} className="text-sm font-semibold text-orange-600 hover:text-orange-700">
                    + Añadir Escala
                  </button>
                </div>

                <div className="space-y-3">
                  {tiers.map((tier, index) => (
                    <div key={index} className="flex gap-3 items-end p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="flex-1">
                        <label className="label text-xs">Cant. Desde</label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={tier.minQty}
                          onChange={(e) => handleUpdateTier(index, 'minQty', Number(e.target.value))}
                          className="input"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="label text-xs">Cant. Hasta (vacío = infinito)</label>
                        <input
                          type="number"
                          min={tier.minQty}
                          value={tier.maxQty || ''}
                          onChange={(e) => handleUpdateTier(index, 'maxQty', e.target.value ? Number(e.target.value) : null)}
                          className="input"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="label text-xs">Costo ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={tier.unitPrice}
                          onChange={(e) => handleUpdateTier(index, 'unitPrice', Number(e.target.value))}
                          className="input"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveTier(index)}
                        className="p-3 text-red-500 hover:bg-red-50 rounded-lg mb-[2px]"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
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
                  {isSaving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
