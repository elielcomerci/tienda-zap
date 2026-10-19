import Link from 'next/link'
import { useExplorationContext } from '@/components/public/ExplorationContextProvider'
import { ArrowRight } from 'lucide-react'
import type { DiscoveryNeed, DiscoverySituation } from '@/lib/discovery'
import { buildWhatsappUrl } from '@/lib/whatsapp'

export default function NeedsSection({
  situation,
  businessTypeSlug,
  businessTypeName,
  selectedNeedSlug,
}: {
  situation: DiscoverySituation
  businessTypeSlug?: string
  businessTypeName?: string
  selectedNeedSlug?: string
}) {
  const { context, setContext } = useExplorationContext()

  function chooseNeed(needSlug: string) {
    const params = new URLSearchParams(window.location.search)
    params.set('mode', context.mode || 'situation')
    if (businessTypeSlug) params.set('rubro', businessTypeSlug)
    params.set('situacion', situation.slug)
    params.set('necesidad', needSlug)
    setContext({
      mode: context.mode || 'situation',
      businessTypeSlug: businessTypeSlug || context.businessTypeSlug,
      situationSlug: situation.slug,
      needSlug,
    })
    window.history.replaceState(null, '', `/productos?${params.toString()}`)
  }

  if (situation.needs.length === 0) return null

  const query = new URLSearchParams({ mode: 'situation', situacion: situation.slug })
  if (businessTypeSlug) query.set('rubro', businessTypeSlug)
  const whatsappMessage = [
    `Hola, estoy explorando: ${situation.name}.`,
    businessTypeName ? `Mi rubro es ${businessTypeName}.` : null,
    'No encuentro una necesidad que describa bien mi caso. ¿Lo podemos conversar?',
  ].filter(Boolean).join('\n')
  const whatsappUrl = buildWhatsappUrl(undefined, whatsappMessage)

  if (selectedNeedSlug) {
    const selectedNeed = situation.needs.find((need) => need.slug === selectedNeedSlug)
    return (
      <section id="necesidades" className="px-0.5 sm:px-1">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
          <p className="text-sm font-semibold text-gray-900">{selectedNeed?.name}</p>
        </div>
        <details id="otras-necesidades" className="group mt-3">
          <summary className="cursor-pointer list-none text-sm font-semibold text-gray-600 hover:text-gray-950">
            Cambiar necesidad
          </summary>
          <div className="mt-3 grid gap-2.5 md:grid-cols-2 sm:gap-3">
            {situation.needs.filter((need) => need.slug !== selectedNeedSlug).map((need) => {
              const params = new URLSearchParams(query)
              params.set('necesidad', need.slug)
              return (
                <button key={need.id} type="button" onClick={() => chooseNeed(need.slug)} className="group flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3 text-left transition-colors hover:border-[#ED164F]/40">
                  <span className="text-sm font-medium text-gray-800">{need.name}</span>
                  <ArrowRight size={15} className="shrink-0 text-[#ED164F]" />
                </button>
              )
            })}
          </div>
        </details>
      </section>
    )
  }

  return (
    <section id="necesidades" className="px-0.5 sm:px-1">
      <div className="grid gap-2.5 md:grid-cols-2 sm:gap-3">
        {situation.needs.map((need: DiscoveryNeed) => {
          const params = new URLSearchParams(query)
          params.set('necesidad', need.slug)
          return (
            <button
              key={need.id}
              type="button"
              onClick={() => chooseNeed(need.slug)}
              className="group flex min-h-[76px] items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3.5 text-left transition-colors hover:border-[#ED164F]/40 sm:px-5"
            >
              <span className="text-sm font-semibold tracking-tight text-gray-950">{need.name}</span>
              <ArrowRight size={16} className="shrink-0 text-[#ED164F]" />
            </button>
          )
        })}
      </div>
      <div className="mt-3 border-t border-gray-100 pt-3">
        <Link href={whatsappUrl || '/'} className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-[#C2103F]">
          ¿No encontrás tu caso? Hablemos <ArrowRight size={15} />
        </Link>
      </div>
    </section>
  )
}
