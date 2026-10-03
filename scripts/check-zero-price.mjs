import { Pool } from 'pg'

const connectionString = 'postgresql://neondb_owner:npg_R0JyeVjX1NSI@ep-super-butterfly-ane1zynb-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
const pool = new Pool({ connectionString })

async function main() {
  const { rows } = await pool.query(`
    SELECT p.id, p.name, p.slug, p.price, p."conversionType", 
           qc.id as quoter_id,
           (SELECT count(*) FROM "ProductVariant" pv WHERE pv."productId" = p.id) as variant_count,
           (SELECT count(*) FROM "ProductOption" po WHERE po."productId" = p.id) as option_count
    FROM "Product" p
    LEFT JOIN "product_quoter_configs" qc ON qc."productId" = p.id
    WHERE p.name IN ('Vinilo para vidriera', 'Flyer o volante', 'Tarjetas personales estándar')
  `)
  console.log(JSON.stringify(rows, null, 2))
}

main().catch(console.error).finally(() => pool.end())
