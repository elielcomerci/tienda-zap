/**
 * Precio público de servicios ZAP.
 *
 * Los priceFrom del seed se guardan como importes netos (sin IVA) para que
 * la comparación y el margen interno no mezclen el impuesto con el ingreso.
 * Para estos servicios se aplica la alícuota general del 21%; revisar si
 * una prestación particular tuviera un tratamiento fiscal diferente.
 */
export const SERVICE_VAT_RATE = 0.21

export function getPublicPriceBreakdown(netAmount: number) {
  const net = Math.round(netAmount * 100) / 100
  const gross = Math.round(net * (1 + SERVICE_VAT_RATE))
  return {
    net,
    gross,
    vat: Math.round((gross - net) * 100) / 100,
    vatRatePercent: SERVICE_VAT_RATE * 100,
  }
}

export function formatARS(amount: number) {
  return amount.toLocaleString('es-AR', { maximumFractionDigits: 2 })
}
