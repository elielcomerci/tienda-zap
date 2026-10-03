import { Pool } from 'pg'

const connectionString = 'postgresql://neondb_owner:npg_R0JyeVjX1NSI@ep-super-butterfly-ane1zynb-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
const pool = new Pool({ connectionString })

async function main() {
  const { rows: combos } = await pool.query(`
    SELECT id, name, slug, price, "isCombo", "comboPricingMode", "comboDiscountPercent"
    FROM "Product"
    WHERE "isCombo" = true
  `)
  console.log('COMBOS FOUND:', combos.length)
  for (const c of combos) {
    console.log('--- COMBO:', c.name, 'slug:', c.slug, 'price:', c.price, 'pricingMode:', c.comboPricingMode, 'discount:', c.comboDiscountPercent)
    
    // Check parts
    const { rows: relations } = await pool.query(`
      SELECT pr.id, p.id as part_id, p.name as part_name, p.price as part_price
      FROM "ProductRelation" pr
      JOIN "Product" p ON pr."relatedProductId" = p.id
      WHERE pr."productId" = $1
    `, [c.id])
    console.log('  outgoingRelations (parts):', relations.length)
    for (const r of relations) {
      console.log('    PART:', r.part_name, 'id:', r.part_id, 'price:', r.part_price)
      
      const { rows: options } = await pool.query(`
        SELECT po.id, po.name, po."isRequired", json_agg(pov.value) as values
        FROM "ProductOption" po
        LEFT JOIN "ProductOptionValue" pov ON pov."optionId" = po.id
        WHERE po."productId" = $1
        GROUP BY po.id, po.name, po."isRequired"
      `, [r.part_id])
      console.log('      options:', options.map(o => `${o.name} (req:${o.isRequired}) [${o.values.join(',')}]`))

      const { rows: variants } = await pool.query(`
        SELECT pv.id, pv.price, pv.sku, json_agg(json_build_object('opt', po.name, 'val', pov.value)) as opts
        FROM "ProductVariant" pv
        LEFT JOIN "VariantOption" vo ON vo."variantId" = pv.id
        LEFT JOIN "ProductOptionValue" pov ON vo."optionValueId" = pov.id
        LEFT JOIN "ProductOption" po ON pov."optionId" = po.id
        WHERE pv."productId" = $1
        GROUP BY pv.id, pv.price, pv.sku
      `, [r.part_id])
      console.log('      variants count:', variants.length)
      for (const v of variants) {
        console.log('        v:', v.price, JSON.stringify(v.opts))
      }
    }
  }
}

main().catch(console.error).finally(() => pool.end())
