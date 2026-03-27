'use server'

import { prisma } from '@/lib/prisma'
import { productSchema } from '@/lib/validations'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user?.role !== 'ADMIN') {
    throw new Error('No autorizado')
  }
}

export async function createProduct(formData: FormData) {
  await requireAdmin()

  const raw = {
    name: formData.get('name') as string,
    slug: formData.get('slug') as string,
    description: formData.get('description') as string,
    price: formData.get('price'),
    categoryId: formData.get('categoryId') as string,
    stock: formData.get('stock'),
    images: JSON.parse(formData.get('images') as string),
    active: formData.get('active') === 'true',
    options: formData.get('options') ? JSON.parse(formData.get('options') as string) : [],
    variants: formData.get('variants') ? JSON.parse(formData.get('variants') as string) : [],
  }

  const data = productSchema.parse(raw)

  if (data.options.length > 0 && data.variants.length > 0) {
    data.price = 0
    data.stock = 0
  }

  // Crear producto con sus relaciones anidadas
  const createdProduct = await prisma.product.create({ 
    data: {
      name: data.name,
      slug: data.slug,
      description: data.description,
      price: data.price,
      categoryId: data.categoryId,
      stock: data.stock,
      images: data.images,
      active: data.active,
      options: {
        create: data.options.map(o => ({
          name: o.name,
          isRequired: o.isRequired,
          values: {
            create: o.values.map(v => ({ value: v.value }))
          }
        }))
      }
    },
    include: { options: { include: { values: true } } }
  })

  // Ahora creamos las variantes con sus relaciones a ProductOptionValue
  if (data.variants && data.variants.length > 0 && createdProduct.options.length > 0) {
    for (const variantData of data.variants) {
      // Find the Option Value IDs based on the Name-Value string pairs in combinations
      const optionValueIds: string[] = []
      
      for (const [optName, optVal] of Object.entries(variantData.combinations)) {
        const matchingDBOption = createdProduct.options.find(o => o.name === optName)
        if (matchingDBOption) {
          const matchingDBValue = matchingDBOption.values.find(v => v.value === optVal)
          if (matchingDBValue) {
            optionValueIds.push(matchingDBValue.id)
          }
        }
      }

      await prisma.productVariant.create({
        data: {
          productId: createdProduct.id,
          price: variantData.price,
          sku: variantData.sku,
          stock: variantData.stock,
          options: {
            create: optionValueIds.map(id => ({ optionValueId: id }))
          }
        }
      })
    }
  }

  revalidatePath('/admin/productos')
  revalidatePath('/productos')
  redirect('/admin/productos')
}

export async function updateProduct(id: string, formData: FormData) {
  await requireAdmin()

  const raw = {
    name: formData.get('name') as string,
    slug: formData.get('slug') as string,
    description: formData.get('description') as string,
    price: formData.get('price'),
    categoryId: formData.get('categoryId') as string,
    stock: formData.get('stock'),
    images: JSON.parse(formData.get('images') as string),
    active: formData.get('active') === 'true',
    options: formData.get('options') ? JSON.parse(formData.get('options') as string) : [],
    variants: formData.get('variants') ? JSON.parse(formData.get('variants') as string) : [],
  }

  const data = productSchema.parse(raw)

  if (data.options.length > 0 && data.variants.length > 0) {
    data.price = 0
    data.stock = 0
  }

  // Eliminar opciones y variantes viejas para evitar inconsistencias
  await prisma.productOption.deleteMany({ where: { productId: id } })
  await prisma.productVariant.deleteMany({ where: { productId: id } })

  const updatedProduct = await prisma.product.update({ 
    where: { id }, 
    data: {
      name: data.name,
      slug: data.slug,
      description: data.description,
      price: data.price,
      categoryId: data.categoryId,
      stock: data.stock,
      images: data.images,
      active: data.active,
      options: {
        create: data.options.map(o => ({
          name: o.name,
          isRequired: o.isRequired,
          values: {
            create: o.values.map(v => ({ value: v.value }))
          }
        }))
      }
    },
    include: { options: { include: { values: true } } }
  })

  // Recrear variantes
  if (data.variants && data.variants.length > 0 && updatedProduct.options.length > 0) {
    for (const variantData of data.variants) {
      const optionValueIds: string[] = []
      
      for (const [optName, optVal] of Object.entries(variantData.combinations)) {
        const matchingDBOption = updatedProduct.options.find(o => o.name === optName)
        if (matchingDBOption) {
          const matchingDBValue = matchingDBOption.values.find(v => v.value === optVal)
          if (matchingDBValue) {
            optionValueIds.push(matchingDBValue.id)
          }
        }
      }

      await prisma.productVariant.create({
        data: {
          productId: updatedProduct.id,
          price: variantData.price,
          sku: variantData.sku,
          stock: variantData.stock,
          options: {
            create: optionValueIds.map(vid => ({ optionValueId: vid }))
          }
        }
      })
    }
  }

  revalidatePath('/admin/productos')
  revalidatePath('/productos')
  redirect('/admin/productos')
}

export async function deleteProduct(id: string) {
  await requireAdmin()
  await prisma.product.update({ where: { id }, data: { active: false } })
  revalidatePath('/admin/productos')
}

export async function duplicateProduct(id: string) {
  await requireAdmin()
  const original = await prisma.product.findUnique({ where: { id } })
  if (!original) throw new Error('Producto no encontrado')

  const { id: _, createdAt, updatedAt, ...rest } = original
  await prisma.product.create({
    data: {
      ...rest,
      name: `${rest.name} (copia)`,
      slug: `${rest.slug}-copia-${Date.now()}`,
      active: false,
    },
  })
  revalidatePath('/admin/productos')
}
