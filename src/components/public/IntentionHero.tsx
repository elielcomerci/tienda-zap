import { DiscoverySituation } from '@/lib/discovery'

export default function IntentionHero({
  intention,
  businessTypeName,
}: {
  intention: DiscoverySituation
  businessTypeName?: string
}) {

  return (
    <section className="overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#fff9fb_0%,#ffffff_62%,#f8fafc_100%)] px-6 py-7 sm:px-9 sm:py-9">
      <div className="max-w-3xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#C2103F]">
          {intention.icon ? `${intention.icon} ` : ''}{businessTypeName ? `${businessTypeName} · ` : ''}Tu situación
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-gray-950 sm:text-5xl">
          {intention.name}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
          {intention.description || 'Veamos qué necesitás resolver en esta etapa y qué puede tener sentido para tu negocio.'}
        </p>
      </div>
    </section>
  )
}
