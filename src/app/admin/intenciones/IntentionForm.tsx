'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createIntention, updateIntention } from './actions'

export default function IntentionForm({ intention }: { intention?: any }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name') as string,
      slug: formData.get('slug') as string,
      icon: formData.get('icon') as string,
      description: formData.get('description') as string,
      mediaType: formData.get('mediaType') as string,
      mediaUrl: formData.get('mediaUrl') as string,
      mediaTitle: formData.get('mediaTitle') as string,
      order: parseInt(formData.get('order') as string) || 0,
      active: formData.get('active') === 'on',
    }

    try {
      if (intention) {
        await updateIntention(intention.id, data)
      } else {
        await createIntention(data)
      }
      router.push('/admin/intenciones')
      router.refresh()
    } catch (error) {
      console.error(error)
      alert('Error al guardar el objetivo')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre del Objetivo</label>
          <input
            type="text"
            name="name"
            defaultValue={intention?.name}
            required
            placeholder="Ej. Que me vean en la calle"
            className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm outline-none focus:border-[#ED2C71] focus:ring-1 focus:ring-[#ED2C71]"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Slug (URL)</label>
          <input
            type="text"
            name="slug"
            defaultValue={intention?.slug}
            required
            placeholder="Ej. que-me-vean"
            className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm outline-none focus:border-[#ED2C71] focus:ring-1 focus:ring-[#ED2C71]"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Icono (Emoji)</label>
          <input
            type="text"
            name="icon"
            defaultValue={intention?.icon}
            placeholder="Ej. 📢"
            className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm outline-none focus:border-[#ED2C71] focus:ring-1 focus:ring-[#ED2C71]"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Orden de visualización</label>
          <input
            type="number"
            name="order"
            defaultValue={intention?.order ?? 0}
            required
            className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm outline-none focus:border-[#ED2C71] focus:ring-1 focus:ring-[#ED2C71]"
          />
        </div>
        {intention && (
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="active"
                defaultChecked={intention.active}
                className="rounded border-gray-300 text-[#ED2C71] focus:ring-[#ED2C71]"
              />
              <span className="text-sm font-semibold text-gray-700">Activo / Visible</span>
            </label>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Descripción comercial</label>
        <textarea
          name="description"
          defaultValue={intention?.description}
          rows={2}
          className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm outline-none focus:border-[#ED2C71] focus:ring-1 focus:ring-[#ED2C71]"
        />
      </div>

      <div className="border-t border-gray-100 pt-5 mt-5">
        <h3 className="font-semibold text-gray-900 mb-4">Multimedia (Hero)</h3>
        <div className="grid sm:grid-cols-3 gap-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Tipo de Medio</label>
            <select
              name="mediaType"
              defaultValue={intention?.mediaType || 'NONE'}
              className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm outline-none focus:border-[#ED2C71] focus:ring-1 focus:ring-[#ED2C71]"
            >
              <option value="NONE">Ninguno</option>
              <option value="YOUTUBE">Video YouTube</option>
              <option value="AUDIO">Audio (MP3)</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1">URL del archivo/video</label>
            <input
              type="text"
              name="mediaUrl"
              defaultValue={intention?.mediaUrl}
              placeholder="https://..."
              className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm outline-none focus:border-[#ED2C71] focus:ring-1 focus:ring-[#ED2C71]"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-semibold text-gray-700 mb-1">Título del medio (opcional)</label>
          <input
            type="text"
            name="mediaTitle"
            defaultValue={intention?.mediaTitle}
            placeholder="Ej. Escuchá nuestro demo"
            className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm outline-none focus:border-[#ED2C71] focus:ring-1 focus:ring-[#ED2C71]"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-5 border-t border-gray-100">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary"
        >
          {loading ? 'Guardando...' : intention ? 'Actualizar Objetivo' : 'Crear Objetivo'}
        </button>
      </div>
    </form>
  )
}
