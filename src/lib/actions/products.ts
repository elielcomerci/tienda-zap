'use server'

import { CatalogType, ConfiguratorEngine, ProductModality } from '@prisma/client'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { slugify } from '@/lib/slug'

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user?.role !== 'ADMIN') throw new Error('No autorizado')
}

function lineList(formData: FormData, key: string) {
  return String(formData.get(key) || '')
    .split(/\r?\n|,/)
    .map((value) => value.trim())
    .filter(Boolean)
}

async function uniqueSlug(requested: string, excludeId?: string) {
  const base = slugify(requested)
  if (!base) throw new Error('El producto debe tener un nombre o slug válido.')
  let slug = base
  let number = 2
  while (await prisma.product.findFirst({ where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) }, select: { id: true } })) {
    slug = `${base}-${number++}`
  }
  return slug
}

function productData(formData: FormData) {
  const catalogTypeValue = String(formData.get('catalogType') || 'COSA')
  const catalogType = Object.values(CatalogType).includes(catalogTypeValue as CatalogType)
    ? (catalogTypeValue as CatalogType)
    : 'COSA'
  const modalityValue = String(formData.get('modality') || 'CONSULTAR')
  const modality = Object.values(ProductModality).includes(modalityValue as ProductModality)
    ? (modalityValue as ProductModality)
    : 'CONSULTAR'
  const engineValue = String(formData.get('engine') || '')
  const engine = Object.values(ConfiguratorEngine).includes(engineValue as ConfiguratorEngine)
    ? (engineValue as ConfiguratorEngine)
    : null

  if (modality === 'CONFIGURABLE' && !engine) throw new Error('Un Product Base configurable necesita un motor.')
  if (modality !== 'CONFIGURABLE' && engine) throw new Error('Sólo un Product Base configurable puede tener motor.')

  return {
    name: String(formData.get('name') || '').trim(),
    description: String(formData.get('description') || '').trim() || null,
    catalogType,
    modality,
    engine,
    price: Number(formData.get('price') || 0),
    priceFrom: null,
    active: formData.get('active') !== 'false',
    images: [] as string[],
    stock: 0,
    briefType: 'NONE',
    mediaType: 'NONE',
    whatIs: String(formData.get('whatIs') || '').trim() || null,
    purpose: String(formData.get('purpose') || '').trim() || null,
    includes: lineList(formData, 'includes'),
    configurable: lineList(formData, 'configurable'),
    consultationNote: String(formData.get('consultationNote') || '').trim() || null,
  }
}

function revalidateProductPaths(slug?: string) {
  revalidatePath('/')
  revalidatePath('/productos')
  revalidatePath('/admin/productos')
  if (slug) revalidatePath(`/productos/${slug}`)
}

export async function createProduct(formData: FormData) {
  await requireAdmin()
  const data = productData(formData)
  if (!data.name) throw new Error('Nombre requerido.')
  const product = await prisma.product.create({
    data: { ...data, slug: await uniqueSlug(String(formData.get('slug') || data.name)) },
  })
  revalidateProductPaths(product.slug)
  redirect('/admin/productos')
}

export async function updateProduct(id: string, formData: FormData) {
  await requireAdmin()
  const data = productData(formData)
  if (!data.name) throw new Error('Nombre requerido.')
  const previous = await prisma.product.findUnique({ where: { id }, select: { slug: true } })
  const product = await prisma.product.update({
    where: { id },
    data: { ...data, slug: await uniqueSlug(String(formData.get('slug') || data.name), id) },
  })
  revalidateProductPaths(previous?.slug)
  revalidateProductPaths(product.slug)
  if (formData.get('stayOnPage') !== 'true') redirect('/admin/productos')
}

export async function deleteProduct(id: string) {
  await requireAdmin()
  const product = await prisma.product.update({ where: { id }, data: { active: false }, select: { slug: true } })
  revalidateProductPaths(product.slug)
}

export async function duplicateProduct(id: string) {
  await requireAdmin()
  const original = await prisma.product.findUnique({ where: { id } })
  if (!original) throw new Error('Product Base no encontrado.')
  const duplicate = await prisma.product.create({
    data: {
      name: `${original.name} (copia)`,
      slug: await uniqueSlug(`${original.slug}-copia`),
      description: original.description,
      price: original.price,
      priceFrom: original.priceFrom,
      catalogType: original.catalogType,
      modality: original.modality,
      engine: original.engine,
      images: original.images,
      active: false,
      stock: original.stock,
      briefType: original.briefType,
      mediaType: original.mediaType,
      mediaUrl: original.mediaUrl,
      mediaTitle: original.mediaTitle,
      mediaList: original.mediaList ?? undefined,
      whatIs: original.whatIs,
      purpose: original.purpose,
      includes: original.includes,
      configurable: original.configurable,
      consultationNote: original.consultationNote,
      creditDownPaymentPercent: original.creditDownPaymentPercent,
    },
  })
  revalidateProductPaths(duplicate.slug)
}
