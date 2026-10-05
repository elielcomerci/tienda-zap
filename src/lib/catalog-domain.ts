import type { ConfiguratorEngine, ProductModality } from '@prisma/client'

export type ProductDomainIdentity = {
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
  return product.modality === 'CONSULTAR' ? 'Proyecto a medida' : 'Producto directo'
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

/** La categoría ya no define el tratamiento operativo del producto. */
export function isServiceProduct(product: ProductDomainIdentity) {
  return product.modality === 'CONSULTAR' || product.engine === 'DIGITAL' || product.engine === 'CAMPANAS'
}

export function requiresArtwork(product: ProductDomainIdentity) {
  return !isServiceProduct(product)
}
