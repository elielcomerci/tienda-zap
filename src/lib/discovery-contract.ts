export type DiscoveryResultType = 'COSA' | 'SOLUCION' | 'DESARROLLO' | 'ZAP'

export type DiscoveryResult = {
  type: DiscoveryResultType
  productId?: string
  href?: string
}

export const DISCOVERY_RESULT_LABELS: Record<DiscoveryResultType, string> = {
  COSA: 'Cosa',
  SOLUCION: 'Solución',
  DESARROLLO: 'Desarrollo',
  ZAP: 'ZAP',
}

export const DISCOVERY_RESULT_NEXT_STEPS: Record<DiscoveryResultType, string> = {
  COSA: 'Ver y configurar',
  SOLUCION: 'Conocer la solución',
  DESARROLLO: 'Hablar con ZAP',
  ZAP: 'Contarnos qué está pasando',
}
