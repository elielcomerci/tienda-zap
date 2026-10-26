import { z } from 'zod'

export const fiscalBatchRequestPayloadSchema = z.object({
  externalId: z.string().min(1).max(80),
  idempotencyKey: z.string().min(1).max(120),
  contributor: z.object({ cuit: z.string().regex(/^\d{11}$/), pointOfSale: z.number().int().positive(), environment: z.enum(['TEST', 'PROD']) }),
  voucher: z.object({ type: z.enum(['A', 'B', 'C', 'M']), concept: z.number().int().min(1).max(3), date: z.string().min(1).max(20), serviceFrom: z.string().optional(), serviceTo: z.string().optional(), paymentDueDate: z.string().optional() }),
  amounts: z.object({ total: z.number().nonnegative(), net: z.number().nonnegative(), vat: z.number().nonnegative(), exempt: z.number().nonnegative(), nonTaxable: z.number().nonnegative(), vatBreakdown: z.array(z.object({ rate: z.number(), base: z.number(), amount: z.number() })).optional() }),
  items: z.array(z.object({ description: z.string().min(1).max(250), quantity: z.number().positive(), unitPrice: z.number().nonnegative(), discountAmount: z.number().nonnegative().optional(), netAmount: z.number().nonnegative(), vatRate: z.number().nullable().optional(), vatAmount: z.number().nonnegative(), exemptAmount: z.number().nonnegative().optional(), nonTaxableAmount: z.number().nonnegative().optional(), totalAmount: z.number().nonnegative() })).min(1).max(100),
  customer: z.object({ docType: z.number().int().positive(), docNumber: z.string().max(20), name: z.string().max(180).optional(), vatCondition: z.number().int().positive().optional() }),
})
