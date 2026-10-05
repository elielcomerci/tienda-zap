import { getPublicSituations, type DiscoverySituation } from '@/lib/discovery'

/** @deprecated Las intenciones fueron reemplazadas por Situation. */
export type Intention = DiscoverySituation

/** @deprecated Conserva imports de rutas antiguas sin consultar el modelo retirado. */
export const getIntentions = getPublicSituations
export const getPublicIntentions = getPublicSituations
