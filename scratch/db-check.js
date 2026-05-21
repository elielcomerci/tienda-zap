require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' }
  });
  const intentions = await prisma.intention.findMany({
    orderBy: { order: 'asc' }
  });
  
  console.log('--- CATEGORIES ---');
  categories.forEach(c => {
    console.log(`- ${c.name} (slug: ${c.slug}, isService: ${c.isService})`);
  });

  console.log('\n--- INTENTIONS ---');
  intentions.forEach(i => {
    console.log(`- ${i.name} (slug: ${i.slug}, active: ${i.active})`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
