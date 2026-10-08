import { buildProductUrl, type ExplorationContext } from '@/lib/exploration-context'

export const ZAP_WHATSAPP_NUMBER = '+541125832323'

export function normalizeWhatsappNumber(value?: string | null) {
  return (value || ZAP_WHATSAPP_NUMBER).replace(/\D/g, '')
}

export function buildWhatsappUrl(number: string | undefined | null, text: string) {
  const normalized = normalizeWhatsappNumber(number)
  if (!normalized) return null

  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`
}

export function getPublicProductUrl(slug: string, context?: ExplorationContext) {
  const path = buildProductUrl(slug, context)
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : '')

  if (!baseUrl) return path

  return new URL(path, baseUrl).toString()
}

export function appendWhatsappDetails(
  inquiryUrl: string | null | undefined,
  heading: string,
  details: Array<{ name: string; value: string }>
) {
  if (!inquiryUrl || details.length === 0) return inquiryUrl || null;

  try {
    const url = new URL(inquiryUrl);
    const message = url.searchParams.get('text');
    if (!message) return inquiryUrl;

    // A configurator's generic minimum is not necessarily the selected quote.
    const baseLines = message.split('\n').filter((line) => !line.startsWith('Precio visto:'));
    const detailLines = details
      .filter((detail) => detail.name.trim() && detail.value.trim())
      .map((detail) => `- ${detail.name}: ${detail.value}`);

    if (detailLines.length === 0) return inquiryUrl;
    const linkIndex = baseLines.findIndex((line) => line.startsWith('Link:'));
    const insertAt = linkIndex >= 0 ? linkIndex : baseLines.length;
    const messageLines = [
      ...baseLines.slice(0, insertAt),
      heading,
      ...detailLines,
      ...baseLines.slice(insertAt),
    ];
    url.searchParams.set('text', messageLines.join('\n'));
    return url.toString();
  } catch {
    return inquiryUrl;
  }
}

export function buildProductInquiryMessage({
  name,
  categoryName,
  price,
  creditDownPaymentPercent,
  slug,
  intent = 'consultar',
  contextLabel,
  context,
}: {
  name: string
  categoryName?: string | null
  price?: number | null
  creditDownPaymentPercent?: number | null
  slug: string
  intent?: 'consultar' | 'cotizar' | 'credito'
  contextLabel?: string | null
  context?: ExplorationContext
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
    contextLabel ? `Estoy viendo opciones para ${contextLabel}.` : null,
    typeof price === 'number' && price > 0 ? `Precio visto: $${price.toLocaleString('es-AR')}.` : null,
    intent === 'credito' && creditDownPaymentPercent
      ? `Crédito ZAP desde ${creditDownPaymentPercent}% de anticipo.`
      : null,
    `Link: ${getPublicProductUrl(slug, context)}`,
  ].filter(Boolean)

  return lines.join('\n')
}
