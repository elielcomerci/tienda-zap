import { prisma } from '@/lib/prisma'

export const SITE_SETTINGS_ID = 'site-settings'

export type SiteSettingsFormValues = {
  siteTitle: string
  siteDescription: string
  metaKeywords: string
  canonicalUrl: string
  ogImageUrl: string
  googleAnalyticsId: string
  googleAdsId: string
  googleTagManagerId: string
  googleSiteVerification: string
}

export const defaultSiteSettings: SiteSettingsFormValues = {
  siteTitle: 'ZAP Tienda - Agencia Creativa',
  siteDescription: 'Piezas graficas, diseño y produccion para marcas que cuidan como se ven.',
  metaKeywords: '',
  canonicalUrl: '',
  ogImageUrl: '',
  googleAnalyticsId: '',
  googleAdsId: '',
  googleTagManagerId: '',
  googleSiteVerification: '',
}

function normalize(value: string | null | undefined) {
  return value?.trim() || ''
}

export async function getSiteSettings(): Promise<SiteSettingsFormValues> {
  const settings = await prisma.siteSettings.findUnique({
    where: { id: SITE_SETTINGS_ID },
  })

  if (!settings) return defaultSiteSettings

  return {
    siteTitle: normalize(settings.siteTitle) || defaultSiteSettings.siteTitle,
    siteDescription: normalize(settings.siteDescription) || defaultSiteSettings.siteDescription,
    metaKeywords: normalize(settings.metaKeywords),
    canonicalUrl: normalize(settings.canonicalUrl),
    ogImageUrl: normalize(settings.ogImageUrl),
    googleAnalyticsId: normalize(settings.googleAnalyticsId),
    googleAdsId: normalize(settings.googleAdsId),
    googleTagManagerId: normalize(settings.googleTagManagerId),
    googleSiteVerification: normalize(settings.googleSiteVerification),
  }
}
