import { z } from 'zod'

export const productSchema = z.object({
  name: z.string().min(2, 'El nombre es requerido'),
  slug: z
    .string()
    .min(2, 'El slug es requerido')
    .regex(/^[a-z0-9-]+$/, 'Solo minusculas, numeros y guiones'),
  description: z.string().optional(),
  price: z.coerce.number().min(0, 'El precio debe ser mayor o igual a 0'),
  creditDownPaymentPercent: z.coerce
    .number()
    .int('El anticipo debe ser un numero entero')
    .min(30, 'El anticipo minimo para Credito ZAP es 30%')
    .max(50, 'El anticipo maximo para Credito ZAP es 50%'),
  categoryId: z.string().min(1, 'Selecciona una categoria'),
  stock: z.coerce.number().int().min(0).default(0),
  images: z.array(z.string().url()).min(1, 'Agrega al menos una imagen'),
  active: z.boolean().default(true),
  options: z.array(z.object({
    id: z.string().optional(),
    name: z.string().min(1, 'Cada opcion debe tener nombre'),
    isRequired: z.boolean(),
    values: z.array(z.object({
      id: z.string().optional(),
      value: z.string().min(1, 'Cada valor debe tener texto'),
    })).min(1, 'Cada opcion debe tener al menos un valor'),
  })).optional().default([]),
  variants: z.array(z.object({
    id: z.string().optional(),
    combinations: z.record(z.string(), z.string()),
    price: z.coerce.number().min(0, 'El precio debe ser mayor o igual a 0'),
    sku: z.string().optional(),
    stock: z.coerce.number().int().optional(),
  })).optional().default([]),
  relatedProductIds: z.array(z.string()).optional().default([]),
}).superRefine((data, ctx) => {
  const normalizedOptionNames = data.options.map((option) => option.name.trim().toLowerCase())

  if (new Set(normalizedOptionNames).size !== normalizedOptionNames.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['options'],
      message: 'No puede haber dos opciones con el mismo nombre.',
    })
  }

  data.options.forEach((option, optionIndex) => {
    const normalizedValues = option.values.map((value) => value.value.trim().toLowerCase())

    if (new Set(normalizedValues).size !== normalizedValues.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['options', optionIndex, 'values'],
        message: `La opcion ${option.name} tiene valores repetidos.`,
      })
    }
  })

  if (data.options.length > 0 && data.variants.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['variants'],
      message: 'Genera la matriz de variantes antes de guardar el producto.',
    })
    return
  }

  if (data.options.length === 0 && data.variants.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['variants'],
      message: 'El producto no puede guardar variantes si ya no tiene opciones configuradas.',
    })
    return
  }

  const optionNames = data.options.map((option) => option.name)
  const seenCombinations = new Set<string>()

  data.variants.forEach((variant, variantIndex) => {
    if (data.options.length > 0 && Object.keys(variant.combinations).length !== data.options.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['variants', variantIndex, 'combinations'],
        message: 'La variante no coincide con las opciones cargadas. Regenera la matriz.',
      })
    }

    data.options.forEach((option) => {
      const selectedValue = variant.combinations[option.name]
      const optionHasValue = option.values.some((value) => value.value === selectedValue)

      if (!selectedValue || !optionHasValue) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['variants', variantIndex, 'combinations'],
          message: 'Hay variantes incompletas o con valores invalidos. Regenera la matriz.',
        })
      }
    })

    const combinationSignature = optionNames
      .map((optionName) => `${optionName}:${variant.combinations[optionName] || ''}`)
      .join('|')

    if (combinationSignature && seenCombinations.has(combinationSignature)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['variants', variantIndex, 'combinations'],
        message: 'Hay variantes duplicadas en la matriz.',
      })
    }

    seenCombinations.add(combinationSignature)
  })
})

export const orderCheckoutSchema = z.object({
  name: z.string().min(2, 'El nombre es requerido'),
  email: z.string().email('Email invalido'),
  phone: z.string().min(8, 'Telefono invalido'),
  paymentType: z.enum(['MERCADOPAGO', 'TRANSFER', 'ZAP_CREDIT']), // Removed CASH
  notes: z.string().optional(),
  
  // Extended Customer Information
  documentId: z.string().min(7, 'Documento (DNI/CUIL/CUIT) invalido'),
  billingAddress: z.string().min(3, 'Direccion de facturacion requerida'),
  billingCity: z.string().min(2, 'Ciudad de facturacion requerida'),
  billingProvince: z.string().min(2, 'Provincia de facturacion requerida'),
  shippingAddress: z.string().min(3, 'Direccion de envio requerida'),
  shippingCity: z.string().min(2, 'Ciudad de envio requerida'),
  shippingProvince: z.string().min(2, 'Provincia de envio requerida'),
  shippingPostalCode: z.string().min(4, 'Codigo postal invalido'),

  zapCreditConfig: z
    .object({
      installments: z.number().int().positive(),
      paymentFrequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
    })
    .optional(),
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().positive(),
      unitPrice: z.number().min(0),
      notes: z.string().optional(),
      designRequested: z.boolean().optional(),
      selectedOptions: z.array(z.object({
        name: z.string(),
        value: z.string(),
      })).optional(),
    })
  ).min(1),
}).superRefine((data, ctx) => {
  if (data.paymentType === 'ZAP_CREDIT' && !data.zapCreditConfig) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['zapCreditConfig'],
      message: 'Configura el plan de Credito ZAP antes de continuar.',
    })
  }
})

export const loginSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(6, 'La contrasena debe tener al menos 6 caracteres'),
})

export const registerSchema = z.object({
  name: z.string().min(2, 'El nombre es requerido'),
  email: z.string().email('Email invalido'),
  phone: z.string().optional(),
  password: z.string().min(6, 'La contrasena debe tener al menos 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contrasenas no coinciden',
  path: ['confirmPassword'],
})

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'El nombre es requerido'),
  phone: z.string().optional(),
  documentId: z.string().optional(),
  billingAddress: z.string().optional(),
  billingCity: z.string().optional(),
  billingProvince: z.string().optional(),
  shippingAddress: z.string().optional(),
  shippingCity: z.string().optional(),
  shippingProvince: z.string().optional(),
  shippingPostalCode: z.string().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email('Email invalido'),
})

export const resetPasswordSchema = z.object({
  password: z.string().min(6, 'La contrasena debe tener al menos 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contrasenas no coinciden',
  path: ['confirmPassword'],
})

export type ProductFormData = z.infer<typeof productSchema>
export type OrderCheckoutData = z.infer<typeof orderCheckoutSchema>
export type LoginData = z.infer<typeof loginSchema>
export type RegisterData = z.infer<typeof registerSchema>
export type UpdateProfileData = z.infer<typeof updateProfileSchema>
export type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordData = z.infer<typeof resetPasswordSchema>

export function getFirstValidationError(error: z.ZodError) {
  const flattened = error.flatten()

  const firstFieldError = Object.values(flattened.fieldErrors)
    .flat()
    .find((message): message is string => Boolean(message))

  return firstFieldError || flattened.formErrors[0] || 'Revisa los datos ingresados.'
}
