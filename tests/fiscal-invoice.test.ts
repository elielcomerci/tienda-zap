import assert from 'node:assert/strict'
import { buildInvoiceDetails } from '../src/lib/fiscal-invoice-calculation'

let passed = 0
function test(name: string, run: () => void) {
  run()
  passed += 1
  console.log(`✓ ${name}`)
}

function makeOrder(input: {
  items: Array<Record<string, any>>
  discountTotal?: number
  total: number
}) {
  return {
    id: 'order-test',
    discountTotal: input.discountTotal || 0,
    total: input.total,
    items: input.items.map((item, index) => ({
      id: `item-${index}`,
      productName: item.productName || `Artículo ${index + 1}`,
      product: { name: item.productName || `Artículo ${index + 1}` },
      quantity: item.quantity ?? 1,
      unitPrice: item.unitPrice,
      fiscalTaxTreatment: item.fiscalTaxTreatment,
      fiscalVatRate: item.fiscalVatRate ?? null,
    })),
  }
}

test('desglosa correctamente un precio final con IVA del 21%', () => {
  const result = buildInvoiceDetails(makeOrder({
    total: 1210,
    items: [{ unitPrice: 1210, fiscalTaxTreatment: 'VAT', fiscalVatRate: 21 }],
  }))
  assert.equal(result.amounts.total, 1210)
  assert.equal(result.amounts.net, 1000)
  assert.equal(result.amounts.vat, 210)
  assert.equal(result.items[0]?.totalAmount, 1210)
})

test('distribuye descuentos entre artículos y conserva el total cobrado', () => {
  const result = buildInvoiceDetails(makeOrder({
    total: 2083.5,
    discountTotal: 231.5,
    items: [
      { unitPrice: 1210, fiscalTaxTreatment: 'VAT', fiscalVatRate: 21 },
      { unitPrice: 1105, fiscalTaxTreatment: 'VAT', fiscalVatRate: 10.5 },
    ],
  }))
  assert.equal(result.amounts.total, 2083.5)
  assert.equal(result.items.reduce((sum: number, item: { discountAmount: number }) => sum + item.discountAmount, 0), 231.5)
  assert.equal(result.amounts.net, 1800)
  assert.equal(result.amounts.vat, 283.5)
})

test('separa importes exentos y no gravados sin inventar IVA', () => {
  const result = buildInvoiceDetails(makeOrder({
    total: 2500,
    items: [
      { unitPrice: 1500, fiscalTaxTreatment: 'EXEMPT' },
      { unitPrice: 1000, fiscalTaxTreatment: 'NON_TAXABLE' },
    ],
  }))
  assert.equal(result.amounts.total, 2500)
  assert.equal(result.amounts.exempt, 1500)
  assert.equal(result.amounts.nonTaxable, 1000)
  assert.equal(result.amounts.vat, 0)
})

test('bloquea artículos sin clasificación fiscal', () => {
  assert.throws(() => buildInvoiceDetails(makeOrder({
    total: 100,
    items: [{ unitPrice: 100, fiscalTaxTreatment: null }],
  })), /sin clasificación fiscal/)
})

test('bloquea un detalle cuyo total no coincide con lo cobrado', () => {
  assert.throws(() => buildInvoiceDetails(makeOrder({
    total: 99,
    items: [{ unitPrice: 100, fiscalTaxTreatment: 'VAT', fiscalVatRate: 0 }],
  })), /no coincide con el total cobrado/)
})

test('bloquea diferencias de redondeo de IVA entre líneas y alícuota agrupada', () => {
  assert.throws(() => buildInvoiceDetails(makeOrder({
    total: 0.06,
    items: [
      { unitPrice: 0.03, fiscalTaxTreatment: 'VAT', fiscalVatRate: 21 },
      { unitPrice: 0.03, fiscalTaxTreatment: 'VAT', fiscalVatRate: 21 },
    ],
  })), /redondeo/)
})

console.log(`Fiscal invoice tests: ${passed} passed`)
