export const PAYMENT_FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY'] as const

export type PaymentFrequency = (typeof PAYMENT_FREQUENCIES)[number]

export const CREDIT_INSTALLMENT_LIMITS: Record<
  PaymentFrequency,
  { min: number; max: number }
> = {
  DAILY: { min: 1, max: 90 },
  WEEKLY: { min: 1, max: 26 },
  MONTHLY: { min: 1, max: 12 },
}

export type FinancingScheduleItem = {
  installmentNumber: number
  dueDate: Date
  amount: number
  principalAmount: number
  interestAmount: number
  balanceAfter: number
}

export type FinancingPlanSummary = {
  baseAmount: number
  downPaymentPercent: number
  downPaymentAmount: number
  financedAmount: number
  ratePercent: number
  paymentFrequency: PaymentFrequency
  installments: number
  periodicRate: number
  installmentAmount: number
  financedRepayable: number
  totalRepayable: number
  totalInterest: number
  firstDueDate: Date
  schedule: FinancingScheduleItem[]
}

const PERIODS_PER_YEAR: Record<PaymentFrequency, number> = {
  DAILY: 365,
  WEEKLY: 52,
  MONTHLY: 12,
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function roundPercent(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function addPeriods(date: Date, amount: number, frequency: PaymentFrequency) {
  const nextDate = new Date(date)

  if (frequency === 'DAILY') {
    nextDate.setDate(nextDate.getDate() + amount)
    return nextDate
  }

  if (frequency === 'WEEKLY') {
    nextDate.setDate(nextDate.getDate() + amount * 7)
    return nextDate
  }

  nextDate.setMonth(nextDate.getMonth() + amount)
  return nextDate
}

export function clampCreditDownPaymentPercent(value: number) {
  return Math.max(30, Math.min(50, Math.round(value)))
}

export function getPaymentFrequencyLabel(paymentFrequency: PaymentFrequency) {
  switch (paymentFrequency) {
    case 'DAILY':
      return 'Diario'
    case 'WEEKLY':
      return 'Semanal'
    case 'MONTHLY':
    default:
      return 'Mensual'
  }
}

export function getInstallmentLimits(paymentFrequency: PaymentFrequency) {
  return CREDIT_INSTALLMENT_LIMITS[paymentFrequency]
}

export function clampInstallmentsForFrequency(
  installments: number,
  paymentFrequency: PaymentFrequency
) {
  const { min, max } = getInstallmentLimits(paymentFrequency)
  return Math.max(min, Math.min(max, Math.round(installments)))
}

export function calculateWeightedDownPaymentPercent(
  items: Array<{
    unitPrice: number
    quantity: number
    creditDownPaymentPercent: number
  }>
) {
  const baseAmount = items.reduce((total, item) => total + item.unitPrice * item.quantity, 0)
  if (baseAmount <= 0) {
    return 30
  }

  const downPaymentAmount = items.reduce(
    (total, item) =>
      total +
      item.unitPrice * item.quantity * (clampCreditDownPaymentPercent(item.creditDownPaymentPercent) / 100),
    0
  )

  return roundPercent((downPaymentAmount / baseAmount) * 100)
}

export function getPeriodicRate(ratePercent: number, paymentFrequency: PaymentFrequency) {
  const normalizedMonthlyRate = Math.max(0, ratePercent) / 100

  if (paymentFrequency === 'MONTHLY') {
    return normalizedMonthlyRate
  }

  const annualEffectiveRate = Math.pow(1 + normalizedMonthlyRate, 12) - 1
  return Math.pow(1 + annualEffectiveRate, 1 / PERIODS_PER_YEAR[paymentFrequency]) - 1
}

export function getPeriodicRatePercent(
  ratePercent: number,
  paymentFrequency: PaymentFrequency
) {
  return roundPercent(getPeriodicRate(ratePercent, paymentFrequency) * 100)
}

export function getNominalAnnualRatePercent(ratePercent: number) {
  return roundPercent(Math.max(0, ratePercent) * 12)
}

export function getEffectiveAnnualRatePercent(ratePercent: number) {
  const normalizedMonthlyRate = Math.max(0, ratePercent) / 100
  return roundPercent((Math.pow(1 + normalizedMonthlyRate, 12) - 1) * 100)
}

export function calculateInstallmentAmount(
  financedAmount: number,
  periodicRate: number,
  installments: number
) {
  if (installments <= 0) {
    throw new Error('La cantidad de cuotas debe ser mayor a 0.')
  }

  if (financedAmount <= 0) {
    return 0
  }

  if (periodicRate <= 0) {
    return roundCurrency(financedAmount / installments)
  }

  const amount =
    financedAmount * (periodicRate / (1 - Math.pow(1 + periodicRate, -installments)))

  return roundCurrency(amount)
}

export function calculateFinancingPlan(input: {
  baseAmount: number
  downPaymentPercent: number
  ratePercent: number
  installments: number
  paymentFrequency: PaymentFrequency
  firstDueDate?: Date
}) {
  const baseAmount = roundCurrency(input.baseAmount)
  const downPaymentPercent = roundPercent(
    clampCreditDownPaymentPercent(input.downPaymentPercent)
  )
  const downPaymentAmount = roundCurrency(baseAmount * (downPaymentPercent / 100))
  const financedAmount = roundCurrency(Math.max(0, baseAmount - downPaymentAmount))
  const periodicRate = getPeriodicRate(input.ratePercent, input.paymentFrequency)
  const firstDueDate = input.firstDueDate ? new Date(input.firstDueDate) : new Date()
  const installments = Math.max(1, Math.round(input.installments))

  if (financedAmount <= 0) {
    return {
      baseAmount,
      downPaymentPercent,
      downPaymentAmount,
      financedAmount,
      ratePercent: roundPercent(Math.max(0, input.ratePercent)),
      paymentFrequency: input.paymentFrequency,
      installments,
      periodicRate,
      installmentAmount: 0,
      financedRepayable: 0,
      totalRepayable: downPaymentAmount,
      totalInterest: 0,
      firstDueDate,
      schedule: [] as FinancingScheduleItem[],
    } satisfies FinancingPlanSummary
  }

  let balance = financedAmount
  let installmentAmount = calculateInstallmentAmount(financedAmount, periodicRate, installments)
  let financedRepayable = 0
  const schedule: FinancingScheduleItem[] = []

  for (let installmentNumber = 1; installmentNumber <= installments; installmentNumber += 1) {
    const dueDate = addPeriods(firstDueDate, installmentNumber - 1, input.paymentFrequency)
    const interestAmount = roundCurrency(balance * periodicRate)
    let principalAmount = roundCurrency(installmentAmount - interestAmount)
    let amount = installmentAmount

    if (periodicRate <= 0) {
      principalAmount = roundCurrency(financedAmount / installments)
      if (installmentNumber === installments) {
        principalAmount = roundCurrency(balance)
      }
      amount = principalAmount
    }

    if (installmentNumber === installments) {
      principalAmount = roundCurrency(balance)
      amount = roundCurrency(principalAmount + interestAmount)
    }

    balance = roundCurrency(Math.max(0, balance - principalAmount))
    financedRepayable = roundCurrency(financedRepayable + amount)

    schedule.push({
      installmentNumber,
      dueDate,
      amount,
      principalAmount,
      interestAmount,
      balanceAfter: balance,
    })
  }

  installmentAmount = schedule[0]?.amount ?? installmentAmount
  const totalRepayable = roundCurrency(downPaymentAmount + financedRepayable)
  const totalInterest = roundCurrency(totalRepayable - baseAmount)

  return {
    baseAmount,
    downPaymentPercent,
    downPaymentAmount,
    financedAmount,
    ratePercent: roundPercent(Math.max(0, input.ratePercent)),
    paymentFrequency: input.paymentFrequency,
    installments,
    periodicRate,
    installmentAmount,
    financedRepayable,
    totalRepayable,
    totalInterest,
    firstDueDate,
    schedule,
  } satisfies FinancingPlanSummary
}
