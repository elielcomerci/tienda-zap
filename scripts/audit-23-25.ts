import { Pool } from 'pg'
const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_R0JyeVjX1NSI@ep-super-butterfly-ane1zynb-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require' })
async function main() {
  // Packs: nombre + descripción completa
  const { rows: packs } = await pool.query(`
    SELECT slug, name, description FROM "Product"
    WHERE "isCombo" = true OR slug LIKE 'pack-%'
    ORDER BY name
  `)
  console.log('\n=== PACKS Y COMBOS ===\n')
  for (const p of packs) {
    console.log(`--- ${p.name} (${p.slug}) ---`)
    console.log(p.description ?? '(sin descripción)')
    console.log()
  }

  // Todos los productos activos: solo nombre para detectar inconsistencias
  const { rows: all } = await pool.query(`
    SELECT slug, name, taxonomy FROM "Product"
    WHERE active = true AND slug != 'venta-manual'
    ORDER BY taxonomy, name
  `)
  console.log('\n=== TODOS LOS NOMBRES (activos) ===\n')
  for (const r of all) {
    console.log(`[${r.taxonomy ?? '?'}] ${r.name}`)
  }

  await pool.end()
}
main().catch(e => { console.error(e); pool.end() })
