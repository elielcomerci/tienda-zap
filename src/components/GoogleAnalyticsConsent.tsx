'use client'

import { useEffect, useState } from 'react'

const GA_ID = 'G-185SVFQ798'
const CONSENT_KEY = 'zap-tienda-analytics-consent-v1'

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
    __zapTiendaAnalyticsLoaded?: boolean
    __zapTiendaAnalyticsLoading?: boolean
  }
}

function loadAnalytics() {
  if (typeof window === 'undefined' || window.__zapTiendaAnalyticsLoaded || window.__zapTiendaAnalyticsLoading) return

  window.dataLayer = window.dataLayer || []
  window.gtag = window.gtag || function gtag(...args: unknown[]) {
    window.dataLayer?.push(args)
  }
  window.__zapTiendaAnalyticsLoading = true

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
  script.dataset.zapTiendaAnalytics = 'true'
  script.onload = () => {
    window.gtag?.('js', new Date())
    window.gtag?.('config', GA_ID)
    window.__zapTiendaAnalyticsLoaded = true
    window.__zapTiendaAnalyticsLoading = false
  }
  script.onerror = () => {
    window.__zapTiendaAnalyticsLoading = false
  }
  document.head.appendChild(script)
}

export default function GoogleAnalyticsConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let choice: string | null = null
    try {
      choice = window.localStorage.getItem(CONSENT_KEY)
    } catch {
      // Without storage, ask for consent again on the next page visit.
    }

    if (choice === 'accepted') loadAnalytics()
    else if (choice !== 'rejected') setVisible(true)
  }, [])

  function choose(accepted: boolean) {
    try {
      window.localStorage.setItem(CONSENT_KEY, accepted ? 'accepted' : 'rejected')
    } catch {
      // The selection still applies to this page view.
    }
    if (accepted) loadAnalytics()
    setVisible(false)
  }

  if (!visible) return null

  return (
    <aside
      aria-label="Preferencias de privacidad"
      className="fixed bottom-4 right-4 z-[1500] w-[calc(100vw-2rem)] max-w-md rounded-xl border border-neutral-200 bg-white p-5 text-neutral-900 shadow-[0_12px_40px_rgba(0,0,0,0.16)] sm:bottom-6 sm:right-6 sm:p-6"
    >
      <p className="text-sm font-semibold tracking-tight">Tu privacidad, a tu manera.</p>
      <p className="mt-2 text-sm leading-6 text-neutral-600">
        Usamos Google Analytics para entender cómo se utiliza la tienda y mejorarla.
        La medición solo se activa si la aceptás.
      </p>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => choose(false)}
          className="rounded-full border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
        >
          Rechazar analítica
        </button>
        <button
          type="button"
          onClick={() => choose(true)}
          className="rounded-full bg-neutral-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
        >
          Aceptar analítica
        </button>
      </div>
    </aside>
  )
}
