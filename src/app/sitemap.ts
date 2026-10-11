import type { MetadataRoute } from 'next'
import { getActiveProductSlugs } from '@/lib/products'

const siteUrl = 'https://tienda.zap.com.ar'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${siteUrl}/productos`,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ]

  try {
    const products = await getActiveProductSlugs()
    const productRoutes: MetadataRoute.Sitemap = products.map(({ slug }) => ({
      url: `${siteUrl}/productos/${encodeURIComponent(slug)}`,
      changeFrequency: 'weekly',
      priority: 0.7,
    }))

    return [...staticRoutes, ...productRoutes]
  } catch (error) {
    // La home y el catálogo siguen siendo descubribles aunque falle la consulta
    // de productos. El error se registra para que el fallo no quede oculto.
    console.error('[sitemap] No se pudieron cargar los productos activos', error)
    return staticRoutes
  }
}
