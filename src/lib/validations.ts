import { z } from 'zod'

function optionalTextField(minLength: number, message: string) {
  return z.preprocess(
    (value) => {
      if (typeof value !== 'string') return value
      const trimmed = value.trim()
      return trimmed === '' ? undefined : trimmed
    },
    z.string().min(minLength, message).optional()
  )
}

export const productSchema = z.object({
  name: z.string().min(2, 'El nombre es requerido'),
  slug: z
    .string()
    .min(2, 'El slug es requerido')
    .regex(/^[a-z0-9-]+$/, 'Solo minusculas, números y guiones'),
  description: z.string().optional(),
  price: z.coerce.number().min(0, 'El precio debe ser mayor o igual a 0'),
  creditDownPaymentPercent: z.coerce
    .number()
    .int('El anticipo debe ser un número entero')
    .min(30, 'El anticipo minimo para Crédito ZAP es 30%')
    .max(50, 'El anticipo maximo para Crédito ZAP es 50%'),
  categoryId: z.string().min(1, 'Selecciona una categoria'),
  stock: z.coerce.number().int().min(0).default(0),
  images: z.array(z.string().url()).min(1, 'Agrega al menos una imagen'),
  briefType: z.enum(['NONE', 'DESIGN', 'MUSIC', 'VIDEO']).default('NONE'),
  mediaType: z.enum(['NONE', 'AUDIO', 'VIDEO', 'YOUTUBE']).default('NONE'),
  mediaUrl: z.string().trim().optional().default(''),
  mediaTitle: z.string().trim().optional().default(''),
  mediaList: z.array(z.object({
    id: z.string(),
    type: z.enum(['AUDIO', 'VIDEO', 'YOUTUBE']),
    url: z.string().url('La URL del medio no es válida'),
    title: z.string().min(1, 'El título es requerido'),
    lyrics: z.string().optional().default(''),
  })).optional().default([]),
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
  intentionIds: z.array(z.string()).optional().default([]),
  isCombo: z.boolean().default(false),
  targetBusinessTypeIds: z.array(z.string()).optional().default([]),
}).superRefine((data, ctx) => {
  if (data.mediaType !== 'NONE') {
    if (!data.mediaUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['mediaUrl'],
        message: 'Carga un archivo o indica una URL para el medio del producto.',
      })
    } else {
      const parsedUrl = z.string().url().safeParse(data.mediaUrl)
      if (!parsedUrl.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['mediaUrl'],
          message: 'La URL del medio no es valida.',
        })
      }
    }
  }

  if (data.mediaType === 'YOUTUBE' && data.mediaUrl) {
    try {
      const url = new URL(data.mediaUrl)
      const host = url.hostname.replace(/^www\./, '')
      if (!['youtube.com', 'm.youtube.com', 'youtu.be'].includes(host)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['mediaUrl'],
          message: 'El video debe ser un link de YouTube.',
        })
      }
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['mediaUrl'],
        message: 'El video debe ser un link de YouTube valido.',
      })
    }
  }

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
          message: 'Hay variantes incompletas o con valores inválidos. Regenera la matriz.',
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
  email: z.string().email('Email inválido'),
  phone: z.string().min(8, 'Teléfono inválido'),
  paymentType: z.enum(['MERCADOPAGO', 'TRANSFER', 'ZAP_CREDIT']), // Removed CASH
  notes: z.string().optional(),
  couponCode: optionalTextField(4, 'Codigo de cupon inválido'),

  documentId: optionalTextField(7, 'Documento (DNI/CUIL/CUIT) inválido'),
  billingAddress: optionalTextField(3, 'Dirección de facturación invalida'),
  billingCity: optionalTextField(2, 'Ciudad de facturación invalida'),
  billingProvince: optionalTextField(2, 'Provincia de facturación invalida'),
  shippingAddress: optionalTextField(3, 'Dirección de envio invalida'),
  shippingCity: optionalTextField(2, 'Ciudad de envio invalida'),
  shippingProvince: optionalTextField(2, 'Provincia de envio invalida'),
  shippingPostalCode: optionalTextField(4, 'Codigo postal inválido'),

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
      briefType: z.enum(['NONE', 'DESIGN', 'MUSIC', 'VIDEO']).optional(),
      briefResponses: z.record(z.string(), z.string()).optional(),
      briefReferenceLinks: z.array(z.string().url()).optional(),
      briefReferenceFiles: z
        .array(
          z.object({
            url: z.string().url(),
            objectKey: z.string().optional(),
            fileName: z.string(),
            contentType: z.string().optional(),
            sizeBytes: z.number().optional(),
          })
        )
        .optional(),
      designRequested: z.boolean().optional(),
      isService: z.boolean().optional(),
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
      message: 'Configura el plan de Crédito ZAP antes de continuar.',
    })
  }

  const billingFields = [
    ['billingAddress', data.billingAddress],
    ['billingCity', data.billingCity],
    ['billingProvince', data.billingProvince],
  ] as const
  const shippingFields = [
    ['shippingAddress', data.shippingAddress],
    ['shippingCity', data.shippingCity],
    ['shippingProvince', data.shippingProvince],
    ['shippingPostalCode', data.shippingPostalCode],
  ] as const

  const hasAnyBillingField = billingFields.some(([, value]) => Boolean(value))
  const hasAnyShippingField = shippingFields.some(([, value]) => Boolean(value))

  if (data.paymentType === 'ZAP_CREDIT') {
    if (!data.documentId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['documentId'],
        message: 'El documento es requerido para solicitar Crédito ZAP.',
      })
    }

    for (const [fieldName, value] of billingFields) {
      if (!value) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [fieldName],
          message: 'Completa este dato para solicitar Crédito ZAP.',
        })
      }
    }

    for (const [fieldName, value] of shippingFields) {
      if (!value) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [fieldName],
          message: 'Completa este dato para solicitar Crédito ZAP.',
        })
      }
    }
  } else {
    if (hasAnyBillingField) {
      for (const [fieldName, value] of billingFields) {
        if (!value) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [fieldName],
            message: 'Si completas facturación, carga todos los campos.',
          })
        }
      }
    }

    if (hasAnyShippingField) {
      for (const [fieldName, value] of shippingFields) {
        if (!value) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [fieldName],
            message: 'Si completas envio, carga todos los campos.',
          })
        }
      }
    }
  }
})

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

export const registerSchema = z.object({
  name: z.string().min(2, 'El nombre es requerido'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  documentId: optionalTextField(7, 'Documento (DNI/CUIL/CUIT) inválido'),
  businessTypeId: z.string().optional(),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
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
  email: z.string().email('Email inválido'),
})

export const resetPasswordSchema = z.object({
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
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

  return firstFieldError || flattened.formErrors[0] || 'Revisá los datos ingresados.'
}
