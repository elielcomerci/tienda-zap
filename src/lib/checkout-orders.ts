import { prisma } from '@/lib/prisma'
import { calculateProductQuote, getQuoterMaterials } from '@/lib/pricing/product-quoter'

function sortSelectedOptions(options: Array<{ name: string; value: string }> = []) {
  return [...options].sort((a, b) => a.name.localeCompare(b.name))
}

function optionsToMap(options: Array<{ name: string; value: string }> = []) {
  return new Map(options.map((option) => [option.name, option.value]))
}

function getVariantCombinationMap(variant: any) {
  return new Map(
    variant.options.map((variantOption: any) => [
      variantOption.optionValue.option.name,
      variantOption.optionValue.value,
    ])
  )
}

function matchesVariant(selectedOptions: Array<{ name: string; value: string }>, variant: any) {
  const selectedMap = optionsToMap(selectedOptions)
  const variantMap = getVariantCombinationMap(variant) as Map<string, string>

  if (variantMap.size === 0) {
    return false
  }

  return Array.from(variantMap.entries()).every(
    ([optionName, valueName]) => selectedMap.get(optionName) === valueName
  )
}

function parseSizeLabel(value?: string) {
  const match = value?.match(/(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)/i)
  if (!match) return {}

  return {
    width: Number(match[1].replace(',', '.')),
    height: Number(match[2].replace(',', '.')),
  }
}

export async function resolveCheckoutOrderItems(
  items: Array<{
    productId: string
    quantity: number
    unitPrice?: number
    notes?: string
    briefType?: 'NONE' | 'DESIGN' | 'MUSIC' | 'VIDEO'
    briefResponses?: Record<string, string>
    briefReferenceLinks?: string[]
    briefReferenceFiles?: Array<{
      url: string
      objectKey?: string
      fileName: string
      contentType?: string
      sizeBytes?: number
    }>
    fileUrl?: string
    designRequested?: boolean
    selectedOptions?: Array<{ name: string; value: string }>
  }>
) {
  const productIds = [...new Set(items.map((item) => item.productId))]
  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
      active: true,
    },
    include: {
      category: {
        select: {
          id: true,
          isService: true,
        },
      },
      options: {
        include: {
          values: true,
        },
      },
      variants: {
        include: {
          options: {
            include: {
              optionValue: {
                include: {
                  option: true,
                },
              },
            },
          },
        },
      },
      quoterConfig: {
        include: {
          rawMaterial: {
            include: { tiers: { orderBy: { minQty: 'asc' } } },
          },
          allowedMaterials: {
            include: {
              rawMaterial: {
                include: { tiers: { orderBy: { minQty: 'asc' } } },
              },
            },
          },
          finishings: {
            include: {
              finishing: {
                include: { tiers: { orderBy: { minQty: 'asc' } } },
              },
            },
          },
          quantityPresets: { orderBy: { sortOrder: 'asc' } },
          sizePresets: { orderBy: { sortOrder: 'asc' } },
        },
      },
    },
  })

  const productsById = new Map(products.map((product) => [product.id, product]))

  const resolvedItems = items.map((item) => {
    const product = productsById.get(item.productId)
    if (!product) {
      throw new Error('Uno de los productos ya no esta disponible.')
    }

    const selectedOptions = sortSelectedOptions(item.selectedOptions || [])
    const selectedMap = optionsToMap(selectedOptions)

    for (const option of product.options) {
      const selectedValue = selectedMap.get(option.name)
      if (option.isRequired && !selectedValue) {
        throw new Error(`Falta seleccionar ${option.name} para ${product.name}.`)
      }

      if (selectedValue) {
        const optionValueExists = option.values.some((value) => value.value === selectedValue)
        if (!optionValueExists) {
          throw new Error(`La opcion ${selectedValue} no es valida para ${product.name}.`)
        }
      }
    }

    let unitPrice = product.price
    if (product.isCombo && product.comboPricingMode === 'DYNAMIC' && item.unitPrice && item.unitPrice > 0) {
      unitPrice = item.unitPrice
    }

    if (product.quoterConfig) {
      const materialName = selectedMap.get('Material')
      const sizeLabel = selectedMap.get('Medida')
      const parsedSize = parseSizeLabel(sizeLabel)
      const quantity = Number(selectedMap.get('Cantidad') || 0)
      const finishingNames = (selectedMap.get('Terminaciones') || '')
        .split('+')
        .map((value) => value.trim())
        .filter((value) => value && value !== 'Sin terminaciones')
      const rawMaterial = getQuoterMaterials(product.quoterConfig).find(
        (material) => material.name === materialName
      )
      const finishingIds = product.quoterConfig.finishings
        .filter((entry) => finishingNames.includes(entry.finishing.name))
        .map((entry) => entry.finishing.id)

      if (!rawMaterial || !quantity) {
        throw new Error(`No encontramos una cotizacion valida para ${product.name}.`)
      }

      const quote = calculateProductQuote(product.quoterConfig, {
        rawMaterialId: rawMaterial.id,
        quantity,
        sizeLabel: sizeLabel || undefined,
        width: parsedSize.width,
        height: parsedSize.height,
        finishingIds,
      })

      unitPrice = quote.totalPrice
    } else if (product.variants.length > 0) {
      const matchingVariant = product.variants.find((variant) =>
        matchesVariant(selectedOptions, variant)
      )

      if (!matchingVariant) {
        throw new Error(`No encontramos una variante valida para ${product.name}.`)
      }

      unitPrice = matchingVariant.price
    }

    if (unitPrice <= 0) {
      throw new Error(`${product.name} no esta disponible para compra online con la configuracion seleccionada.`)
    }

    return {
      productId: product.id,
      categoryId: product.category.id,
      quantity: item.quantity,
      unitPrice,
      creditDownPaymentPercent: product.creditDownPaymentPercent,
      notes: item.notes,
      briefType: item.briefType && item.briefType !== 'NONE' ? item.briefType : product.briefType || 'NONE',
      briefResponses: item.briefResponses || undefined,
      briefReferenceLinks: item.briefReferenceLinks || [],
      briefReferenceFiles: item.briefReferenceFiles || undefined,
      isService: product.category.isService,
      fileUrl: product.category.isService ? undefined : item.fileUrl,
      designRequested: product.category.isService || item.fileUrl ? false : Boolean(item.designRequested),
      artworkSubmissionChannel: product.category.isService
        ? ('PENDING' as const)
        : item.fileUrl
          ? ('R2' as const)
          : ('PENDING' as const),
      selectedOptions: selectedOptions.length > 0
        ? {
            create: selectedOptions.map((option) => ({
              optionName: option.name,
              valueName: option.value,
            })),
          }
        : undefined,
    }
  })

  const total = resolvedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)

  return { resolvedItems, total }
}
