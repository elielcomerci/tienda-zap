'use client'

import { useState } from 'react'
import { Plus, Edit, Trash2, Megaphone, Check, X, ShieldAlert } from 'lucide-react'
import { PartnerCampaign } from '@prisma/client'
import { createCampaign, updateCampaign, deleteCampaign, toggleCampaignActive } from './actions'

type CampanaFormData = {
  id?: string
  zone: string
  format: string
  title: string
  description: string
  ctaText: string
  imageUrl: string
  backgroundColor: string
  textColor: string
  actionType: string
  actionUrl: string
  productId: string
}

const DEFAULT_FORM: CampanaFormData = {
  zone: 'resumen',
  format: 'banner_small',
  title: '',
  description: '',
  ctaText: '',
  imageUrl: '',
  backgroundColor: '#f97316',
  textColor: '#ffffff',
  actionType: 'open_url',
  actionUrl: '',
  productId: ''
}

export default function CampanasClient({ initialCampaigns }: { initialCampaigns: PartnerCampaign[] }) {
  const [campaigns, setCampaigns] = useState(initialCampaigns)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState<CampanaFormData>(DEFAULT_FORM)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleOpenModal = (campaign?: PartnerCampaign) => {
    if (campaign) {
      setFormData({
        id: campaign.id,
        zone: campaign.zone,
        format: campaign.format,
        title: campaign.title,
        description: campaign.description || '',
        ctaText: campaign.ctaText || '',
        imageUrl: campaign.imageUrl || '',
        backgroundColor: campaign.backgroundColor || '#f97316',
        textColor: campaign.textColor || '#ffffff',
        actionType: campaign.actionType,
        actionUrl: campaign.actionUrl || '',
        productId: campaign.productId || ''
      })
    } else {
      setFormData(DEFAULT_FORM)
    }
    setError('')
    setIsModalOpen(true)
  }

  const handleCloseModal = () => setIsModalOpen(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      if (formData.id) {
        await updateCampaign(formData.id, formData)
      } else {
        await createCampaign(formData)
      }
      
      // We rely on revalidatePath to update server-side, but let's refresh page entirely or update state.
      window.location.reload()
      
    } catch (err: any) {
      setError(err.message || 'Error guardando campaña')
      setIsLoading(false)
    }
  }

  const handleToggle = async (id: string, currentStatus: boolean) => {
    try {
      setCampaigns(prev => prev.map(c => c.id === id ? { ...c, active: !currentStatus } : c))
      await toggleCampaignActive(id, !currentStatus)
    } catch (err) {
      // Revert on error
      setCampaigns(prev => prev.map(c => c.id === id ? { ...c, active: currentStatus } : c))
      alert('Error cambiando el estado de la campaña')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta campaña?')) return
    try {
      setCampaigns(prev => prev.filter(c => c.id !== id))
      await deleteCampaign(id)
    } catch (err) {
      window.location.reload()
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Megaphone className="text-orange-500" />
            Campañas Partner
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestiona los anuncios que se inyectan en kiosco24.
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2"
        >
          <Plus size={18} /> Crear Campaña
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campaigns.length === 0 ? (
          <div className="col-span-full card p-16 text-center">
            <ShieldAlert size={40} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-lg font-bold text-gray-900 mb-2">No hay campañas creadas</h2>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              Crea tu primera campaña para empezar a mostrar anuncios en las sucursales vinculadas de kiosco24.
            </p>
          </div>
        ) : (
          campaigns.map(camp => (
            <div key={camp.id} className={`card overflow-hidden border-2 transition-all ${camp.active ? 'border-transparent' : 'border-gray-200 opacity-60'}`}>
              {camp.imageUrl && (
                <div className="h-32 w-full bg-gray-100 overflow-hidden relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={camp.imageUrl} alt={camp.title} className="w-full h-full object-cover" />
                  {!camp.active && <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px]" />}
                </div>
              )}
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded uppercase tracking-wider">
                      {camp.zone}
                    </span>
                    <h3 className="font-bold text-gray-900 mt-2 text-lg leading-tight">{camp.title}</h3>
                  </div>
                  <button 
                    onClick={() => handleToggle(camp.id, camp.active)}
                    className={`p-1.5 rounded-full ${camp.active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}
                    title={camp.active ? 'Desactivar' : 'Activar'}
                  >
                    {camp.active ? <Check size={16} /> : <X size={16} />}
                  </button>
                </div>
                
                {camp.description && <p className="text-sm text-gray-500 mt-2 line-clamp-2">{camp.description}</p>}
                
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <div className="flex flex-col gap-1">
                    <span className="font-mono bg-gray-50 px-1 py-0.5 rounded">{camp.format}</span>
                    <span className="truncate max-w-[120px]">{camp.actionType}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleOpenModal(camp)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleDelete(camp.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
              <h2 className="text-xl font-bold text-gray-900">
                {formData.id ? 'Editar Campaña' : 'Nueva Campaña'}
              </h2>
              <button onClick={handleCloseModal} className="text-gray-400 hover:bg-gray-100 p-2 rounded-xl">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Zona</label>
                  <select 
                    value={formData.zone} onChange={e => setFormData({...formData, zone: e.target.value})}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none focus:border-orange-500" required
                  >
                    <option value="resumen">Resumen Checkout</option>
                    <option value="stats">Dashboard / Stats</option>
                    <option value="configuracion">Configuración</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Formato</label>
                  <select 
                    value={formData.format} onChange={e => setFormData({...formData, format: e.target.value})}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none focus:border-orange-500" required
                  >
                    <option value="text_only">Solo Texto</option>
                    <option value="banner_small">Banner Pequeño</option>
                    <option value="banner_large">Banner Grande</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Título</label>
                <input 
                  type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none focus:border-orange-500" required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Descripción (Opcional)</label>
                <textarea 
                  value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none focus:border-orange-500 min-h-[80px]" 
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">URL de la Imagen (Opcional)</label>
                <input 
                  type="url" value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none focus:border-orange-500" 
                  placeholder="https://ejemplo.com/imagen.jpg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Acción</label>
                  <select 
                    value={formData.actionType} onChange={e => setFormData({...formData, actionType: e.target.value})}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none focus:border-orange-500" required
                  >
                    <option value="open_url">Abrir Enlace</option>
                    <option value="one_click_order">Compra un Clic (ZAP)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {formData.actionType === 'open_url' ? 'URL de Destino' : 'ID del Producto ZAP'}
                  </label>
                  <input 
                    type="text" 
                    value={formData.actionType === 'open_url' ? formData.actionUrl : formData.productId} 
                    onChange={e => {
                      if (formData.actionType === 'open_url') setFormData({...formData, actionUrl: e.target.value, productId: ''})
                      else setFormData({...formData, productId: e.target.value, actionUrl: ''})
                    }}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none focus:border-orange-500" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                 <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Texto del Botón (CTA)</label>
                  <input 
                    type="text" value={formData.ctaText} onChange={e => setFormData({...formData, ctaText: e.target.value})}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none focus:border-orange-500" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Color de Fondo</label>
                  <input 
                    type="color" value={formData.backgroundColor} onChange={e => setFormData({...formData, backgroundColor: e.target.value})}
                    className="w-full h-[42px] border border-gray-200 rounded-xl p-1 cursor-pointer" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Color de Texto</label>
                  <input 
                    type="color" value={formData.textColor} onChange={e => setFormData({...formData, textColor: e.target.value})}
                    className="w-full h-[42px] border border-gray-200 rounded-xl p-1 cursor-pointer" 
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-gray-100">
                <button 
                  type="button" onClick={handleCloseModal} 
                  className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                  disabled={isLoading}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl flex items-center gap-2"
                  disabled={isLoading}
                >
                  {isLoading ? 'Guardando...' : 'Guardar Campaña'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
