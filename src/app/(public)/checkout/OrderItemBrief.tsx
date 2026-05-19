'use client'

import { useMemo, useState } from 'react'
import { LinkIcon, Plus, Trash2 } from 'lucide-react'
import { CartItem, useCartStore } from '@/lib/cart-store'

type BriefType = NonNullable<CartItem['briefType']>

const briefLabels: Record<BriefType, string> = {
  NONE: 'Sin brief',
  DESIGN: 'Brief de diseno',
  MUSIC: 'Brief de musica',
  VIDEO: 'Brief de video',
}

const briefFields: Record<Exclude<BriefType, 'NONE'>, Array<{ key: string; label: string; placeholder: string }>> = {
  DESIGN: [
    { key: 'business', label: 'Negocio / marca', placeholder: 'Nombre del negocio o rubro' },
    { key: 'mainMessage', label: 'Mensaje principal', placeholder: 'Que tiene que comunicar esta pieza?' },
    { key: 'style', label: 'Estilo visual', placeholder: 'Ej: moderno, premium, llamativo, minimalista' },
    { key: 'colors', label: 'Colores o restricciones', placeholder: 'Colores de marca, evitar algun color, etc.' },
  ],
  MUSIC: [
    { key: 'business', label: 'Negocio / marca', placeholder: 'Nombre del negocio o rubro' },
    { key: 'mood', label: 'Estilo / energia', placeholder: 'Ej: urbano, alegre, institucional, epico' },
    { key: 'duration', label: 'Duracion esperada', placeholder: 'Ej: 10s, 30s, 1 minuto' },
    { key: 'voice', label: 'Voz o instrumental', placeholder: 'Voz masculina/femenina, locucion, solo instrumental' },
  ],
  VIDEO: [
    { key: 'business', label: 'Negocio / marca', placeholder: 'Nombre del negocio o rubro' },
    { key: 'format', label: 'Formato / plataforma', placeholder: 'Ej: reel vertical, historia, pantalla local' },
    { key: 'message', label: 'Mensaje principal', placeholder: 'Que tiene que vender o mostrar?' },
    { key: 'style', label: 'Estilo del video', placeholder: 'Ej: dinamico, testimonial, promocional, elegante' },
  ],
}

function normalizeLinks(rawLinks: string[]) {
  return rawLinks.map((link) => link.trim()).filter(Boolean)
}

export default function OrderItemBrief({
  item,
  compact = false,
}: {
  item: CartItem
  compact?: boolean
}) {
  const updateBrief = useCartStore((state) => state.updateBrief)
  const briefType = item.briefType || 'NONE'
  const [linkDraft, setLinkDraft] = useState('')

  const fields = useMemo(() => {
    if (briefType === 'NONE') return []
    return briefFields[briefType]
  }, [briefType])

  if (briefType === 'NONE') return null

  const responses = item.briefResponses || {}
  const referenceLinks = item.briefReferenceLinks || []

  const updateResponse = (key: string, value: string) => {
    updateBrief(item.cartItemId!, {
      briefResponses: { ...responses, [key]: value },
      briefReferenceLinks: referenceLinks,
      briefReferenceFiles: item.briefReferenceFiles || [],
    })
  }

  const addLink = () => {
    const nextLinks = normalizeLinks([...referenceLinks, linkDraft])
    if (nextLinks.length === referenceLinks.length) return
    updateBrief(item.cartItemId!, {
      briefResponses: responses,
      briefReferenceLinks: nextLinks,
      briefReferenceFiles: item.briefReferenceFiles || [],
    })
    setLinkDraft('')
  }

  const removeLink = (index: number) => {
    updateBrief(item.cartItemId!, {
      briefResponses: responses,
      briefReferenceLinks: referenceLinks.filter((_, linkIndex) => linkIndex !== index),
      briefReferenceFiles: item.briefReferenceFiles || [],
    })
  }

  return (
    <div className={`mt-3 rounded-2xl border border-[#F66B9A]/20 bg-[#FEF1F6]/40 ${compact ? 'p-3' : 'p-4'}`}>
      <div className="mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C91F5B]">
          {briefLabels[briefType]}
        </p>
        <p className="mt-1 text-xs leading-5 text-gray-600">
          Responde lo esencial para que este item pueda avanzar sin idas y vueltas.
        </p>
      </div>

      <div className={`grid gap-3 ${compact ? '' : 'sm:grid-cols-2'}`}>
        {fields.map((field) => (
          <label key={field.key} className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-700">{field.label}</span>
            <input
              type="text"
              value={responses[field.key] || ''}
              onChange={(event) => updateResponse(field.key, event.target.value)}
              className="input !bg-white"
              placeholder={field.placeholder}
            />
          </label>
        ))}
      </div>

      <div className="mt-3 rounded-xl border border-white bg-white p-3">
        <label className="mb-2 block text-xs font-semibold text-gray-700">
          Links de referencia o inspiracion
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <LinkIcon
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="url"
              value={linkDraft}
              onChange={(event) => setLinkDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  addLink()
                }
              }}
              className="input !pl-9"
              placeholder="https://..."
            />
          </div>
          <button
            type="button"
            onClick={addLink}
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-950 text-white transition-colors hover:bg-gray-800"
            aria-label="Agregar link de referencia"
            title="Agregar link"
          >
            <Plus size={17} />
          </button>
        </div>

        {referenceLinks.length > 0 && (
          <div className="mt-3 space-y-2">
            {referenceLinks.map((link, index) => (
              <div
                key={`${link}-${index}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
              >
                <a
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 truncate text-xs font-semibold text-blue-700 hover:underline"
                >
                  {link}
                </a>
                <button
                  type="button"
                  onClick={() => removeLink(index)}
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  aria-label="Quitar link"
                  title="Quitar link"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
