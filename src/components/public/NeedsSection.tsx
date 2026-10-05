import Link from 'next/link'
import { ArrowRight, MessageCircleMore } from 'lucide-react'
import type { DiscoveryNeed, DiscoverySituation } from '@/lib/discovery'

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
  const salesWhatsappUrl = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
    ? `https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hola, ${situation.name.toLowerCase()}. Necesito orientación para mi negocio.`)}`
    : '/contacto'

  return (
    <section className="rounded-[28px] border border-[#F7638B]/20 bg-[#fff9fb] p-5 shadow-[0_18px_50px_-42px_rgba(237,22,79,0.16)] sm:p-6">
      <div className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C2103F]">Paso 2 · Necesidad</p>
        <h2 className="mt-2 text-xl font-black tracking-tight text-gray-950">¿Qué necesitás resolver primero?</h2>
        <p className="mt-1 text-sm leading-6 text-gray-600">Elegí una necesidad. Te mostramos sólo las ofertas que tienen sentido para ese caso.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {situation.needs.map((need: DiscoveryNeed) => {
          const href = new URLSearchParams(query)
          href.set('necesidad', need.slug)
          const active = selectedNeedSlug === need.slug
          const hasOffers = need._count.offerEntries > 0
          return (
            <Link
              key={need.id}
              href={hasOffers ? `/productos?${href.toString()}` : salesWhatsappUrl}
              target={hasOffers ? undefined : '_blank'}
              rel={hasOffers ? undefined : 'noreferrer'}
              className={`group rounded-2xl border p-4 transition-all ${active ? 'border-[#ED164F] bg-white shadow-sm' : 'border-gray-200 bg-white/80 hover:-translate-y-0.5 hover:border-[#F7638B]/40'}`}
            >
              <div className="flex gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-900">{need.name}</p>
                  {need.description && <p className="mt-1 text-xs leading-5 text-gray-600">{need.description}</p>}
                </div>
                {hasOffers ? <ArrowRight size={16} className="mt-0.5 shrink-0 text-[#ED164F]" /> : <MessageCircleMore size={16} className="mt-0.5 shrink-0 text-[#ED164F]" />}
              </div>
              <p className="mt-3 text-xs font-semibold text-[#C2103F]">
                {hasOffers ? `${need._count.offerEntries} ${need._count.offerEntries === 1 ? 'oferta relacionada' : 'ofertas relacionadas'}` : 'Hablar con ZAP'}
              </p>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
