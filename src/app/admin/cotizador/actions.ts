'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { FinishingCostType } from '@prisma/client'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('No autorizado')
  }
}

// ----------------------------------------------------
// MATERIAS PRIMAS
// ----------------------------------------------------

export async function createRawMaterial(data: {
  name: string
  width: number
  height: number
  unit: string
  categoryIds?: string[]
  tiers: { minQty: number; maxQty: number | null; unitPrice: number }[]
}) {
  await requireAdmin()

  await prisma.rawMaterial.create({
    data: {
      name: data.name,
      width: data.width,
      height: data.height,
      unit: data.unit,
      applicableCategories: {
        connect: (data.categoryIds || []).map((id) => ({ id })),
      },
      tiers: {
        create: data.tiers.map((tier) => ({
          minQty: tier.minQty,
          maxQty: tier.maxQty,
          unitPrice: tier.unitPrice,
        })),
      },
    },
  })

  revalidatePath('/admin/cotizador/materiales')
  revalidatePath('/admin/productos')
}

export async function updateRawMaterial(
  id: string,
  data: {
    name: string
    width: number
    height: number
    unit: string
    active: boolean
    categoryIds?: string[]
    tiers: { id?: string; minQty: number; maxQty: number | null; unitPrice: number }[]
  }
) {
  await requireAdmin()

  // Actualizamos datos base
  await prisma.rawMaterial.update({
    where: { id },
    data: {
      name: data.name,
      width: data.width,
      height: data.height,
      unit: data.unit,
      active: data.active,
      applicableCategories: {
        set: (data.categoryIds || []).map((id) => ({ id })),
      },
    },
  })

  // Para actualizar las escalas (tiers), es mas facil borrarlas y recrearlas, 
  // pero intentaremos actualizar las que existen y crear las nuevas
  await prisma.$transaction(async (tx) => {
    const existingTiers = await tx.rawMaterialTier.findMany({ where: { rawMaterialId: id } })
    const incomingIds = data.tiers.map(t => t.id).filter(Boolean)

    // Borramos los tiers que ya no existen
    const toDelete = existingTiers.filter(t => !incomingIds.includes(t.id))
    if (toDelete.length > 0) {
      await tx.rawMaterialTier.deleteMany({
        where: { id: { in: toDelete.map(t => t.id) } },
      })
    }

    // Actualizamos o creamos
    for (const tier of data.tiers) {
      if (tier.id) {
        await tx.rawMaterialTier.update({
          where: { id: tier.id },
          data: { minQty: tier.minQty, maxQty: tier.maxQty, unitPrice: tier.unitPrice },
        })
      } else {
        await tx.rawMaterialTier.create({
          data: {
            rawMaterialId: id,
            minQty: tier.minQty,
            maxQty: tier.maxQty,
            unitPrice: tier.unitPrice,
          },
        })
      }
    }
  })

  revalidatePath('/admin/cotizador/materiales')
  revalidatePath('/admin/productos')
}

export async function deleteRawMaterial(id: string) {
  await requireAdmin()
  await prisma.rawMaterial.delete({ where: { id } })
  revalidatePath('/admin/cotizador/materiales')
}

// ----------------------------------------------------
// TERMINACIONES
// ----------------------------------------------------

export async function createFinishing(data: {
  name: string
  costType: FinishingCostType
  tiers: { minQty: number; maxQty: number | null; unitPrice: number }[]
}) {
  await requireAdmin()
  await prisma.finishingOperation.create({
    data: {
      name: data.name,
      costType: data.costType,
      tiers: {
        create: data.tiers.map((tier) => ({
          minQty: tier.minQty,
          maxQty: tier.maxQty,
          unitPrice: tier.unitPrice,
        })),
      },
    },
  })
  revalidatePath('/admin/cotizador/terminaciones')
  revalidatePath('/admin/productos')
}

export async function updateFinishing(
  id: string,
  data: {
    name: string
    costType: FinishingCostType
    active: boolean
    tiers: { id?: string; minQty: number; maxQty: number | null; unitPrice: number }[]
  }
) {
  await requireAdmin()
  await prisma.finishingOperation.update({
    where: { id },
    data: {
      name: data.name,
      costType: data.costType,
      active: data.active,
    },
  })

  await prisma.$transaction(async (tx) => {
    const existingTiers = await tx.finishingTier.findMany({ where: { finishingId: id } })
    const incomingIds = data.tiers.map(t => t.id).filter(Boolean)

    const toDelete = existingTiers.filter(t => !incomingIds.includes(t.id))
    if (toDelete.length > 0) {
      await tx.finishingTier.deleteMany({
        where: { id: { in: toDelete.map(t => t.id) } },
      })
    }

    for (const tier of data.tiers) {
      if (tier.id) {
        await tx.finishingTier.update({
          where: { id: tier.id },
          data: { minQty: tier.minQty, maxQty: tier.maxQty, unitPrice: tier.unitPrice },
        })
      } else {
        await tx.finishingTier.create({
          data: {
            finishingId: id,
            minQty: tier.minQty,
            maxQty: tier.maxQty,
            unitPrice: tier.unitPrice,
          },
        })
      }
    }
  })

  revalidatePath('/admin/cotizador/terminaciones')
  revalidatePath('/admin/productos')
}

export async function deleteFinishing(id: string) {
  await requireAdmin()
  await prisma.finishingOperation.delete({ where: { id } })
  revalidatePath('/admin/cotizador/terminaciones')
}

// ----------------------------------------------------
// DATOS PARA EL COTIZADOR
// ----------------------------------------------------

export async function getQuoterData(categoryId?: string | null) {
  await requireAdmin()
  const materials = await prisma.rawMaterial.findMany({
    where: { active: true },
    include: {
      tiers: { orderBy: { minQty: 'asc' } },
      applicableCategories: { select: { id: true, name: true, slug: true } },
    },
  })
  const finishings = await prisma.finishingOperation.findMany({
    where: { active: true },
    include: { tiers: { orderBy: { minQty: 'asc' } } },
  })
  return { materials, finishings, categoryId: categoryId || null }
}
