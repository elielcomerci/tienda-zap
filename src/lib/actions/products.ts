'use server'

import { CatalogType, ConfiguratorEngine, ProductModality, ProductRelationType } from '@prisma/client'
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

function productSoundCloudTracks(formData: FormData, fallbackMediaList: unknown = []) {
  let parsed: unknown = fallbackMediaList
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed) } catch { parsed = [] }
  }
  const existing = Array.isArray(parsed) ? parsed : []
  const preserved = existing.filter((item: any) => item && item.type !== 'SOUNDCLOUD')
  const raw = String(formData.get('soundcloudLinks') || '')
  const tracks = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line, index) => {
    const separator = line.indexOf('|')
    const titleInput = separator >= 0 ? line.slice(0, separator).trim() : ''
    const urlInput = separator >= 0 ? line.slice(separator + 1).trim() : line
    let url: URL
    try { url = new URL(urlInput) } catch { throw new Error(`El enlace de SoundCloud de la línea ${index + 1} no es válido.`) }
    const host = url.hostname.toLowerCase()
    if (url.protocol !== 'https:' || !['soundcloud.com', 'www.soundcloud.com', 'on.soundcloud.com'].includes(host)) {
      throw new Error('Los enlaces de portfolio deben ser direcciones HTTPS de SoundCloud.')
    }
    const fallbackTitle = url.pathname.split('/').filter(Boolean).slice(-1)[0]?.replace(/[-_]/g, ' ') || 'Muestra de SoundCloud'
    return {
      id: `soundcloud-${index + 1}`,
      type: 'SOUNDCLOUD',
      url: url.toString(),
      title: titleInput || fallbackTitle,
    }
  })
  if (tracks.length > 20) throw new Error('Podés cargar hasta 20 enlaces de SoundCloud por producto.')
  return [...preserved, ...tracks]
}

function productImages(formData: FormData, fallbackImages: string[] = []) {
  const raw = formData.get('imagesJson')
  if (raw === null) return fallbackImages
  let parsed: unknown
  try {
    parsed = JSON.parse(String(raw))
  } catch {
    throw new Error('No pudimos guardar las imágenes. Volvé a cargarlas e intentá de nuevo.')
  }
  if (!Array.isArray(parsed) || parsed.length > 12 || parsed.some((value) => typeof value !== 'string')) {
    throw new Error('La lista de imágenes no es válida.')
  }

  const allowedHosts = ['media.zap.com.ar']
  const urls = parsed.map((value) => {
    let url: URL
    try {
      url = new URL(value)
    } catch {
      throw new Error('Una imagen tiene una dirección inválida.')
    }
    const isLegacyBlob = url.hostname.endsWith('.public.blob.vercel-storage.com')
    if (url.protocol !== 'https:' || (!allowedHosts.includes(url.hostname) && !isLegacyBlob)) {
      throw new Error('Las imágenes deben estar alojadas en los medios autorizados de ZAP.')
    }
    return url.toString()
  })
  return [...new Set(urls)]
}

function relationInputs(formData: FormData) {
  const groups: Array<[string, ProductRelationType]> = [
    ['upsellProductIds', 'UPSELL'],
    ['complementaryProductIds', 'COMPLEMENTARY'],
    ['alternativeProductIds', 'ALTERNATIVE'],
  ]
  const seen = new Set<string>()
  return groups.flatMap(([field, type]) => formData.getAll(field).map(String).filter((relatedProductId) => {
    if (!relatedProductId || seen.has(relatedProductId)) return false
    seen.add(relatedProductId)
    return true
  }).map((relatedProductId) => ({ relatedProductId, type })))
}

function productData(formData: FormData, fallbackImages: string[] = [], fallbackMediaList: unknown = []) {
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

  const publicGroupValue = String(formData.get('publicGroup') || '').trim()
  const publicGroup = ['VENTAS', 'MARCA', 'EXPERIENCIA', 'PROYECTOS'].includes(publicGroupValue) ? publicGroupValue : null
  const publicVisible = formData.get('publicVisible') === 'on'
  if (publicVisible && !publicGroup) throw new Error('Elegí una puerta de entrada antes de publicar el producto.')

  const vatRateInput = String(formData.get('vatRatePercent') ?? '').trim()
  const vatRatePercent = vatRateInput ? Number(vatRateInput) : null
  if (vatRatePercent !== null && (!Number.isFinite(vatRatePercent) || vatRatePercent < 0 || vatRatePercent > 100)) {
    throw new Error('La alícuota de IVA debe estar entre 0 y 100%.')
  }

  return {
    name: String(formData.get('name') || '').trim(),
    description: String(formData.get('description') || '').trim() || null,
    catalogType,
    modality,
    engine,
    price: Number(formData.get('price') || 0),
    vatRatePercent,
    priceFrom: null,
    active: formData.get('active') !== 'false',
    publicVisible,
    publicGroup: publicVisible ? publicGroup : null,
    images: productImages(formData, fallbackImages),
    mediaList: productSoundCloudTracks(formData, fallbackMediaList),
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
  const categoryIds = [...new Set(formData.getAll('categoryIds').map(String).filter(Boolean))]
  const relations = relationInputs(formData)
  const product = await prisma.product.create({
    data: {
      ...data,
      slug: await uniqueSlug(String(formData.get('slug') || data.name)),
      categoryLinks: { create: categoryIds.map((categoryId) => ({ categoryId })) },
      outgoingRelations: { create: relations },
    },
  })
  revalidateProductPaths(product.slug)
  redirect('/admin/productos')
}

export async function updateProduct(id: string, formData: FormData) {
  await requireAdmin()
  const previous = await prisma.product.findUnique({ where: { id }, select: { slug: true, images: true, mediaList: true, price: true, priceFrom: true, active: true, stock: true, briefType: true, mediaType: true, includes: true, configurable: true } })
  if (!previous) throw new Error('Product Base no encontrado.')
  const data = productData(formData, previous.images, previous.mediaList)
  if (!data.name) throw new Error('Nombre requerido.')
  const categoryIds = [...new Set(formData.getAll('categoryIds').map(String).filter(Boolean))]
  const relations = relationInputs(formData)
  const product = await prisma.product.update({
    where: { id },
    data: {
      ...data,
      // Campos que este formulario no edita deben conservar su valor actual.
      price: previous.price,
      priceFrom: previous.priceFrom,
      active: previous.active,
      stock: previous.stock,
      briefType: previous.briefType,
      mediaType: previous.mediaType,
      includes: previous.includes,
      configurable: previous.configurable,
      slug: await uniqueSlug(String(formData.get('slug') || data.name), id),
      categoryLinks: {
        deleteMany: {},
        create: categoryIds.map((categoryId) => ({ categoryId })),
      },
      outgoingRelations: {
        deleteMany: {},
        create: relations,
      },
    },
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
  const original = await prisma.product.findUnique({ where: { id }, include: { categoryLinks: { select: { categoryId: true } }, outgoingRelations: { select: { relatedProductId: true, type: true } } } })
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
      publicVisible: false,
      publicGroup: null,
      categoryLinks: { create: original.categoryLinks.map(({ categoryId }) => ({ categoryId })) },
      outgoingRelations: { create: original.outgoingRelations.map(({ relatedProductId, type }) => ({ relatedProductId, type })) },
    },
  })
  revalidateProductPaths(duplicate.slug)
}
