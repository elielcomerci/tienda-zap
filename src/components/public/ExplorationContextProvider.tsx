'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { ExplorationContext } from '@/lib/exploration-context'
import { normalizeExplorationContext } from '@/lib/exploration-context'

const STORAGE_KEY = 'zap_exploration_context_v1'
type ContextSituation = { id: string; slug: string; name: string; icon: string | null; description: string | null; needs?: { id: string; slug: string; name: string; description: string | null; _count: { offerEntries: number } }[] }
type ContextValue = { context: ExplorationContext; ready: boolean; situationsByBusinessType: Record<string, ContextSituation[]>; setContext: (next: Partial<ExplorationContext>) => void; clearContext: () => void }
const ExplorationContextState = createContext<ContextValue | null>(null)

function validateContext(
  input: Partial<ExplorationContext>,
  businessTypeSlugs: string[],
  allSituations: ContextSituation[],
  situationsByBusinessType: Record<string, ContextSituation[]>
): ExplorationContext {
  let next = normalizeExplorationContext(input)

  if (next.businessTypeSlug && businessTypeSlugs.length > 0 && !businessTypeSlugs.includes(next.businessTypeSlug)) {
    next = { ...next, businessTypeSlug: undefined, situationSlug: undefined, needSlug: undefined }
  }

  const availableSituations = next.businessTypeSlug
    ? situationsByBusinessType[next.businessTypeSlug] || []
    : allSituations
  const selectedSituation = availableSituations.find((item) => item.slug === next.situationSlug)

  if (next.situationSlug && !selectedSituation) {
    next = { ...next, situationSlug: undefined, needSlug: undefined }
  } else if (next.needSlug && !selectedSituation?.needs?.some((item) => item.slug === next.needSlug)) {
    next = { ...next, needSlug: undefined }
  }

  return normalizeExplorationContext(next)
}

function readContext(params: URLSearchParams): ExplorationContext {
  const mode = params.get('mode')
  return normalizeExplorationContext({
    mode: mode === 'objective' ? 'situation' : mode === 'product' || mode === 'situation' || mode === 'rubro' ? mode : undefined,
    businessTypeSlug: params.get('rubro') || undefined,
    situationSlug: params.get('situacion') || params.get('intent') || undefined,
    needSlug: params.get('necesidad') || undefined,
  })
}
function hasExplicitContext(params: URLSearchParams) { return ['rubro', 'situacion', 'necesidad', 'intent'].some((key) => params.has(key)) }

export function ExplorationContextProvider({
  children,
  businessTypeSlugs = [],
  allSituations = [],
  situationsByBusinessType = {},
}: {
  children: React.ReactNode
  businessTypeSlugs?: string[]
  allSituations?: ContextSituation[]
  situationsByBusinessType?: Record<string, ContextSituation[]>
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const query = searchParams.toString()
  const [context, setContextState] = useState<ExplorationContext>({})
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(query)

    // An explicit contextual URL wins on entry. Persist its validated context,
    // but don't rewrite the URL while the visitor is choosing options.
    if (hasExplicitContext(params)) {
      const fromUrl = validateContext(readContext(params), businessTypeSlugs, allSituations, situationsByBusinessType)
      setContextState(fromUrl)
      try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fromUrl)) } catch {}
    } else {
      let saved: ExplorationContext = {}
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (raw) saved = normalizeExplorationContext(JSON.parse(raw))
      } catch {}

      const routeMode = readContext(params).mode
      const restored = validateContext({ ...saved, mode: routeMode || saved.mode }, businessTypeSlugs, allSituations, situationsByBusinessType)
      setContextState(restored)
      try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(restored)) } catch {}
    }

    setReady(true)
  }, [pathname, query, businessTypeSlugs, allSituations, situationsByBusinessType])

  const setContext = useCallback((next: Partial<ExplorationContext>) => {
    const normalized = validateContext(next, businessTypeSlugs, allSituations, situationsByBusinessType)
    setContextState(normalized)
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized)) } catch {}
  }, [businessTypeSlugs, allSituations, situationsByBusinessType])

  const clearContext = useCallback(() => {
    setContextState({})
    try { window.localStorage.removeItem(STORAGE_KEY) } catch {}
    const params = new URLSearchParams(query)
    for (const key of ['rubro', 'situacion', 'necesidad', 'mode']) params.delete(key)
    const suffix = params.toString()
    router.replace(suffix ? pathname + '?' + suffix : pathname, { scroll: false })
  }, [pathname, query, router])

  const value = useMemo(() => ({ context, ready, situationsByBusinessType, setContext, clearContext }), [context, ready, situationsByBusinessType, setContext, clearContext])
  return <ExplorationContextState.Provider value={value}>{children}</ExplorationContextState.Provider>
}

export function useExplorationContext() {
  const value = useContext(ExplorationContextState)
  if (!value) throw new Error('useExplorationContext debe usarse dentro de ExplorationContextProvider')
  return value
}
