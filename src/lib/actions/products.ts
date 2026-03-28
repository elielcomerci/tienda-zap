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
    throw new Error(`No pudimos interpretar el campo ${key}. Recarga la pagina e intenta de nuevo.`)
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
    throw new Error('Uno o mas productos relacionados ya no existen. Recarga la pagina e intenta de nuevo.')
  }
}

async function parseProductFormData(formData: FormData, excludeProductId?: string) {
  const name = (formData.get('name') as string) || ''
  const requestedSlug = (formData.get('slug') as string) || name
  const normalizedSlug = slugify(requestedSlug)

  if (!normalizedSlug) {
    throw new Error('El nombre del producto debe incluir letras o numeros para generar un slug valido.')
  }

  const raw = {
    name,
    slug: normalizedSlug,
    description: (formData.get('description') as string) || '',
    price: formData.get('price'),
    categoryId: formData.get('categoryId') as string,
    stock: formData.get('stock'),
    images: parseJsonField<string[]>(formData, 'images', []),
    active: formData.get('active') === 'true',
    options: parseJsonField(formData, 'options', []),
    variants: parseJsonField(formData, 'variants', []),
    relatedProductIds: parseJsonField<string[]>(formData, 'relatedProductIds', []),
  }

  const parsed = productSchema.safeParse(raw)
  if (!parsed.success) {
    throw new Error(getFirstValidationError(parsed.error))
  }

  const data = parsed.data
  data.slug = await ensureUniqueProductSlug(data.slug, excludeProductId)

  if (data.options.length > 0 && data.variants.length > 0) {
    data.price = 0
    data.stock = 0
  }

  const relatedProductIds = [...new Set(data.relatedProductIds)].filter(
    (relatedProductId) => relatedProductId !== excludeProductId
  )

  await assertRelatedProductsExist(relatedProductIds, excludeProductId)

  return { ...data, relatedProductIds }
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

export async function createProduct(formData: FormData) {
  await requireAdmin()

  const data = await parseProductFormData(formData)

  const createdProduct = await prisma.product.create({
    data: {
      name: data.name,
      slug: data.slug,
      description: data.description,
      price: data.price,
      categoryId: data.categoryId,
      stock: data.stock,
      images: data.images,
      active: data.active,
      options: {
        create: data.options.map((option) => ({
          name: option.name,
          isRequired: option.isRequired,
          values: {
            create: option.values.map((value) => ({ value: value.value })),
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
    },
    include: {
      options: { include: { values: true } },
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
          stock: variant.stock,
          options: {
            create: optionValueIds.map((optionValueId) => ({ optionValueId })),
          },
        },
      })
    }
  }

  revalidatePath('/admin/productos')
  revalidatePath('/productos')
  redirect('/admin/productos')
}

export async function updateProduct(id: string, formData: FormData) {
  await requireAdmin()

  const data = await parseProductFormData(formData, id)

  await prisma.productOption.deleteMany({ where: { productId: id } })
  await prisma.productVariant.deleteMany({ where: { productId: id } })
  await prisma.productRelation.deleteMany({ where: { productId: id } })

  const updatedProduct = await prisma.product.update({
    where: { id },
    data: {
      name: data.name,
      slug: data.slug,
      description: data.description,
      price: data.price,
      categoryId: data.categoryId,
      stock: data.stock,
      images: data.images,
      active: data.active,
      options: {
        create: data.options.map((option) => ({
          name: option.name,
          isRequired: option.isRequired,
          values: {
            create: option.values.map((value) => ({ value: value.value })),
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
    },
    include: {
      options: { include: { values: true } },
    },
  })

  if (data.variants.length > 0 && updatedProduct.options.length > 0) {
    for (const variant of data.variants) {
      const optionValueIds = buildVariantOptionValueIds(updatedProduct.options, variant.combinations)

      await prisma.productVariant.create({
        data: {
          productId: updatedProduct.id,
          price: variant.price,
          sku: variant.sku,
          stock: variant.stock,
          options: {
            create: optionValueIds.map((optionValueId) => ({ optionValueId })),
          },
        },
      })
    }
  }

  revalidatePath('/admin/productos')
  revalidatePath('/productos')
  redirect('/admin/productos')
}

export async function deleteProduct(id: string) {
  await requireAdmin()
  await prisma.product.update({ where: { id }, data: { active: false } })
  revalidatePath('/admin/productos')
}

export async function duplicateProduct(id: string) {
  await requireAdmin()

  const original = await prisma.product.findUnique({ where: { id } })
  if (!original) throw new Error('Producto no encontrado')

  const { id: _id, createdAt, updatedAt, ...rest } = original

  await prisma.product.create({
    data: {
      ...rest,
      name: `${rest.name} (copia)`,
      slug: `${rest.slug}-copia-${Date.now()}`,
      active: false,
    },
  })

  revalidatePath('/admin/productos')
}
