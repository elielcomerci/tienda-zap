export function isValidFiscalCuit(cuit: string): boolean {
  if (!/^\d{11}$/.test(cuit)) return false
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
  const sum = weights.reduce((total, weight, index) => total + Number(cuit[index]) * weight, 0)
  const remainder = sum % 11
  const checkDigit = remainder === 0 ? 0 : remainder === 1 ? 9 : 11 - remainder
  return Number(cuit[10]) === checkDigit
}
