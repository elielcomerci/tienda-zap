'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { ExplorationContext } from '@/lib/exploration-context'
import { normalizeExplorationContext } from '@/lib/exploration-context'

const STORAGE_KEY = 'zap_exploration_context_v1'
type ContextValue = { context: ExplorationContext; ready: boolean; setContext: (next: Partial<ExplorationContext>) => void; clearContext: () => void }
const ExplorationContextState = createContext<ContextValue | null>(null)

function readContext(params: URLSearchParams): ExplorationContext {
  const mode = params.get('mode')
  return normalizeExplorationContext({
    mode: mode === 'objective' ? 'situation' : mode === 'product' || mode === 'situation' || mode === 'rubro' ? mode : undefined,
    businessTypeSlug: params.get('rubro') || undefined,
    situationSlug: params.get('situacion') || undefined,
    needSlug: params.get('necesidad') || undefined,
  })
}
function hasExplicitContext(params: URLSearchParams) { return ['rubro', 'situacion', 'necesidad'].some((key) => params.has(key)) }

export function ExplorationContextProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const query = searchParams.toString()
  const [context, setContextState] = useState<ExplorationContext>({})
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(query)
    if (hasExplicitContext(params)) {
      const fromUrl = readContext(params)
      setContextState(fromUrl)
      try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fromUrl)) } catch {}
    } else {
      let saved: ExplorationContext = {}
      try { const raw = window.localStorage.getItem(STORAGE_KEY); if (raw) saved = normalizeExplorationContext(JSON.parse(raw)) } catch {}
      const routeMode = readContext(params).mode
      const restored = normalizeExplorationContext({ ...saved, mode: routeMode || saved.mode })
      setContextState(restored)
      if (restored.businessTypeSlug || restored.situationSlug || restored.needSlug) {
        const nextParams = new URLSearchParams(query)
        if (restored.businessTypeSlug) nextParams.set('rubro', restored.businessTypeSlug)
        if (restored.situationSlug) nextParams.set('situacion', restored.situationSlug)
        if (restored.needSlug) nextParams.set('necesidad', restored.needSlug)
        if (restored.mode) nextParams.set('mode', restored.mode)
        const suffix = nextParams.toString()
        if (suffix !== query) router.replace(suffix ? pathname + '?' + suffix : pathname, { scroll: false })
      }
    }
    setReady(true)
  }, [pathname, query, router])

  const setContext = useCallback((next: Partial<ExplorationContext>) => {
    const normalized = normalizeExplorationContext(next)
    setContextState(normalized)
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized)) } catch {}
    const params = new URLSearchParams(query)
    for (const key of ['rubro', 'situacion', 'necesidad', 'mode']) params.delete(key)
    if (normalized.businessTypeSlug) params.set('rubro', normalized.businessTypeSlug)
    if (normalized.situationSlug) params.set('situacion', normalized.situationSlug)
    if (normalized.needSlug) params.set('necesidad', normalized.needSlug)
    if (normalized.mode) params.set('mode', normalized.mode)
    const suffix = params.toString()
    router.replace(suffix ? pathname + '?' + suffix : pathname, { scroll: false })
  }, [pathname, query, router])

  const clearContext = useCallback(() => {
    setContextState({})
    try { window.localStorage.removeItem(STORAGE_KEY) } catch {}
    const params = new URLSearchParams(query)
    for (const key of ['rubro', 'situacion', 'necesidad']) params.delete(key)
    const suffix = params.toString()
    router.replace(suffix ? pathname + '?' + suffix : pathname, { scroll: false })
  }, [pathname, query, router])

  const value = useMemo(() => ({ context, ready, setContext, clearContext }), [context, ready, setContext, clearContext])
  return <ExplorationContextState.Provider value={value}>{children}</ExplorationContextState.Provider>
}

export function useExplorationContext() {
  const value = useContext(ExplorationContextState)
  if (!value) throw new Error('useExplorationContext debe usarse dentro de ExplorationContextProvider')
  return value
}
