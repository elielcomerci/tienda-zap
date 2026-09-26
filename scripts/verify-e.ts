import { Pool } from 'pg'
const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_R0JyeVjX1NSI@ep-super-butterfly-ane1zynb-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require' })
async function main() {
  const { rows } = await pool.query(`
    SELECT taxonomy, "conversionType", active, COUNT(*) AS n 
    FROM "Product" 
    WHERE slug != 'venta-manual'
    GROUP BY taxonomy, "conversionType", active
    ORDER BY taxonomy, "conversionType"
  `)
  console.log('\ntaxonomy        | conversionType | active | n')
  for (const r of rows) {
    console.log(`${(r.taxonomy??'null').padEnd(15)} | ${(r.conversionType??'null').padEnd(14)} | ${String(r.active).padEnd(6)} | ${r.n}`)
  }
  const { rows: sinTax } = await pool.query(`
    SELECT name, slug, active FROM "Product" WHERE taxonomy IS NULL AND slug != 'venta-manual'
  `)
  if (sinTax.length) {
    console.log('\nSin taxonomy:')
    sinTax.forEach(r => console.log(`  ${r.active ? 'visible' : 'oculto'} — ${r.name} (${r.slug})`))
  } else {
    console.log('\nOK: Todos los productos comerciales tienen taxonomy.')
  }
  await pool.end()
}
main().catch(e => { console.error(e); pool.end() })
