import { z } from 'zod'

export const productSchema = z.object({
  name: z.string().min(2, 'El nombre es requerido'),
  slug: z.string().min(2, 'El slug es requerido').regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones'),
  description: z.string().optional(),
  price: z.coerce.number().min(0, 'El precio debe ser mayor o igual a 0'),
  categoryId: z.string().min(1, 'Seleccioná una categoría'),
  stock: z.coerce.number().int().min(0).default(0),
  images: z.array(z.string().url()).min(1, 'Agregá al menos una imagen'),
  active: z.boolean().default(true),
  options: z.array(z.object({
    id: z.string().optional(),
    name: z.string().min(1),
    isRequired: z.boolean(),
    values: z.array(z.object({
      id: z.string().optional(),
      value: z.string().min(1)
    })).min(1)
  })).optional().default([]),
  variants: z.array(z.object({
    id: z.string().optional(),
    combinations: z.record(z.string(), z.string()), // { "Cantidad": "100u" }
    price: z.coerce.number().min(0, 'El precio debe ser mayor o igual a 0'),
    sku: z.string().optional(),
    stock: z.coerce.number().int().optional(),
  })).optional().default([])
})

export const orderCheckoutSchema = z.object({
  name: z.string().min(2, 'El nombre es requerido'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(8, 'Teléfono inválido'),
  paymentType: z.enum(['MERCADOPAGO', 'TRANSFER', 'CASH']),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().positive(),
      unitPrice: z.number().min(0),
      notes: z.string().optional(),
      designRequested: z.boolean().optional(),
      selectedOptions: z.array(z.object({
        name: z.string(),
        value: z.string()
      })).optional()
    })
  ).min(1),
})

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

export const registerSchema = z.object({
  name: z.string().min(2, 'El nombre es requerido'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
})

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'El nombre es requerido'),
  phone: z.string().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
})

export const resetPasswordSchema = z.object({
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
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
