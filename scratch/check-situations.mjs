import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const situations = await prisma.situation.findMany({
  select: {
    id: true, slug: true, name: true, active: true,
    _count: { select: { needs: true } }
  },
  orderBy: { name: 'asc' }
})

console.log('Total situations:', situations.length)
console.log(JSON.stringify(situations, null, 2))

// Also check needs with active flag
const needs = await prisma.need.findMany({
  select: { id: true, slug: true, name: true, active: true, situations: { select: { slug: true } } },
  take: 20
})
console.log('\nSample needs:', JSON.stringify(needs.slice(0, 5), null, 2))

await prisma.$disconnect()
