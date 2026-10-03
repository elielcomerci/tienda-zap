import { Pool } from 'pg'

const connectionString = 'postgresql://neondb_owner:npg_R0JyeVjX1NSI@ep-super-butterfly-ane1zynb-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
const pool = new Pool({ connectionString })

function isPurchasablePrice(price) {
  return typeof price === 'number' && price > 0
}

function getVariantCombos(variant) {
  const combos = {}
  variant.options.forEach((option) => {
    combos[option.optionValue.option.name] = option.optionValue.value
  })
  return combos
}

function findMatchingPartVariant(part, selections) {
  if (!part.variants || part.variants.length === 0) return null

  const selectedEntries = Object.entries(selections).filter(([, value]) => value)
  if (selectedEntries.length === 0) return null

  return (
    part.variants.find((variant) => {
      const combos = getVariantCombos(variant)
      const comboEntries = Object.entries(combos)
      return comboEntries.every(([optionName, value]) => selections[optionName] === value)
    }) || null
  )
}

async function main() {
  const { rows } = await pool.query(`
    SELECT p.*,
           json_agg(json_build_object(
             'id', pr.id,
             'relatedProduct', json_build_object(
               'id', rp.id,
               'name', rp.name,
               'price', rp.price,
               'options', (
                 SELECT COALESCE(json_agg(json_build_object(
                   'id', po.id,
                   'name', po.name,
                   'isRequired', po."isRequired",
                   'values', (
                     SELECT json_agg(json_build_object('id', pov.id, 'value', pov.value))
                     FROM "ProductOptionValue" pov
                     WHERE pov."optionId" = po.id
                   )
                 )), '[]'::json)
                 FROM "ProductOption" po
                 WHERE po."productId" = rp.id
               ),
               'variants', (
                 SELECT COALESCE(json_agg(json_build_object(
                   'id', pv.id,
                   'price', pv.price,
                   'options', (
                     SELECT json_agg(json_build_object(
                       'optionValue', json_build_object(
                         'id', pov2.id,
                         'value', pov2.value,
                         'option', json_build_object('id', po2.id, 'name', po2.name)
                       )
                     ))
                     FROM "VariantOption" vo
                     JOIN "ProductOptionValue" pov2 ON vo."optionValueId" = pov2.id
                     JOIN "ProductOption" po2 ON pov2."optionId" = po2.id
                     WHERE vo."variantId" = pv.id
                   )
                 )), '[]'::json)
                 FROM "ProductVariant" pv
                 WHERE pv."productId" = rp.id
               )
             )
           )) as "outgoingRelations"
    FROM "Product" p
    JOIN "ProductRelation" pr ON pr."productId" = p.id
    JOIN "Product" rp ON pr."relatedProductId" = rp.id
    WHERE p.slug = 'pack-gastronomia-local-activo'
    GROUP BY p.id
  `)

  const product = rows[0]
  const comboParts = product.outgoingRelations.map(r => r.relatedProduct)
  console.log('Product:', product.name, 'isCombo:', product.isCombo, 'comboPricingMode:', product.comboPricingMode, 'price:', product.price)
  console.log('Parts count:', comboParts.length)

  // Simulation 1: initial empty selections
  let comboSelections = {}
  console.log('\n--- TEST 1: Initial empty selections ---')
  evaluate(comboParts, comboSelections, product)

  // Simulation 2: select options for Imanes and Stickers
  console.log('\n--- TEST 2: Selecting options for Imanes and Stickers ---')
  for (const part of comboParts) {
    if (part.options && part.options.length > 0) {
      comboSelections[part.id] = {}
      for (const opt of part.options) {
        comboSelections[part.id][opt.name] = opt.values[0].value
        console.log(`  Selected for ${part.name}: ${opt.name} = ${opt.values[0].value}`)
      }
    }
  }
  evaluate(comboParts, comboSelections, product)
}

function evaluate(comboParts, comboSelections, product) {
  const isDynamicCombo = product.isCombo && product.comboPricingMode === 'DYNAMIC'
  const hasOptions = product.options && product.options.length > 0
  const simpleProductAvailable = isPurchasablePrice(product.price)

  const entries = comboParts.map((part) => {
    const selections = comboSelections[part.id] || {}
    return [part.id, findMatchingPartVariant(part, selections)]
  })
  const comboPartVariants = new Map(entries)

  const comboPartsReady = comboParts.every((part) => {
    const partSelections = comboSelections[part.id] || {}
    const requiredOptionsReady = (part.options || [])
      .filter((option) => option.isRequired)
      .every((option) => Boolean(partSelections[option.name]))

    if (!requiredOptionsReady) {
      console.log(`  part ${part.name} NOT ready: missing required options`);
      return false;
    }
    if (!part.variants || part.variants.length === 0) return true;

    const matchingVariant = comboPartVariants.get(part.id);
    const ready = Boolean(matchingVariant && isPurchasablePrice(matchingVariant.price));
    if (!ready) {
      console.log(`  part ${part.name} NOT ready: matchingVariant=${JSON.stringify(matchingVariant)}`);
    }
    return ready;
  })

  let comboPartsBaseTotal = 0
  for (const part of comboParts) {
    if (!part.options || part.options.length === 0) {
      if (!isPurchasablePrice(part.price)) {
        console.log(`  baseTotal failed: part ${part.name} has no options and price is ${part.price}`);
        comboPartsBaseTotal = null
        break
      }
      comboPartsBaseTotal += part.price
      continue
    }

    const partSelections = comboSelections[part.id] || {}
    const matchingVariant = findMatchingPartVariant(part, partSelections)
    if (!matchingVariant || !isPurchasablePrice(matchingVariant.price)) {
      console.log(`  baseTotal failed: part ${part.name} matchingVariant price invalid`);
      comboPartsBaseTotal = null
      break
    }
    comboPartsBaseTotal += matchingVariant.price
  }

  const dynamicComboPrice = comboPartsBaseTotal === null ? null : Math.max(0, comboPartsBaseTotal * (1 - (product.comboDiscountPercent || 0) / 100))
  const canAddToCart = hasOptions ? false : simpleProductAvailable
  const configuredProductReady = isDynamicCombo
    ? comboPartsReady && dynamicComboPrice !== null && dynamicComboPrice > 0
    : canAddToCart && comboPartsReady
  const canAddConfiguredProduct = configuredProductReady

  const addToCartLabel = !comboPartsReady
    ? 'Configurá el combo'
    : isDynamicCombo && dynamicComboPrice === null
      ? 'Elegí las piezas'
      : 'Agregar al carrito'

  console.log('Result:')
  console.log('  comboPartsReady:', comboPartsReady)
  console.log('  comboPartsBaseTotal:', comboPartsBaseTotal)
  console.log('  dynamicComboPrice:', dynamicComboPrice)
  console.log('  configuredProductReady:', configuredProductReady)
  console.log('  canAddConfiguredProduct (button enabled):', canAddConfiguredProduct)
  console.log('  addToCartLabel:', addToCartLabel)
}

main().catch(console.error).finally(() => pool.end())
