import Link from 'next/link'
import { ArrowRight, MessageCircleMore } from 'lucide-react'
import type { DiscoveryNeed, DiscoverySituation } from '@/lib/discovery'
import { buildWhatsappUrl } from '@/lib/whatsapp'

export default function NeedsSection({
  situation,
  businessTypeSlug,
  selectedNeedSlug,
}: {
  situation: DiscoverySituation
  businessTypeSlug?: string
  selectedNeedSlug?: string
}) {
  if (situation.needs.length === 0) return null

  const query = new URLSearchParams({ mode: 'situation', situacion: situation.slug })
  if (businessTypeSlug) query.set('rubro', businessTypeSlug)
  const salesWhatsappUrl = buildWhatsappUrl(undefined, `Hola, ${situation.name.toLowerCase()}. Necesito orientación para mi negocio.`) || '/'

  return (
    <section className="px-1 sm:px-2">
      <div className="mb-6 max-w-2xl">
        <h2 className="text-2xl font-black tracking-tight text-gray-950 sm:text-3xl">¿Qué necesitás resolver primero?</h2>
        <p className="mt-2 text-sm leading-6 text-gray-600 sm:text-base">Elegí una necesidad. A partir de ahí vemos qué puede tener sentido para ese caso.</p>
      </div>
      <div className="grid gap-3.5 md:grid-cols-2 sm:gap-4">
        {situation.needs.map((need: DiscoveryNeed) => {
          const href = new URLSearchParams(query)
          href.set('necesidad', need.slug)
          const active = selectedNeedSlug === need.slug
          const hasOffers = need._count.offerEntries > 0
          return (
            <Link
              key={need.id}
              href={hasOffers ? `/productos?${href.toString()}#recomendacion` : salesWhatsappUrl}
              target={hasOffers ? undefined : '_blank'}
              rel={hasOffers ? undefined : 'noreferrer'}
              className={`group flex min-h-[128px] flex-col rounded-[22px] border p-5 transition-all sm:p-6 ${active ? 'border-[#ED164F]/60 bg-white shadow-[0_16px_40px_-30px_rgba(237,22,79,0.35)]' : 'border-gray-200/80 bg-white/85 shadow-[0_14px_36px_-32px_rgba(15,23,42,0.22)] hover:-translate-y-0.5 hover:border-[#F7638B]/50 hover:bg-white'}`}
            >
              <div className="flex items-start gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-base font-black tracking-tight text-gray-950">{need.name}</p>
                  {need.description && <p className="mt-2 text-sm leading-6 text-gray-600">{need.description}</p>}
                </div>
                {hasOffers ? <ArrowRight size={18} className="mt-0.5 shrink-0 text-[#ED164F]" /> : <MessageCircleMore size={18} className="mt-0.5 shrink-0 text-[#ED164F]" />}
              </div>
              <p className="mt-auto pt-5 text-xs font-bold text-[#C2103F] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 max-sm:hidden" aria-hidden="true">
                {hasOffers ? 'Ver qué puede servirte' : 'Hablar con ZAP'}
              </p>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
