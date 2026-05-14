export const ZAP_WHATSAPP_NUMBER = '+541125832323'

export function normalizeWhatsappNumber(value?: string | null) {
  return (value || ZAP_WHATSAPP_NUMBER).replace(/\D/g, '')
}

export function buildWhatsappUrl(number: string | undefined | null, text: string) {
  const normalized = normalizeWhatsappNumber(number)
  if (!normalized) return null

  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`
}

export function getPublicProductUrl(slug: string) {
  const path = `/productos/${slug}`
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : '')

  if (!baseUrl) return path

  return new URL(path, baseUrl).toString()
}

export function buildProductInquiryMessage({
  name,
  categoryName,
  price,
  creditDownPaymentPercent,
  slug,
  intent = 'consultar',
}: {
  name: string
  categoryName?: string | null
  price?: number | null
  creditDownPaymentPercent?: number | null
  slug: string
  intent?: 'consultar' | 'cotizar' | 'credito'
}) {
  const action =
    intent === 'credito'
      ? 'evaluarlo con Crédito ZAP'
      : intent === 'cotizar'
        ? 'pedir una cotización'
        : 'consultar'

  const lines = [
    `Hola! Quiero ${action} por "${name}".`,
    categoryName ? `Rubro: ${categoryName}.` : null,
    typeof price === 'number' && price > 0 ? `Precio visto: $${price.toLocaleString('es-AR')}.` : null,
    creditDownPaymentPercent
      ? `Crédito ZAP desde ${creditDownPaymentPercent}% de anticipo.`
      : null,
    `Link: ${getPublicProductUrl(slug)}`,
  ].filter(Boolean)

  return lines.join('\n')
}
