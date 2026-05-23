'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { SITE_SETTINGS_ID, type SiteSettingsFormValues } from '@/lib/site-settings'

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user?.role !== 'ADMIN') {
    throw new Error('No autorizado')
  }
}

function text(formData: FormData, key: keyof SiteSettingsFormValues) {
  return ((formData.get(key) as string) || '').trim()
}

function nullableText(formData: FormData, key: keyof SiteSettingsFormValues) {
  const value = text(formData, key)
  return value || null
}

export async function saveSiteSettings(formData: FormData) {
  await requireAdmin()

  const siteTitle = text(formData, 'siteTitle')
  const siteDescription = text(formData, 'siteDescription')

  if (siteTitle.length < 2) {
    throw new Error('El titulo SEO debe tener al menos 2 caracteres.')
  }

  if (siteDescription.length < 10) {
    throw new Error('La descripcion SEO debe tener al menos 10 caracteres.')
  }

  await prisma.siteSettings.upsert({
    where: { id: SITE_SETTINGS_ID },
    create: {
      id: SITE_SETTINGS_ID,
      siteTitle,
      siteDescription,
      metaKeywords: nullableText(formData, 'metaKeywords'),
      canonicalUrl: nullableText(formData, 'canonicalUrl'),
      ogImageUrl: nullableText(formData, 'ogImageUrl'),
      googleAnalyticsId: nullableText(formData, 'googleAnalyticsId'),
      googleAdsId: nullableText(formData, 'googleAdsId'),
      googleTagManagerId: nullableText(formData, 'googleTagManagerId'),
      googleSiteVerification: nullableText(formData, 'googleSiteVerification'),
    },
    update: {
      siteTitle,
      siteDescription,
      metaKeywords: nullableText(formData, 'metaKeywords'),
      canonicalUrl: nullableText(formData, 'canonicalUrl'),
      ogImageUrl: nullableText(formData, 'ogImageUrl'),
      googleAnalyticsId: nullableText(formData, 'googleAnalyticsId'),
      googleAdsId: nullableText(formData, 'googleAdsId'),
      googleTagManagerId: nullableText(formData, 'googleTagManagerId'),
      googleSiteVerification: nullableText(formData, 'googleSiteVerification'),
    },
  })

  revalidatePath('/')
  revalidatePath('/admin/seo')
}
