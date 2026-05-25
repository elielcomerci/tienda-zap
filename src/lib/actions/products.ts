'use server'

import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { slugify } from '@/lib/slug'
import { getFirstValidationError, productSchema } from '@/lib/validations'

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user?.role !== 'ADMIN') {
    throw new Error('No autorizado')
  }
}

function parseJsonField<T>(formData: FormData, key: string, fallback: T) {
  const value = formData.get(key)
  if (!value) return fallback

  try {
    return JSON.parse(value as string) as T
  } catch {
    throw new Error(`No pudimos interpretar el campo ${key}. Recarga la página e intenta de nuevo.`)
  }
}

async function ensureUniqueProductSlug(baseSlug: string, excludeProductId?: string) {
  let candidate = baseSlug
  let suffix = 2

  while (true) {
    const existing = await prisma.product.findFirst({
      where: {
        slug: candidate,
        ...(excludeProductId ? { NOT: { id: excludeProductId } } : {}),
      },
      select: { id: true },
    })

    if (!existing) {
      return candidate
    }

    candidate = `${baseSlug}-${suffix}`
    suffix += 1
  }
}

async function assertRelatedProductsExist(relatedProductIds: string[], excludeProductId?: string) {
  if (relatedProductIds.length === 0) {
    return
  }

  const relatedProducts = await prisma.product.findMany({
    where: {
      id: { in: relatedProductIds },
      ...(excludeProductId ? { NOT: { id: excludeProductId } } : {}),
    },
    select: { id: true },
  })

  if (relatedProducts.length !== relatedProductIds.length) {
    throw new Error('Uno o mas productos relacionados ya no existen. Recarga la página e intenta de nuevo.')
  }
}

async function parseProductFormData(formData: FormData, excludeProductId?: string) {
  const name = (formData.get('name') as string) || ''
  const requestedSlug = (formData.get('slug') as string) || name
  const normalizedSlug = slugify(requestedSlug)

  if (!normalizedSlug) {
    throw new Error('El nombre del producto debe incluir letras o números para generar un slug válido.')
  }

  const mediaList = parseJsonField<any[]>(formData, 'mediaList', [])
  let mediaType = (formData.get('mediaType') as string) || 'NONE'
  let mediaUrl = (formData.get('mediaUrl') as string) || ''
  let mediaTitle = (formData.get('mediaTitle') as string) || ''

  const firstPlayableMedia = mediaList.find((item) => ['AUDIO', 'VIDEO', 'YOUTUBE'].includes(item?.type))

  if (firstPlayableMedia) {
    mediaType = firstPlayableMedia.type
    mediaUrl = firstPlayableMedia.url
    mediaTitle = firstPlayableMedia.title
  }

  const raw = {
    name,
    slug: normalizedSlug,
    description: (formData.get('description') as string) || '',
    price: formData.get('price'),
    creditDownPaymentPercent: formData.get('creditDownPaymentPercent'),
    categoryId: formData.get('categoryId') as string,
    stock: formData.get('stock'),
    images: parseJsonField<string[]>(formData, 'images', []),
    briefType: (formData.get('briefType') as string) || 'NONE',
    mediaType,
    mediaUrl,
    mediaTitle,
    mediaList,
    active: formData.get('active') === 'true',
    options: parseJsonField(formData, 'options', []),
    variants: parseJsonField(formData, 'variants', []),
    relatedProductIds: parseJsonField<string[]>(formData, 'relatedProductIds', []),
    intentionIds: formData.getAll('intentionIds') as string[],
    isCombo: formData.get('isCombo') === 'on',
    comboPricingMode: ((formData.get('comboPricingMode') as string) || 'FIXED') as 'FIXED' | 'DYNAMIC',
    comboDiscountPercent: formData.get('comboDiscountPercent') || 0,
    targetBusinessTypeIds: formData.getAll('targetBusinessTypeIds') as string[],
  }

  const parsed = productSchema.safeParse(raw)
  if (!parsed.success) {
    throw new Error(getFirstValidationError(parsed.error))
  }

  const data = parsed.data
  data.slug = await ensureUniqueProductSlug(data.slug, excludeProductId)

  const category = await prisma.category.findUnique({
    where: { id: data.categoryId },
    select: { id: true, isService: true },
  })

  if (!category) {
    throw new Error('La categoria seleccionada ya no existe. Recarga la página e intenta de nuevo.')
  }

  if (data.options.length > 0 && data.variants.length > 0) {
    data.price = 0
    data.stock = 0
  }

  if (category.isService) {
    data.stock = 0
  }

  const variants = data.variants.map((variant) => ({
    ...variant,
    stock: category.isService ? undefined : variant.stock,
  }))

  const relatedProductIds = [...new Set(data.relatedProductIds)].filter(
    (relatedProductId) => relatedProductId !== excludeProductId
  )

  await assertRelatedProductsExist(relatedProductIds, excludeProductId)

  return { ...data, variants, relatedProductIds, categoryIsService: category.isService, intentionIds: data.intentionIds, targetBusinessTypeIds: data.targetBusinessTypeIds }
}

