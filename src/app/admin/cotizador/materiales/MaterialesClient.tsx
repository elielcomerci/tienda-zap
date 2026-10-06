'use client'

import { useMemo, useState } from 'react'
import { Plus, Edit2, Trash2, X, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createRawMaterial, updateRawMaterial, deleteRawMaterial } from '../actions'

type Tier = { id?: string; minQty: number; maxQty: number | null; unitPrice: number }
type Material = { id: string; name: string; width: number; height: number; unit: string; active: boolean; tiers: Tier[] }

export default function MaterialesClient({ initialMateriales }: { initialMateriales: Material[] }) {
  const router = useRouter()
  const [materiales] = useState(initialMateriales)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
  const [form, setForm] = useState({ name: '', width: 0, height: 0, unit: 'PLIEGO', active: true })
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
    setTiers(m.tiers.map((tier) => ({ ...tier })))
    setIsModalOpen(true)
  }

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsSaving(true)
    try {
      if (editingId) await updateRawMaterial(editingId, { ...form, tiers })
      else await createRawMaterial({ ...form, tiers })
      router.refresh()
      setIsModalOpen(false)
    } catch {
      alert('Error guardando material')
    } finally {
      setIsSaving(false)
    }
  }

  const filteredMateriales = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return materiales.filter((material) => {
      const matchesSearch =
        !query ||
        material.name.toLowerCase().includes(query) ||
        material.unit.toLowerCase().includes(query) ||
        `${material.width}x${material.height}`.includes(query)
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && material.active) ||
        (statusFilter === 'INACTIVE' && !material.active)
      return matchesSearch && matchesStatus
    })
  }, [materiales, searchQuery, statusFilter])

  const addTier = () => {
    const last = tiers[tiers.length - 1]
    setTiers([...tiers, { minQty: last ? (last.maxQty || last.minQty) + 1 : 1, maxQty: null, unitPrice: 0 }])
  }

  const updateTier = (index: number, field: keyof Tier, value: number | null) => {
    setTiers(tiers.map((tier, i) => i === index ? { ...tier, [field]: value } : tier))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Materias Primas</h1>
          <p className="text-gray-500">Administrá materiales y sus escalas de costo.</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600">
          <Plus size={18} /> Nuevo Material
        </button>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
          <label className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500">
            Buscar
            <div className="relative mt-2">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="input !pl-9 !text-sm" placeholder="Nombre, medida o unidad" />
            </div>
          </label>
          <label className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500">
            Estado
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="input mt-2 !text-sm">
              <option value="ALL">Todos</option><option value="ACTIVE">Activos</option><option value="INACTIVE">Inactivos</option>
            </select>
          </label>
        </div>
        <p className="mt-3 text-xs font-semibold text-gray-500">Mostrando {filteredMateriales.length} de {materiales.length} materias primas.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredMateriales.map((material) => (
          <div key={material.id} className={`rounded-xl border p-5 ${material.active ? 'bg-white' : 'bg-gray-50 opacity-75'}`}>
            <div className="mb-4 flex items-start justify-between">
              <div><h3 className="font-semibold text-gray-900">{material.name}</h3><p className="text-sm text-gray-500">{material.width}cm × {material.height}cm ({material.unit})</p></div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(material)} className="text-gray-400 hover:text-blue-600"><Edit2 size={16} /></button>
                <button onClick={async () => { if (confirm('¿Seguro que deseas eliminar este material?')) { await deleteRawMaterial(material.id); router.refresh() } }} className="text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
              </div>
            </div>
            <div className="space-y-2 border-t border-gray-100 pt-4">
              <h4 className="text-xs font-semibold uppercase text-gray-400">Escalas de Precio</h4>
              {material.tiers.map((tier, index) => (
                <div key={tier.id || index} className="flex justify-between text-sm">
                  <span className="text-gray-600">{tier.minQty} - {tier.maxQty ?? '∞'} {material.unit.toLowerCase()}(s)</span>
                  <span className="font-medium text-gray-900">${tier.unitPrice.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-xl font-bold text-gray-900">{editingId ? 'Editar Material' : 'Nuevo Material'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 space-y-5 overflow-y-auto p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2"><label className="label">Nombre del material</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" /></div>
                  <div><label className="label">Ancho (cm)</label><input required type="number" min="1" step="0.1" value={form.width} onChange={(e) => setForm({ ...form, width: Number(e.target.value) })} className="input" /></div>
                  <div><label className="label">Alto (cm)</label><input required type="number" min="1" step="0.1" value={form.height} onChange={(e) => setForm({ ...form, height: Number(e.target.value) })} className="input" /></div>
                </div>
                <div className="border-t border-gray-100 pt-6">
                  <div className="mb-4 flex items-center justify-between"><h3 className="font-semibold text-gray-900">Escalas de Precio</h3><button type="button" onClick={addTier} className="text-sm font-semibold text-orange-600">+ Añadir Escala</button></div>
                  <div className="mb-1 grid grid-cols-[1fr_1fr_1fr_32px] gap-2 px-1 text-xs font-semibold text-gray-400"><span>Desde</span><span>Hasta</span><span>Costo ($)</span><span /></div>
                  <div className="max-h-52 space-y-1.5 overflow-y-auto">
                    {tiers.map((tier, index) => (
                      <div key={index} className="grid grid-cols-[1fr_1fr_1fr_32px] items-center gap-2">
                        <input type="number" min="1" required value={tier.minQty} onChange={(e) => updateTier(index, 'minQty', Number(e.target.value))} className="input !py-1.5 !text-sm" />
                        <input type="number" min={tier.minQty} value={tier.maxQty || ''} placeholder="∞" onChange={(e) => updateTier(index, 'maxQty', e.target.value ? Number(e.target.value) : null)} className="input !py-1.5 !text-sm" />
                        <input type="number" step="0.01" required value={tier.unitPrice} onChange={(e) => updateTier(index, 'unitPrice', Number(e.target.value))} className="input !py-1.5 !text-sm" />
                        <button type="button" onClick={() => setTiers(tiers.filter((_, i) => i !== index))} className="flex h-8 w-8 items-center justify-center rounded-lg text-red-400 hover:bg-red-50"><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-xl px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={isSaving} className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50">{isSaving ? 'Guardando...' : 'Guardar Material'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
