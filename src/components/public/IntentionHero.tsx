'use client'

import { DiscoverySituation } from '@/lib/discovery'

export default function IntentionHero({ intention }: { intention: DiscoverySituation }) {
  if (!intention.description && !intention.icon) return null

  return (
    <div className="rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm mb-6 overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-pink-50/50 to-transparent rounded-bl-full -z-0" />

      <div className="relative z-10 grid gap-6 md:grid-cols-[1fr_auto] items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEF1F5] px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#C2103F] mb-3">
            {intention.icon} Contexto de descubrimiento
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight leading-tight">
            {intention.name}
          </h2>
          <p className="mt-3 text-sm sm:text-base text-gray-600 leading-relaxed max-w-xl">
            {intention.description}
          </p>
        </div>
      </div>
    </div>
  )
}
