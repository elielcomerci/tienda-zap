type ProductForOperationalStatus = {
  active: boolean
  price: number
  stock: number
  isCombo?: boolean
  category: {
    isService: boolean
  }
  variants?: Array<{ price: number; costing?: unknown | null }>
  quoterConfig?: {
    pricingMode?: string
    itemWidth?: number | null
    itemHeight?: number | null
    allowCustomSize?: boolean
    rawMaterialId?: string | null
    allowedMaterials?: unknown[]
    quantityPresets?: unknown[]
    sizePresets?: unknown[]
  } | null
}

export type ProductOperationalSeverity = 'READY' | 'REVIEW' | 'ATTENTION' | 'BLOCKED' | 'INACTIVE'

export type ProductOperationalStatus = {
  severity: ProductOperationalSeverity
  label: string
  summary: string
  issues: string[]
  pricingMode: 'Servicio' | 'Combo' | 'Cotizador' | 'Variantes' | 'Precio fijo' | 'Sin precio'
}

function hasPositivePrice(value: unknown) {
  return Number(value || 0) > 0
}

export function getProductOperationalStatus(product: ProductForOperationalStatus): ProductOperationalStatus {
  const variants = product.variants || []
  const zeroVariantCount = variants.filter((variant) => !hasPositivePrice(variant.price)).length
  const pricedVariantCount = variants.length - zeroVariantCount
  const costedVariantCount = variants.filter((variant) => Boolean(variant.costing)).length

  if (!product.active) {
    return {
      severity: 'INACTIVE',
      label: 'Inactivo',
      summary: 'No visible en tienda.',
      issues: ['Producto archivado o pausado.'],
      pricingMode: product.category.isService ? 'Servicio' : product.isCombo ? 'Combo' : 'Sin precio',
    }
  }

  if (product.category.isService) {
    const ready = hasPositivePrice(product.price) || pricedVariantCount > 0
    return ready
      ? {
          severity: 'READY',
          label: 'Operativo',
          summary: 'Servicio vendible.',
          issues: [],
          pricingMode: 'Servicio',
        }
      : {
          severity: 'BLOCKED',
          label: 'Bloqueado',
          summary: 'Servicio activo sin precio vendible.',
          issues: ['Cargar precio fijo o variantes con precio.'],
          pricingMode: 'Servicio',
        }
  }

  if (product.isCombo) {
    return hasPositivePrice(product.price)
      ? {
          severity: 'READY',
          label: 'Operativo',
          summary: 'Combo vendible.',
          issues: [],
          pricingMode: 'Combo',
        }
      : {
          severity: 'BLOCKED',
          label: 'Bloqueado',
          summary: 'Combo activo sin precio.',
          issues: ['Cargar precio de combo o revisar modo de pricing.'],
          pricingMode: 'Combo',
        }
  }

  if (product.quoterConfig) {
    const materialCount =
      (product.quoterConfig.allowedMaterials || []).length + Number(Boolean(product.quoterConfig.rawMaterialId))
    const quantityCount = (product.quoterConfig.quantityPresets || []).length
    const sizeCount = (product.quoterConfig.sizePresets || []).length
    const hasFixedSize = Boolean(product.quoterConfig.itemWidth && product.quoterConfig.itemHeight)
    const hasAnySize = sizeCount > 0 || hasFixedSize || Boolean(product.quoterConfig.allowCustomSize)
    const issues = [
      ...(materialCount === 0 ? ['Sin materiales asociados al cotizador.'] : []),
      ...(quantityCount === 0 ? ['Sin cantidades disponibles.'] : []),
      ...(!hasAnySize ? ['Sin medida fija, presets ni medida personalizada.'] : []),
    ]

    return issues.length === 0
      ? {
          severity: 'READY',
          label: 'Operativo',
          summary: 'Cotizador dinamico listo.',
          issues,
          pricingMode: 'Cotizador',
        }
      : {
          severity: 'BLOCKED',
          label: 'Bloqueado',
          summary: 'Cotizador incompleto.',
          issues,
          pricingMode: 'Cotizador',
        }
  }

  if (variants.length > 0) {
    if (pricedVariantCount === 0) {
      return {
        severity: 'BLOCKED',
        label: 'Bloqueado',
        summary: 'Todas las variantes estan sin precio.',
        issues: ['Cargar precios o desactivar el producto.'],
        pricingMode: 'Variantes',
      }
    }

    if (zeroVariantCount > 0) {
      return {
        severity: 'ATTENTION',
        label: 'Atencion',
        summary: `${zeroVariantCount} variantes no vendibles.`,
        issues: [`${zeroVariantCount} de ${variants.length} variantes tienen precio cero.`],
        pricingMode: 'Variantes',
      }
    }

    if (costedVariantCount === variants.length) {
      return {
        severity: 'READY',
        label: 'Operativo',
        summary: `${variants.length} variantes costeadas.`,
        issues: [],
        pricingMode: 'Variantes',
      }
    }

    return {
      severity: 'REVIEW',
      label: 'Revisar costos',
      summary:
        costedVariantCount > 0
          ? `${variants.length - costedVariantCount} variantes sin BOM/costeo.`
          : 'Variantes vendibles sin BOM/cotizador.',
      issues: [
        costedVariantCount > 0
          ? `${variants.length - costedVariantCount} de ${variants.length} variantes no tienen costeo auditable.`
          : 'No hay estructura de costos auditable.',
      ],
      pricingMode: 'Variantes',
    }
  }

  if (hasPositivePrice(product.price)) {
    return {
      severity: 'REVIEW',
      label: 'Revisar costos',
      summary: 'Precio fijo vendible sin costing.',
      issues: ['No hay estructura de costos auditable.'],
      pricingMode: 'Precio fijo',
    }
  }

  return {
    severity: 'BLOCKED',
    label: 'Bloqueado',
    summary: 'Activo sin precio ni cotizador.',
    issues: ['Cargar precio, variantes o cotizador.'],
    pricingMode: 'Sin precio',
  }
}
