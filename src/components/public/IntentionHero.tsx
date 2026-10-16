import { DiscoverySituation } from '@/lib/discovery'

export default function IntentionHero({
  intention,
  businessTypeName,
}: {
  intention: DiscoverySituation
  businessTypeName?: string
}) {
  return (
    <section className="border-b border-gray-200/80 pb-8 sm:pb-10">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-bold leading-tight tracking-[-0.035em] text-gray-950 sm:text-5xl sm:leading-[1.08]">
          {intention.name}
        </h1>
        {businessTypeName && (
          <p className="mt-3 text-base font-medium leading-6 text-gray-700 sm:text-lg">
            Para tu negocio de {businessTypeName.toLowerCase()}.
          </p>
        )}
        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600 sm:mt-4 sm:text-base sm:leading-7">
          {intention.description || 'Veamos qué necesitás resolver en esta etapa y qué puede tener sentido para tu negocio.'}
        </p>
      </div>
    </section>
  )
}
