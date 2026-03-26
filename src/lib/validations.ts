import { z } from 'zod'

export const productSchema = z.object({
  name: z.string().min(2, 'El nombre es requerido'),
  slug: z.string().min(2, 'El slug es requerido').regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones'),
  description: z.string().optional(),
  price: z.coerce.number().positive('El precio debe ser mayor a 0'),
  categoryId: z.string().min(1, 'Seleccioná una categoría'),
  stock: z.coerce.number().int().min(0),
  images: z.array(z.string().url()).min(1, 'Agregá al menos una imagen'),
  active: z.boolean().default(true),
})

export const orderCheckoutSchema = z.object({
  guestName: z.string().min(2, 'El nombre es requerido'),
  guestEmail: z.string().email('Email inválido'),
  guestPhone: z.string().min(8, 'Teléfono inválido'),
  paymentType: z.enum(['MERCADOPAGO', 'TRANSFER', 'CASH']),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().positive(),
      unitPrice: z.number().positive(),
      notes: z.string().optional(),
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

export type ProductFormData = z.infer<typeof productSchema>
export type OrderCheckoutData = z.infer<typeof orderCheckoutSchema>
export type LoginData = z.infer<typeof loginSchema>
export type RegisterData = z.infer<typeof registerSchema>
export type UpdateProfileData = z.infer<typeof updateProfileSchema>
