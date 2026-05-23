import type { Metadata } from 'next'
import Script from 'next/script'
import { getSiteSettings } from '@/lib/site-settings'
import './globals.css'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings()
  const baseUrl = settings.canonicalUrl || process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const keywords = settings.metaKeywords
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
    alternates: settings.canonicalUrl ? { canonical: settings.canonicalUrl } : undefined,
    openGraph: {
      title: settings.siteTitle,
      description: settings.siteDescription,
      url: settings.canonicalUrl || undefined,
      images: settings.ogImageUrl ? [{ url: settings.ogImageUrl }] : undefined,
      type: 'website',
    },
    verification: settings.googleSiteVerification
      ? { google: settings.googleSiteVerification }
      : undefined,
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings()
  const googleTagId = settings.googleAnalyticsId || settings.googleAdsId

  return (
    <html lang="es">
      <body>
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
