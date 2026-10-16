import { DiscoverySituation } from '@/lib/discovery'

export default function IntentionHero({
  intention,
}: {
  intention: DiscoverySituation
  businessTypeName?: string
}) {
  const supportingCopy =
    intention.slug === 'estoy-por-abrir'
      ? 'Cada apertura tiene sus propios desafíos. ¿Por dónde necesitás empezar?'
      : intention.description || 'Cada negocio tiene su punto de partida. ¿Por dónde necesitás empezar?'

  return (
    <section className="border-b border-gray-200/80 pb-8 sm:pb-10">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-bold leading-tight tracking-[-0.035em] text-gray-950 sm:text-5xl sm:leading-[1.08]">
          {intention.name}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600 sm:mt-4 sm:text-base sm:leading-7">
          {supportingCopy}
        </p>
      </div>
    </section>
  )
}
