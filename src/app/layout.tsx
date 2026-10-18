import type { Metadata } from 'next'
import Script from 'next/script'
import { getSiteSettings } from '@/lib/site-settings'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import GoogleAnalyticsConsent from '@/components/GoogleAnalyticsConsent'
import './globals.css'

const PUBLIC_SITE_URL = 'https://tienda.zap.com.ar'

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
  const googleTagId = settings.googleAdsId

  return (
    <html lang="es" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans antialiased">
        {settings.googleTagManagerId && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${settings.googleTagManagerId}`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
            />
          </noscript>
        )}
        {children}
        <GoogleAnalyticsConsent />
        {settings.googleTagManagerId && (
          <Script id="google-tag-manager" strategy="afterInteractive">
            {`
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','${settings.googleTagManagerId}');
            `}
          </Script>
        )}
        {googleTagId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${googleTagId}`}
              strategy="afterInteractive"
            />
            <Script id="google-gtag" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                ${settings.googleAnalyticsId ? `gtag('config', '${settings.googleAnalyticsId}');` : ''}
                ${settings.googleAdsId ? `gtag('config', '${settings.googleAdsId}');` : ''}
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  )
}
