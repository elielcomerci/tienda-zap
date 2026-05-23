import { BarChart3, Globe2, Search, ShieldCheck } from 'lucide-react'
import { saveSiteSettings } from '@/lib/actions/site-settings'
import { getSiteSettings } from '@/lib/site-settings'

export const metadata = { title: 'SEO y tráfico | ZAP Admin' }

export default async function SeoSettingsPage() {
  const settings = await getSiteSettings()

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] bg-gray-950 p-6 text-white shadow-xl shadow-gray-950/10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-white/70">
              <Search size={14} />
              SEO
            </div>
            <h1 className="text-2xl font-black">SEO y tráfico orgánico</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/70">
              Configura los metadatos del sitio, verificación de Google y medición de campañas sin tocar código.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold text-white/70">
            <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-3">
              <Globe2 size={18} className="mx-auto mb-1" />
              Sitio
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-3">
              <ShieldCheck size={18} className="mx-auto mb-1" />
              Search
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-3">
              <BarChart3 size={18} className="mx-auto mb-1" />
              Ads
            </div>
          </div>
        </div>
      </div>

      <form action={saveSiteSettings} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="mb-4 border-b border-gray-100 pb-3 font-bold text-gray-900">
              Metadatos principales
            </h2>

            <div className="grid gap-4">
              <label className="block">
                <span className="label">Título del sitio</span>
                <input
                  name="siteTitle"
                  defaultValue={settings.siteTitle}
                  className="input"
                  placeholder="ZAP Tienda - Agencia Creativa"
                  required
                />
              </label>

              <label className="block">
                <span className="label">Descripción SEO</span>
                <textarea
                  name="siteDescription"
                  defaultValue={settings.siteDescription}
                  rows={4}
                  className="input resize-none"
                  placeholder="Describe el sitio en 140-160 caracteres."
                  required
                />
              </label>

              <label className="block">
                <span className="label">Palabras clave meta</span>
                <input
                  name="metaKeywords"
                  defaultValue={settings.metaKeywords}
                  className="input"
                  placeholder="imprenta, diseño gráfico, tarjetas personales, banners"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Google casi no usa este campo, pero puede servir para buscadores secundarios y auditorías internas.
                </p>
              </label>
            </div>
          </section>

          <section className="card p-6">
            <h2 className="mb-4 border-b border-gray-100 pb-3 font-bold text-gray-900">
              Vista compartida y canonical
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="label">URL canonical</span>
                <input
                  name="canonicalUrl"
                  type="url"
                  defaultValue={settings.canonicalUrl}
                  className="input"
                  placeholder="https://tienda.zap.com.ar"
                />
              </label>

              <label className="block">
                <span className="label">Imagen Open Graph</span>
                <input
                  name="ogImageUrl"
                  type="url"
                  defaultValue={settings.ogImageUrl}
                  className="input"
                  placeholder="https://..."
                />
              </label>
            </div>
          </section>

          <section className="card p-6">
            <h2 className="mb-4 border-b border-gray-100 pb-3 font-bold text-gray-900">
              Google y campañas
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="label">Google Analytics ID</span>
                <input
                  name="googleAnalyticsId"
                  defaultValue={settings.googleAnalyticsId}
                  className="input font-mono !text-sm"
                  placeholder="G-XXXXXXXXXX"
                />
              </label>

              <label className="block">
                <span className="label">Google Ads ID</span>
                <input
                  name="googleAdsId"
                  defaultValue={settings.googleAdsId}
                  className="input font-mono !text-sm"
                  placeholder="AW-XXXXXXXXXX"
                />
              </label>

              <label className="block">
                <span className="label">Google Tag Manager ID</span>
                <input
                  name="googleTagManagerId"
                  defaultValue={settings.googleTagManagerId}
                  className="input font-mono !text-sm"
                  placeholder="GTM-XXXXXXX"
                />
              </label>

              <label className="block">
                <span className="label">Verificación Search Console</span>
                <input
                  name="googleSiteVerification"
                  defaultValue={settings.googleSiteVerification}
                  className="input font-mono !text-sm"
                  placeholder="contenido del meta google-site-verification"
                />
              </label>
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <div className="card p-5">
            <h2 className="text-base font-black text-gray-950">Checklist SEO</h2>
            <div className="mt-4 space-y-3 text-sm text-gray-700">
              <SeoCheck done={Boolean(settings.siteTitle)} label="Título cargado" />
              <SeoCheck done={settings.siteDescription.length >= 10} label="Descripción cargada" />
              <SeoCheck done={Boolean(settings.canonicalUrl)} label="Canonical configurado" />
              <SeoCheck done={Boolean(settings.ogImageUrl)} label="Imagen para compartir" />
              <SeoCheck done={Boolean(settings.googleSiteVerification)} label="Search Console" />
              <SeoCheck
                done={Boolean(settings.googleAnalyticsId || settings.googleTagManagerId)}
                label="Medición activa"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            Para Google Ads usa el ID `AW-...`. Las conversiones específicas conviene configurarlas por evento
            cuando cerremos el flujo de compra/checkout como objetivo.
          </div>

          <button type="submit" className="btn-primary w-full justify-center !py-3.5 shadow-xl">
            Guardar configuración SEO
          </button>
        </aside>
      </form>
    </div>
  )
}

function SeoCheck({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
      <span className="font-semibold">{label}</span>
      <span
        className={`rounded-full px-2 py-0.5 text-[11px] font-black ${
          done ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
        }`}
      >
        {done ? 'OK' : 'Pendiente'}
      </span>
    </div>
  )
}
