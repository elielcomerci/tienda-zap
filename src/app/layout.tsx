import type { Metadata } from 'next'
import Script from 'next/script'
import { getSiteSettings } from '@/lib/site-settings'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'

const PUBLIC_SITE_URL = 'https://tienda.zap.com.ar'
const DEFAULT_GA_ID = 'G-QVDSSR8KXH'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings()
  // NEXTAUTH_URL puede apuntar a una URL interna o de preview; la URL pública
  // de la tienda es el fallback estable para metadatos absolutos.
  const configuredBaseUrl = settings.canonicalUrl.trim()
  const baseUrl = configuredBaseUrl || PUBLIC_SITE_URL
  const keywords = (settings.metaKeywords || '')
    .split(',')
    .map((keyword) => keyword.trim())
    .filter(Boolean)

  return {
    title: {
      default: settings.siteTitle,
      template: `%s | ${settings.siteTitle}`,
    },
    description: settings.siteDescription,
    keywords: keywords.length > 0 ? keywords : undefined,
    metadataBase: new URL(baseUrl),
    // No declarar canonical en el layout raíz: heredarlo haría que las
    // fichas y páginas internas pudieran canonicalizarse todas a la home.
    openGraph: {
      title: settings.siteTitle,
      description: settings.siteDescription,
      images: settings.ogImageUrl ? [{ url: settings.ogImageUrl }] : undefined,
      type: 'website',
    },
    verification: {
      google: settings.googleSiteVerification || 'WLSgtr6BqJFYGwJ9zz9BuK1G6KCp_2EIl8q-Waviyac',
    },
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings()
  const googleAnalyticsId = settings.googleAnalyticsId || DEFAULT_GA_ID
  const googleAdsId = settings.googleAdsId
  const googleTagId = googleAnalyticsId || googleAdsId

  return (
    <html lang="es" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans antialiased">
        {children}
        {googleTagId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${googleTagId}`}
              strategy="afterInteractive"
            />
            <Script id="google-gtag" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){window.dataLayer.push(arguments);}
                window.gtag = gtag;
                gtag('js', new Date());
                gtag('config', '${googleAnalyticsId}', { send_page_view: true });
                ${googleAdsId ? `gtag('config', '${googleAdsId}');` : ''}
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  )
}
