import { prisma } from '@/lib/prisma'

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

  if (selectedMap.size !== variantMap.size) {
    return false
  }

  return Array.from(variantMap.entries()).every(
    ([optionName, valueName]) => selectedMap.get(optionName) === valueName
  )
}

export async function resolveCheckoutOrderItems(
  items: Array<{
    productId: string
    quantity: number
    notes?: string
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
    if (product.variants.length > 0) {
      const matchingVariant = product.variants.find((variant) =>
        matchesVariant(selectedOptions, variant)
      )

      if (!matchingVariant) {
        throw new Error(`No encontramos una variante valida para ${product.name}.`)
      }

      unitPrice = matchingVariant.price
    }

    return {
      productId: product.id,
      quantity: item.quantity,
      unitPrice,
      notes: item.notes,
      designRequested: Boolean(item.designRequested),
      artworkSubmissionChannel: 'PENDING' as const,
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
