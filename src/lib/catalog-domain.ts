import type { CatalogType, ConfiguratorEngine, ProductModality } from '@prisma/client'

export type ProductDomainIdentity = {
  catalogType: CatalogType
  modality: ProductModality
  engine: ConfiguratorEngine | null
}

const engineLabels: Record<ConfiguratorEngine, string> = {
  IMPRESOS_PACKAGING: 'Impresos & Packaging',
  PRESENCIA_FISICA: 'Presencia física',
  TEXTIL: 'Indumentaria & Textil',
  DIGITAL: 'Soluciones digitales',
  CAMPANAS: 'Campañas',
}

export const catalogFamilies = [
  { slug: 'impresos-packaging', label: engineLabels.IMPRESOS_PACKAGING, engine: 'IMPRESOS_PACKAGING' },
  { slug: 'presencia-fisica', label: engineLabels.PRESENCIA_FISICA, engine: 'PRESENCIA_FISICA' },
  { slug: 'textil', label: engineLabels.TEXTIL, engine: 'TEXTIL' },
  { slug: 'digital', label: engineLabels.DIGITAL, engine: 'DIGITAL' },
  { slug: 'campanas', label: engineLabels.CAMPANAS, engine: 'CAMPANAS' },
] as const

export function engineForCatalogFamily(slug?: string) {
  return catalogFamilies.find((family) => family.slug === slug)?.engine
}

export function getProductFamilyLabel(product: ProductDomainIdentity) {
  if (product.engine) return engineLabels[product.engine]
  if (isDevelopment(product)) return 'Desarrollo ZAP'
  if (isConsultationOnly(product)) return 'Cosa a medida'
  return 'Producto directo'
}

export function getProductModalityLabel(modality: ProductModality) {
  switch (modality) {
    case 'CONFIGURABLE':
      return 'Configurable'
    case 'CONSULTAR':
      return 'Consultar con ZAP'
    case 'DIRECTO':
      return 'Compra directa'
  }
}

/** El tipo de catálogo define qué es la oferta; la modalidad define cómo se avanza con ella. */
export function isDevelopment(product: ProductDomainIdentity) {
  return product.catalogType === 'DESARROLLO'
}

/** La modalidad CONSULTAR requiere conversación, independientemente de qué sea la oferta. */
export function isConsultationOnly(product: ProductDomainIdentity) {
  return product.modality === 'CONSULTAR'
}

/** El flujo no debe tratar un Desarrollo configurable como una compra online. */
export function requiresConversation(product: ProductDomainIdentity) {
  return isDevelopment(product) || isConsultationOnly(product)
}

/** @deprecated Usar isDevelopment. Se conserva temporalmente para evitar mezclar dominio y compatibilidad. */
export function isServiceProduct(product: ProductDomainIdentity) {
  return isDevelopment(product)
}

export function requiresArtwork(product: ProductDomainIdentity) {
  return product.catalogType === 'COSA'
}

