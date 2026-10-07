import { DiscoverySituation } from '@/lib/discovery'

export default function IntentionHero({ intention }: { intention: DiscoverySituation }) {
  if (!intention.description && !intention.icon) return null

  return (
    <section className="rounded-[28px] border border-[#F7638B]/20 bg-[#fff9fb] px-5 py-6 sm:px-7 sm:py-7">
      <div className="max-w-3xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#C2103F]">
          {intention.icon ? `${intention.icon} ` : ''}Lo que querés lograr
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">
          {intention.name}
        </h1>
        {intention.description && (
          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
            {intention.description}
          </p>
        )}
      </div>
    </section>
  )
}
