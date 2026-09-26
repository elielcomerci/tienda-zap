import { Pool } from 'pg'

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_R0JyeVjX1NSI@ep-super-butterfly-ane1zynb-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
})

async function main() {
  const { rows } = await pool.query(`
    SELECT 
      p.id,
      p.name,
      p.slug,
      p."conversionType",
      c.name AS category,
      c."isService"
    FROM "Product" p
    LEFT JOIN "Category" c ON p."categoryId" = c.id
    ORDER BY c."isService" DESC, c.name, p.name
  `)
  
  console.log('\n=== PRODUCTOS (', rows.length, 'total) ===\n')
  for (const r of rows) {
    const tax = r.isService ? '[Desarrollo?]' : '[Cosa?]'
    const conv = r.conversionType ? `  conversion=${r.conversionType}` : ''
    console.log(`${tax} [${r.category}] ${r.name}${conv}`)
    console.log(`       slug: ${r.slug}`)
  }
  
  await pool.end()
}

main().catch(console.error)