function buildVariantOptionValueIds(
  dbOptions: Array<{
    id: string
    name: string
    values: Array<{ id: string; value: string }>
  }>,
  combinations: Record<string, string>
) {
  const optionValueIds: string[] = []

  for (const [optionName, optionValue] of Object.entries(combinations)) {
    const matchingOption = dbOptions.find((option) => option.name === optionName)
    if (!matchingOption) continue

    const matchingValue = matchingOption.values.find((value) => value.value === optionValue)
    if (!matchingValue) continue

    optionValueIds.push(matchingValue.id)
  }

  return optionValueIds
}

function sameStringSet(left: string[], right: string[]) {
  if (left.length !== right.length) return false
  const normalizedLeft = [...left].sort()
  const normalizedRight = [...right].sort()
  return normalizedLeft.every((value, index) => value === normalizedRight[index])
}

export async function createProduct(formData: FormData) {
  await requireAdmin()

  const data = await parseProductFormData(formData)

  const createdProduct = await prisma.product.create({
    data: {
      name: data.name,
      slug: data.slug,
      description: data.description,
      price: data.price,
      creditDownPaymentPercent: data.creditDownPaymentPercent,
      categoryId: data.categoryId,
      stock: data.stock,
      images: data.images,
      briefType: data.briefType,
      mediaType: data.mediaType,
      mediaUrl: data.mediaType === 'NONE' ? null : data.mediaUrl,
      mediaTitle: data.mediaType === 'NONE' ? null : data.mediaTitle || null,
      mediaList: data.mediaList,
      active: data.active,
      options: {
        create: data.options.map((option, optionIndex) => ({
          name: option.name,
          displayType: option.displayType,
          sortOrder: optionIndex,
          isRequired: option.isRequired,
          values: {
            create: option.values.map((value, valueIndex) => ({
              value: value.value,
              colorHex: value.colorHex || null,
              sortOrder: valueIndex,
            })),
          },
        })),
      },
      outgoingRelations: data.relatedProductIds.length > 0
        ? {
            create: data.relatedProductIds.map((relatedProductId) => ({
              relatedProductId,
            })),
          }
        : undefined,
      intentions: {
        connect: data.intentionIds.map(id => ({ id }))
      },
      isCombo: data.isCombo,
      comboPricingMode: data.isCombo ? data.comboPricingMode : 'FIXED',
      comboDiscountPercent: data.isCombo && data.comboPricingMode === 'DYNAMIC' ? data.comboDiscountPercent : 0,
      targetBusinessTypes: {
        connect: data.targetBusinessTypeIds.map(id => ({ id }))
      }
    },
    include: {
      options: {
        include: { values: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      },
    },
  })

  if (data.variants.length > 0 && createdProduct.options.length > 0) {
    for (const variant of data.variants) {
      const optionValueIds = buildVariantOptionValueIds(createdProduct.options, variant.combinations)

      await prisma.productVariant.create({
        data: {
          productId: createdProduct.id,
          price: variant.price,
          sku: variant.sku,
          stock: data.categoryIsService ? undefined : variant.stock,
          imageUrl: variant.imageUrl || null,
          options: {
            create: optionValueIds.map((optionValueId) => ({ optionValueId })),
          },
        },
      })
    }
  }

  revalidatePath('/')
  revalidatePath('/admin/productos')
  revalidatePath('/productos')
  revalidatePath(`/productos/${createdProduct.slug}`)
  redirect('/admin/productos')
}

export async function updateProduct(id: string, formData: FormData) {
  await requireAdmin()

  const data = await parseProductFormData(formData, id)
  const originalProduct = await prisma.product.findUnique({
    where: { id },
    select: { slug: true },
  })

  const updatedProduct = await prisma.$transaction(async (tx) => {
    const product = await tx.product.update({
      where: { id },
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        price: data.price,
        creditDownPaymentPercent: data.creditDownPaymentPercent,
        categoryId: data.categoryId,
        stock: data.stock,
        images: data.images,
        briefType: data.briefType,
        mediaType: data.mediaType,
        mediaUrl: data.mediaType === 'NONE' ? null : data.mediaUrl,
        mediaTitle: data.mediaType === 'NONE' ? null : data.mediaTitle || null,
        mediaList: data.mediaList,
        active: data.active,
        isCombo: data.isCombo,
        comboPricingMode: data.isCombo ? data.comboPricingMode : 'FIXED',
        comboDiscountPercent: data.isCombo && data.comboPricingMode === 'DYNAMIC' ? data.comboDiscountPercent : 0,
        intentions: {
          set: data.intentionIds.map((intentionId) => ({ id: intentionId })),
        },
        targetBusinessTypes: {
          set: data.targetBusinessTypeIds.map((btId) => ({ id: btId })),
        },
      },
    })

    const existingRelations = await tx.productRelation.findMany({
      where: { productId: id },
      select: { relatedProductId: true },
    })
    const existingRelatedIds = new Set(existingRelations.map((relation) => relation.relatedProductId))
    const nextRelatedIds = new Set(data.relatedProductIds)
    const relationIdsToDelete = [...existingRelatedIds].filter((relatedProductId) => !nextRelatedIds.has(relatedProductId))
    const relationIdsToCreate = data.relatedProductIds.filter((relatedProductId) => !existingRelatedIds.has(relatedProductId))

    if (relationIdsToDelete.length > 0) {
      await tx.productRelation.deleteMany({
        where: { productId: id, relatedProductId: { in: relationIdsToDelete } },
      })
    }
    if (relationIdsToCreate.length > 0) {
      await tx.productRelation.createMany({
        data: relationIdsToCreate.map((relatedProductId) => ({
          productId: id,
          relatedProductId,
        })),
      })
    }

    const incomingOptionIds = data.options.filter((option) => option.id).map((option) => option.id as string)
    const existingOptions = await tx.productOption.findMany({
      where: { productId: id },
      include: {
        values: {
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    })
    const existingOptionMap = new Map(existingOptions.map((option) => [option.id, option]))
    const ownedOptionCount = incomingOptionIds.filter((optionId) => existingOptionMap.has(optionId)).length
    if (ownedOptionCount !== incomingOptionIds.length) {
      throw new Error('Una opcion del producto ya no existe o no pertenece a este producto. Recarga la pagina e intenta de nuevo.')
    }

    await tx.productOption.deleteMany({
      where: { productId: id, id: { notIn: incomingOptionIds } },
    })

    const dbOptions: Array<{
      id: string
      name: string
      values: Array<{ id: string; value: string }>
    }> = []

    for (let optionIndex = 0; optionIndex < data.options.length; optionIndex++) {
      const option = data.options[optionIndex]
      const incomingValueIds = option.values.filter((value) => value.id).map((value) => value.id as string)

      let optionId = option.id
      if (optionId) {
        const existingOption = existingOptionMap.get(optionId)
        if (!existingOption) {
          throw new Error('No pudimos actualizar una opcion del producto. Recarga la pagina e intenta de nuevo.')
        }

        if (
          existingOption.name !== option.name ||
          existingOption.displayType !== option.displayType ||
          existingOption.sortOrder !== optionIndex ||
          existingOption.isRequired !== option.isRequired
        ) {
          await tx.productOption.update({
            where: { id: optionId },
            data: {
              name: option.name,
              displayType: option.displayType,
              sortOrder: optionIndex,
              isRequired: option.isRequired,
            },
          })
        }
      } else {
        const createdOption = await tx.productOption.create({
          data: {
            productId: id,
            name: option.name,
            displayType: option.displayType,
            sortOrder: optionIndex,
            isRequired: option.isRequired,
          },
        })
        optionId = createdOption.id
      }

      const existingValueMap = new Map(
        (existingOptionMap.get(optionId)?.values || []).map((value) => [value.id, value])
      )
      const ownedValueCount = incomingValueIds.filter((valueId) => existingValueMap.has(valueId)).length
      if (ownedValueCount !== incomingValueIds.length) {
        throw new Error('Un valor de opcion ya no existe o no pertenece a este producto. Recarga la pagina e intenta de nuevo.')
      }

      await tx.productOptionValue.deleteMany({
        where: { optionId, id: { notIn: incomingValueIds } },
      })

      for (let valueIndex = 0; valueIndex < option.values.length; valueIndex++) {
        const value = option.values[valueIndex]
        if (value.id) {
          const existingValue = existingValueMap.get(value.id)
          if (!existingValue) {
            throw new Error('No pudimos actualizar un valor de opcion. Recarga la pagina e intenta de nuevo.')
          }

          const nextColorHex = value.colorHex || null
          if (
            existingValue.value !== value.value ||
            existingValue.colorHex !== nextColorHex ||
            existingValue.sortOrder !== valueIndex
          ) {
            await tx.productOptionValue.update({
              where: { id: value.id },
              data: {
                value: value.value,
                colorHex: nextColorHex,
                sortOrder: valueIndex,
              },
            })
          }
        } else {
          await tx.productOptionValue.create({
            data: {
              optionId,
              value: value.value,
              colorHex: value.colorHex || null,
              sortOrder: valueIndex,
            },
          })
        }
      }

      const syncedOption = await tx.productOption.findUniqueOrThrow({
        where: { id: optionId },
        select: {
          id: true,
          name: true,
          values: {
            select: { id: true, value: true },
            orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          },
        },
      })
      dbOptions.push(syncedOption)
    }

    const incomingVariantIds = data.variants.filter((variant) => variant.id).map((variant) => variant.id as string)
    const existingVariants = await tx.productVariant.findMany({
      where: { productId: id },
      include: {
        options: {
          select: { optionValueId: true },
        },
      },
    })
    const existingVariantMap = new Map(existingVariants.map((variant) => [variant.id, variant]))
    const ownedVariantCount = incomingVariantIds.filter((variantId) => existingVariantMap.has(variantId)).length
    if (ownedVariantCount !== incomingVariantIds.length) {
      throw new Error('Una variante ya no existe o no pertenece a este producto. Recarga la pagina e intenta de nuevo.')
    }

    await tx.productVariant.deleteMany({
      where: { productId: id, id: { notIn: incomingVariantIds } },
    })

    if (data.variants.length > 0 && dbOptions.length > 0) {
      for (const variant of data.variants) {
        const optionValueIds = buildVariantOptionValueIds(dbOptions, variant.combinations)

        if (variant.id) {
          const existingVariant = existingVariantMap.get(variant.id)
          if (!existingVariant) {
            throw new Error('No pudimos actualizar una variante. Recarga la pagina e intenta de nuevo.')
          }

          const nextStock = data.categoryIsService ? null : variant.stock
          const nextImageUrl = variant.imageUrl || null
          const scalarChanged =
            existingVariant.price !== variant.price ||
            existingVariant.sku !== (variant.sku || null) ||
            existingVariant.stock !== nextStock ||
            existingVariant.imageUrl !== nextImageUrl

          if (scalarChanged) {
            await tx.productVariant.update({
              where: { id: variant.id },
              data: {
                price: variant.price,
                sku: variant.sku,
                stock: nextStock,
                imageUrl: nextImageUrl,
              },
            })
          }

          const existingOptionValueIds = existingVariant.options.map((option) => option.optionValueId)
          if (!sameStringSet(existingOptionValueIds, optionValueIds)) {
            await tx.variantOption.deleteMany({ where: { variantId: variant.id } })
            if (optionValueIds.length > 0) {
              await tx.variantOption.createMany({
                data: optionValueIds.map((optionValueId) => ({
                  variantId: variant.id as string,
                  optionValueId,
                })),
              })
            }
          }
        } else {
          const createdVariant = await tx.productVariant.create({
            data: {
              productId: id,
              price: variant.price,
              sku: variant.sku,
              stock: data.categoryIsService ? undefined : variant.stock,
              imageUrl: variant.imageUrl || null,
            },
          })

          if (optionValueIds.length > 0) {
            await tx.variantOption.createMany({
              data: optionValueIds.map((optionValueId) => ({
                variantId: createdVariant.id,
                optionValueId,
              })),
            })
          }
        }
      }
    }

    return product
  }, { maxWait: 10000, timeout: 30000 })

  if (originalProduct?.slug) {
    revalidatePath(`/productos/${originalProduct.slug}`)
  }
  revalidatePath('/')
  revalidatePath('/admin/productos')
  revalidatePath('/productos')
  revalidatePath(`/productos/${updatedProduct.slug}`)
  redirect('/admin/productos')
}

export async function deleteProduct(id: string) {
  await requireAdmin()
  const originalProduct = await prisma.product.findUnique({
    where: { id },
    select: { slug: true },
  })
  await prisma.product.update({ where: { id }, data: { active: false } })
  if (originalProduct?.slug) {
    revalidatePath(`/productos/${originalProduct.slug}`)
  }
  revalidatePath('/')
  revalidatePath('/admin/productos')
  revalidatePath('/productos')
}

export async function duplicateProduct(id: string) {
  await requireAdmin()

  const original = await prisma.product.findUnique({
    where: { id },
    include: {
      options: {
        include: { values: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      },
      variants: {
        include: {
          options: {
            include: {
              optionValue: {
                include: { option: true },
              },
            },
          },
        },
      },
      outgoingRelations: {
        select: { relatedProductId: true },
      },
      intentions: {
        select: { id: true },
      },
      targetBusinessTypes: {
        select: { id: true },
      },
    },
  })
  if (!original) throw new Error('Producto no encontrado')

  const duplicateSlug = await ensureUniqueProductSlug(`${original.slug}-copia`)

  const duplicatedProduct = await prisma.product.create({
    data: {
      name: `${original.name} (copia)`,
      slug: duplicateSlug,
      description: original.description,
      price: original.price,
      creditDownPaymentPercent: original.creditDownPaymentPercent,
      categoryId: original.categoryId,
      stock: original.stock,
      images: original.images,
      briefType: original.briefType,
      mediaType: original.mediaType,
      mediaUrl: original.mediaUrl,
      mediaTitle: original.mediaTitle,
      mediaList: original.mediaList ?? undefined,
      active: false,
      isCombo: original.isCombo,
      comboPricingMode: original.comboPricingMode,
      comboDiscountPercent: original.comboDiscountPercent,
      options: {
        create: original.options.map((option, optionIndex) => ({
          name: option.name,
          displayType: option.displayType,
          sortOrder: option.sortOrder ?? optionIndex,
          isRequired: option.isRequired,
          values: {
            create: option.values.map((value, valueIndex) => ({
              value: value.value,
              colorHex: value.colorHex,
              sortOrder: value.sortOrder ?? valueIndex,
            })),
          },
        })),
      },
      outgoingRelations:
        original.outgoingRelations.length > 0
          ? {
              create: original.outgoingRelations.map((relation) => ({
                relatedProductId: relation.relatedProductId,
              })),
            }
          : undefined,
      intentions: {
        connect: original.intentions.map((intention) => ({ id: intention.id })),
      },
      targetBusinessTypes: {
        connect: original.targetBusinessTypes.map((businessType) => ({ id: businessType.id })),
      },
    },
    include: {
      options: {
        include: { values: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      },
    },
  })

  for (const variant of original.variants) {
    const combinations = Object.fromEntries(
      variant.options.map((variantOption) => [
        variantOption.optionValue.option.name,
        variantOption.optionValue.value,
      ])
    )
    const optionValueIds = buildVariantOptionValueIds(duplicatedProduct.options, combinations)

    await prisma.productVariant.create({
      data: {
        productId: duplicatedProduct.id,
        price: variant.price,
        sku: variant.sku,
        stock: variant.stock,
        imageUrl: variant.imageUrl,
        options: {
          create: optionValueIds.map((optionValueId) => ({ optionValueId })),
        },
      },
    })
  }

  revalidatePath('/')
  revalidatePath('/admin/productos')
  revalidatePath('/productos')
}
