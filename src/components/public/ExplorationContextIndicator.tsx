'use client'

import type { ExplorationContext } from '@/lib/exploration-context'

export default function ExplorationContextIndicator({ context, businessTypeName, situationName, needName }: { context: ExplorationContext; businessTypeName?: string | null; situationName?: string | null; needName?: string | null }) {
  const labels = [businessTypeName, situationName, needName].filter(Boolean)
  if (labels.length === 0) return null
  return <div className="mb-5 inline-flex max-w-full items-center rounded-full border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-600 shadow-sm"><span className="mr-1.5 text-gray-400">Tu contexto</span><span className="truncate">{labels.join(' · ')}</span></div>
}
