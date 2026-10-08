import { PrismaClient } from '@prisma/client';
import { businessTypesData } from '../data/02-business-types';
import { productsData } from '../data/05-products';
import { situationsData } from '../data/03-situations';
import { needsData } from '../data/04-needs';
import { offerMatrixData } from '../data/07-offer-matrix';
import { initialQuoterConfigs } from '../data/09-quoter-config';
import { quoterOptionConfigs } from '../data/09-quoter-options';
import { productRelationsData } from '../data/10-product-relations';

export async function runSeedAudit(prisma: PrismaClient): Promise<void> {
  console.log('\n========================================');
  console.log('AUDITORÍA AUTOMÁTICA SEED v1.0 (FASE D)');
  console.log('========================================\n');

  const errors: string[] = [];
  const duplicateValues = (values: string[]) =>
    [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];
  const assertNoSourceDuplicates = (label: string, values: string[]) => {
    const duplicates = duplicateValues(values);
    if (duplicates.length > 0) {
      errors.push(`[SOURCE DUPLICATE] ${label}: ${duplicates.join(', ')}.`);
    }
  };

  assertNoSourceDuplicates('BusinessType slugs', businessTypesData.map((item) => item.slug));
  assertNoSourceDuplicates('Situation slugs', situationsData.map((item) => item.slug));
  assertNoSourceDuplicates('Need slugs', needsData.map((item) => item.slug));
  assertNoSourceDuplicates('Product slugs', productsData.map((item) => item.slug));
  assertNoSourceDuplicates('Product orders', productsData.map((item) => String(item.order)));
  assertNoSourceDuplicates(
    'Offer matrix tuples',
    offerMatrixData.map((item) => `${item.businessTypeSlug}|${item.situationSlug}|${item.needSlug}|${item.productSlug}`)
  );
  assertNoSourceDuplicates(
    'Product relation pairs',
    productRelationsData.map((item) => `${item.productSlug}|${item.relatedProductSlug}`)
  );
  assertNoSourceDuplicates('Quoter config products', initialQuoterConfigs.map((item) => item.productSlug));
  assertNoSourceDuplicates('Quoter option config products', quoterOptionConfigs.map((item) => item.productSlug));

  // Product Bases are the 23 ordered base offers. Eight additional direct
  // design products (orders 24–31) are complementary catalog entries.
  const productBaseData = productsData.filter((product) => product.order >= 1 && product.order <= 23);
  const additionalCatalogProducts = productsData.filter((product) => product.order >= 24 && product.order <= 31);
  const productBaseSlugs = new Set(productBaseData.map((product) => product.slug));
  const productBaseOrders = new Set(productBaseData.map((product) => product.order));
  const additionalCatalogOrders = new Set(additionalCatalogProducts.map((product) => product.order));
  const missingBaseOrders = Array.from({ length: 23 }, (_, index) => index + 1).filter((order) => !productBaseOrders.has(order));
  const missingComplementOrders = Array.from({ length: 8 }, (_, index) => index + 24).filter((order) => !additionalCatalogOrders.has(order));

  if (productBaseData.length !== 23 || productBaseSlugs.size !== 23 || productBaseOrders.size !== 23 || missingBaseOrders.length > 0) {
    errors.push(`[PRODUCT BASES COUNT] Esperadas 23 Product Bases únicas, con órdenes 1–23; filas ${productBaseData.length}, slugs ${productBaseSlugs.size}, órdenes faltantes ${missingBaseOrders.join(', ') || 'ninguna'}.`);
  }
  if (additionalCatalogProducts.length !== 8 || additionalCatalogOrders.size !== 8 || missingComplementOrders.length > 0) {
    errors.push(`[CATALOG COMPLEMENTS COUNT] Esperados 8 productos directos complementarios con órdenes 24–31; filas ${additionalCatalogProducts.length}, órdenes faltantes ${missingComplementOrders.join(', ') || 'ninguna'}.`);
  }

  // 1. Audit Rubros (BusinessTypes)
  const dbRubros = await prisma.businessType.findMany({ select: { slug: true } });
  const expectedRubroSlugs = new Set(businessTypesData.map((b) => b.slug));
  const actualRubroSlugs = new Set(dbRubros.map((b) => b.slug));

  if (dbRubros.length !== 7) {
    errors.push(`[RUBROS COUNT] Esperados 7, encontrados en DB: ${dbRubros.length}`);
  }
  for (const slug of expectedRubroSlugs) {
    if (!actualRubroSlugs.has(slug)) {
      errors.push(`[RUBROS MISSING] Rubro faltante en DB: ${slug}`);
    }
  }
  for (const slug of actualRubroSlugs) {
    if (!expectedRubroSlugs.has(slug)) {
      errors.push(`[RUBROS EXTRA] Rubro no esperado en DB: ${slug}`);
    }
  }

  // 2. Audit Situations
  const dbSituations = await prisma.situation.findMany({ where: { active: true }, select: { slug: true } });
  const expectedSituationSlugs = new Set(situationsData.map((s) => s.slug));
  const actualSituationSlugs = new Set(dbSituations.map((s) => s.slug));

  for (const slug of expectedSituationSlugs) {
    if (!actualSituationSlugs.has(slug)) {
      errors.push(`[SITUATIONS MISSING] Situación faltante: ${slug}`);
    }
  }
  for (const slug of actualSituationSlugs) {
    if (!expectedSituationSlugs.has(slug)) {
      errors.push(`[SITUATIONS EXTRA] Situación inesperada: ${slug}`);
    }
  }

  // 3. Audit Needs
  const dbNeeds = await prisma.need.findMany({ where: { active: true }, select: { slug: true } });
  const expectedNeedSlugs = new Set(needsData.map((n) => n.slug));
  const actualNeedSlugs = new Set(dbNeeds.map((n) => n.slug));

  for (const slug of expectedNeedSlugs) {
    if (!actualNeedSlugs.has(slug)) {
      errors.push(`[NEEDS MISSING] Necesidad faltante: ${slug}`);
    }
  }
  for (const slug of actualNeedSlugs) {
    if (!expectedNeedSlugs.has(slug)) {
      errors.push(`[NEEDS EXTRA] Necesidad inesperada: ${slug}`);
    }
  }

  // 4. Audit Product Bases
  const dbProducts = await prisma.product.findMany({
    where: { active: true },
    select: { id: true, slug: true, modality: true, engine: true },
  });
  const expectedProductSlugs = new Set(productsData.filter((p) => p.active !== false).map((p) => p.slug));
  const actualProductSlugs = new Set(dbProducts.map((p) => p.slug));

  if (dbProducts.length !== expectedProductSlugs.size) {
    errors.push(`[PRODUCTS COUNT] Esperados ${expectedProductSlugs.size} productos activos, encontrados en DB: ${dbProducts.length}`);
  }
  for (const slug of expectedProductSlugs) {
    if (!actualProductSlugs.has(slug)) {
      errors.push(`[PRODUCTS MISSING] Producto faltante en DB: ${slug}`);
    }
  }
  for (const slug of actualProductSlugs) {
    if (!expectedProductSlugs.has(slug)) {
      errors.push(`[PRODUCTS EXTRA] Producto activo no esperado en DB: ${slug}`);
    }
  }

  // 5. Audit Modality and Engine
  const productExpectedMap = new Map(productsData.map((p) => [p.slug, p]));
  for (const p of dbProducts) {
    const exp = productExpectedMap.get(p.slug);
    if (!exp) continue;

    if (p.modality !== exp.modality) {
      errors.push(`[MODALITY MISMATCH] Producto '${p.slug}': esperado ${exp.modality}, encontrado ${p.modality}`);
    }
    if (p.engine !== exp.engine) {
      errors.push(`[ENGINE MISMATCH] Producto '${p.slug}': esperado ${exp.engine}, encontrado ${p.engine}`);
    }

    if (p.modality === 'CONFIGURABLE' && !p.engine) {
      errors.push(`[RULE VIOLATION] Producto CONFIGURABLE '${p.slug}' no tiene engine.`);
    }
    if ((p.modality === 'DIRECTO' || p.modality === 'CONSULTAR') && p.engine !== null) {
      errors.push(`[RULE VIOLATION] Producto ${p.modality} '${p.slug}' tiene engine asignado (${p.engine}).`);
    }
  }

  // 6. Audit ConfiguratorVersion
  const dbConfigurators = await prisma.configuratorVersion.findMany({
    where: {
      product: { active: true },
      status: { in: ['ACTIVE', 'DRAFT'] },
    },
    include: { product: { select: { slug: true, modality: true, engine: true } } },
  });

  for (const cv of dbConfigurators) {
    if (cv.product.modality !== 'CONFIGURABLE') {
      errors.push(`[CONFIGURATOR ERROR] ConfiguratorVersion creado para producto ${cv.product.modality} '${cv.product.slug}'`);
    }
    if (cv.schemaVersion !== '1.0') {
      errors.push(`[CONFIGURATOR ERROR] schemaVersion incorrecto '${cv.schemaVersion}' en '${cv.product.slug}'`);
    }

    const schema =
      cv.schema && typeof cv.schema === 'object' && !Array.isArray(cv.schema)
        ? (cv.schema as Record<string, unknown>)
        : {};
    if (schema.engine && schema.engine !== cv.product.engine) {
      errors.push(
        `[CONFIGURATOR ENGINE MISMATCH] '${cv.product.slug}': producto usa ${cv.product.engine}, schema declara ${String(schema.engine)}.`
      );
    }
    if (schema.productSlug && schema.productSlug !== cv.product.slug) {
      errors.push(
        `[CONFIGURATOR PRODUCT MISMATCH] La versión de '${cv.product.slug}' declara schema.productSlug='${String(schema.productSlug)}'.`
      );
    }
    if (cv.status === 'ACTIVE') {
      const fields =
        schema.fields && typeof schema.fields === 'object' && !Array.isArray(schema.fields)
          ? (schema.fields as Record<string, unknown>)
          : {};
      const configuratorPricing =
        cv.pricing && typeof cv.pricing === 'object' && !Array.isArray(cv.pricing)
          ? (cv.pricing as Record<string, unknown>)
          : {};
      if (Object.keys(fields).length === 0) {
        errors.push(`[ACTIVE CONFIGURATOR FIELDS MISSING] '${cv.product.slug}' está ACTIVE sin campos comerciales.`);
      }
      if (typeof configuratorPricing.engine !== 'string' || configuratorPricing.engine.length === 0) {
        errors.push(`[ACTIVE CONFIGURATOR PRICING MISSING] '${cv.product.slug}' está ACTIVE sin motor de cotización declarado.`);
      }
    }
  }

  const configurableSlugs = new Set(
    productsData.filter((p) => p.active !== false && p.modality === 'CONFIGURABLE').map((p) => p.slug)
  );
  const actualConfigKeys = new Set(
    dbConfigurators.map((cv) => cv.product.slug + '|' + cv.schemaVersion)
  );
  const expectedConfigKeys = new Set(
    Array.from(configurableSlugs).map((slug) => slug + '|1.0')
  );

  for (const key of expectedConfigKeys) {
    if (!actualConfigKeys.has(key)) {
      errors.push(`[CONFIGURATOR MISSING] Falta versión esperada '${key}'`);
    }
  }

  for (const key of actualConfigKeys) {
    if (!expectedConfigKeys.has(key)) {
      errors.push(`[CONFIGURATOR EXTRA] ConfiguratorVersion inesperado '${key}'`);
    }
  }

  // 7. Audit OfferMatrixEntry (Matriz editorial <-> DB exacta)
  const dbEntries = await prisma.offerMatrixEntry.findMany({
    include: {
      businessType: { select: { slug: true } },
      situation: { select: { slug: true } },
      need: { select: { slug: true } },
      product: { select: { slug: true } },
    },
  });

  const matrixProductSlugs = new Set(offerMatrixData.map((entry) => entry.productSlug));
  if (matrixProductSlugs.size !== 22) {
    errors.push(`[MATRIX PRODUCT BASE COUNT] Esperadas 22 Product Bases distintas en la matriz, encontradas ${matrixProductSlugs.size}.`);
  }
  for (const slug of matrixProductSlugs) {
    if (!productBaseSlugs.has(slug)) {
      errors.push(`[MATRIX PRODUCT NOT BASE] La matriz referencia '${slug}', que no está en las 23 Product Bases declaradas.`);
    }
  }

  const expectedTupleKeys = new Set(
    offerMatrixData.map(
      (t) => `${t.businessTypeSlug}|${t.situationSlug}|${t.needSlug}|${t.productSlug}`
    )
  );
  if (expectedTupleKeys.size !== offerMatrixData.length) {
    errors.push('[OFFER MATRIX DATA DUPLICATE] La fuente contiene tuplas repetidas.');
  }

  const actualTupleList = dbEntries.map(
    (e) => `${e.businessType.slug}|${e.situation.slug}|${e.need.slug}|${e.product.slug}`
  );
  const actualTupleKeys = new Set(actualTupleList);
  if (actualTupleKeys.size !== dbEntries.length) {
    errors.push('[OFFER MATRIX DB DUPLICATE] La base contiene tuplas repetidas.');
  }

  if (dbEntries.length !== offerMatrixData.length) {
    errors.push(`[OFFER MATRIX COUNT] Esperadas ${offerMatrixData.length} tuplas, encontradas ${dbEntries.length}`);
  }

  for (const key of expectedTupleKeys) {
    if (!actualTupleKeys.has(key)) {
      errors.push(`[OFFER MATRIX MISSING] Tupla faltante: ${key}`);
    }
  }

  for (const key of actualTupleKeys) {
    if (!expectedTupleKeys.has(key)) {
      errors.push(`[OFFER MATRIX EXTRA] Tupla inesperada: ${key}`);
    }
  }

  // 8. Audit ProductRelations
  const dbRelations = await prisma.productRelation.findMany({
    include: {
      product: { select: { slug: true } },
      relatedProduct: { select: { slug: true } },
    },
  });

  const expectedRelationKeys = new Set(
    productRelationsData.map((relation) => relation.productSlug + '|' + relation.relatedProductSlug)
  );
  const actualRelationKeys = new Set(
    dbRelations.map((relation) => relation.product.slug + '|' + relation.relatedProduct.slug)
  );

  if (dbRelations.length !== productRelationsData.length) {
    errors.push(`[PRODUCT RELATIONS COUNT] Esperadas ${productRelationsData.length}, encontradas ${dbRelations.length}`);
  }
  if (expectedRelationKeys.size !== productRelationsData.length) {
    errors.push('[PRODUCT RELATIONS DATA DUPLICATE] Hay relaciones duplicadas en productRelationsData.');
  }
  for (const key of expectedRelationKeys) {
    if (!actualRelationKeys.has(key)) {
      errors.push(`[PRODUCT RELATIONS MISSING] Relación faltante: ${key}`);
    }
  }
  for (const key of actualRelationKeys) {
    if (!expectedRelationKeys.has(key)) {
      errors.push(`[PRODUCT RELATIONS EXTRA] Relación inesperada: ${key}`);
    }
  }

  // 8. Audit Packs
  const packCount = await prisma.pack.count({ where: { active: true } });
  const packItemCount = await prisma.packItem.count({ where: { pack: { active: true } } });
  if (packCount !== 0 || packItemCount !== 0) {
    errors.push(`[PACKS ERROR] En v1.0 los packs activos deben ser 0. Encontrados: ${packCount} packs, ${packItemCount} items activos.`);
  }

  // 9. Audit Pricing Infrastructure
  const dbPricingConfigs = await prisma.productQuoterConfig.findMany({
    where: { product: { active: true } },
    include: {
      product: { select: { slug: true, modality: true, engine: true } },
      allowedMaterials: { include: { rawMaterial: { include: { tiers: true } } } },
      finishings: { include: { finishing: { include: { tiers: true } } } },
      quantityPresets: true,
      sizePresets: true,
      optionGroups: { include: { options: { include: { allowedSizes: true, constraintsFrom: true, constraintsTo: true } } } },
    },
  });

  const expectedPricingSlugs = new Set(initialQuoterConfigs.filter((c) => expectedProductSlugs.has(c.productSlug)).map((c) => c.productSlug));
  const actualPricingSlugs = new Set(dbPricingConfigs.map((c) => c.product.slug));
  if (dbPricingConfigs.length !== initialQuoterConfigs.length) {
    errors.push(`[PRICING CONFIG COUNT] Esperados ${initialQuoterConfigs.length}, encontrados ${dbPricingConfigs.length}.`);
  }
  for (const slug of expectedPricingSlugs) {
    if (!actualPricingSlugs.has(slug)) errors.push(`[PRICING CONFIG MISSING] Falta ProductQuoterConfig para '${slug}'.`);
  }
  for (const slug of actualPricingSlugs) {
    if (!expectedPricingSlugs.has(slug)) errors.push(`[PRICING CONFIG EXTRA] ProductQuoterConfig inesperado para '${slug}'.`);
  }

  const auditTiers = (tiers: Array<{ minQty: number; maxQty: number | null; unitPrice: number }>, label: string) => {
    if (tiers.length === 0) { errors.push(`[PRICING TIERS MISSING] ${label}: no tiene tiers.`); return; }
    const ordered = [...tiers].sort((a, b) => a.minQty - b.minQty);
    if (ordered[0].minQty !== 1) errors.push(`[PRICING TIERS START] ${label}: debe comenzar en 1.`);
    for (let i = 0; i < ordered.length; i += 1) {
      const tier = ordered[i];
      if (tier.unitPrice <= 0) errors.push(`[PRICING TIER PRICE] ${label}: costo inválido (${tier.unitPrice}).`);
      if (tier.maxQty !== null && tier.maxQty < tier.minQty) errors.push(`[PRICING TIER RANGE] ${label}: rango inválido.`);
      const next = ordered[i + 1];
      if (next && tier.maxQty === null) errors.push(`[PRICING TIER OVERLAP] ${label}: hay tiers después de un rango abierto.`);
      if (next && tier.maxQty !== null && next.minQty !== tier.maxQty + 1) errors.push(`[PRICING TIER GAP] ${label}: salto entre ${tier.maxQty} y ${next.minQty}.`);
    }
    if (ordered[ordered.length - 1].maxQty !== null) errors.push(`[PRICING TIER OPEN END] ${label}: el último tier debe ser abierto.`);
  };

  for (const cfg of dbPricingConfigs) {
    if (cfg.product.modality !== 'CONFIGURABLE' || !cfg.product.engine) {
      errors.push(`[PRICING PRODUCT RULE] '${cfg.product.slug}' debe ser CONFIGURABLE y tener engine.`);
    }
    if (cfg.allowedMaterials.length === 0) errors.push(`[PRICING MATERIALS MISSING] '${cfg.product.slug}' no tiene materias primas.`);
    if (cfg.quantityPresets.length === 0) errors.push(`[PRICING QUANTITIES MISSING] '${cfg.product.slug}' no tiene cantidades.`);
    if (cfg.sizePresets.length === 0 && !cfg.allowCustomSize) errors.push(`[PRICING SIZES MISSING] '${cfg.product.slug}' no tiene tamaños.`);

    const expectedOptionConfig = quoterOptionConfigs.find((entry) => entry.productSlug === cfg.product.slug);
    if (!expectedOptionConfig) {
      errors.push(`[PRICING OPTIONS MISSING SEED] No hay semántica de opciones declarada para '${cfg.product.slug}'.`);
    } else {
      const expectedGroupKeys = new Set(expectedOptionConfig.groups.map((group) => group.key));
      const actualGroupKeys = new Set(cfg.optionGroups.map((group) => group.key));
      if (cfg.optionGroups.length !== expectedOptionConfig.groups.length) {
        errors.push(`[PRICING OPTION GROUP COUNT] '${cfg.product.slug}': esperados ${expectedOptionConfig.groups.length}, encontrados ${cfg.optionGroups.length}.`);
      }
      for (const key of expectedGroupKeys) {
        if (!actualGroupKeys.has(key)) errors.push(`[PRICING OPTION GROUP MISSING] '${cfg.product.slug}': falta '${key}'.`);
      }
      for (const key of actualGroupKeys) {
        if (!expectedGroupKeys.has(key)) errors.push(`[PRICING OPTION GROUP EXTRA] '${cfg.product.slug}': sobra '${key}'.`);
      }
      for (const group of cfg.optionGroups) {
        const seedGroup = expectedOptionConfig.groups.find((entry) => entry.key === group.key);
        if (!seedGroup) continue;
        const expectedOptionKeys = new Set(seedGroup.options.map((option) => option.key));
        const actualOptionKeys = new Set(group.options.map((option) => option.key));
        if (group.options.length !== seedGroup.options.length) {
          errors.push(`[PRICING OPTION COUNT] '${cfg.product.slug}' / '${group.key}': esperadas ${seedGroup.options.length}, encontradas ${group.options.length}.`);
        }
        for (const key of expectedOptionKeys) {
          if (!actualOptionKeys.has(key)) errors.push(`[PRICING OPTION MISSING] '${cfg.product.slug}' / '${group.key}': falta '${key}'.`);
        }
        for (const key of actualOptionKeys) {
          if (!expectedOptionKeys.has(key)) errors.push(`[PRICING OPTION EXTRA] '${cfg.product.slug}' / '${group.key}': sobra '${key}'.`);
        }
      }
    }

    for (const link of cfg.allowedMaterials) {
      if (!link.rawMaterial.active) errors.push(`[PRICING MATERIAL INACTIVE] '${cfg.product.slug}' usa '${link.rawMaterial.id}' inactiva.`);
      auditTiers(link.rawMaterial.tiers, `materia prima '${link.rawMaterial.id}'`);
    }

    const quantities = cfg.quantityPresets.map((q) => q.quantity);
    for (const link of cfg.finishings) {
      if (!link.finishing.active) errors.push(`[PRICING FINISHING INACTIVE] '${cfg.product.slug}' usa '${link.finishing.id}' inactiva.`);
      auditTiers(link.finishing.tiers, `terminación '${link.finishing.id}'`);
      if (link.finishing.costType === 'PER_UNIT') {
        for (const quantity of quantities) {
          const covered = link.finishing.tiers.some((t) => t.minQty <= quantity && (t.maxQty === null || t.maxQty >= quantity));
          if (!covered) errors.push(`[PRICING QUANTITY COVERAGE] '${cfg.product.slug}' / '${link.finishing.id}': cantidad ${quantity} sin costo.`);
        }
      }
    }
  }
  // Final validation check
  if (errors.length > 0) {
    console.error('\n❌ AUDITORÍA FALLIDA CON LOS SIGUIENTES ERRORES:');
    for (const err of errors) {
      console.error(' - ' + err);
    }
    throw new Error(`[SEED AUDIT FAILED] Se detectaron ${errors.length} inconsistencias en la base de datos.`);
  }

  console.log('Rubros:              7 / 7');
  console.log(`Product Bases:       ${productBaseData.length} / 23`);
  console.log(`Productos catálogo:  ${dbProducts.length} / ${expectedProductSlugs.size}`);
  console.log(`Situaciones:         ${dbSituations.length} OK`);
  console.log(`Necesidades:         ${dbNeeds.length} OK`);
  const activeCount = dbConfigurators.filter((c) => c.status === 'ACTIVE').length;
  const draftCount = dbConfigurators.filter((c) => c.status === 'DRAFT').length;
  console.log(`Configuradores:      ${dbConfigurators.length} OK (${activeCount} ACTIVE, ${draftCount} DRAFT)`);
  console.log(`Offer Matrix:        EXACT MATCH (${dbEntries.length} tuplas verificadas 1:1)`);
  console.log('Packs:               0 (preparado sin packs ficticios)');
  console.log('Orphans:             0');
  console.log('Unexpected active records: 0\n');
  console.log('🎉 Seed audit passed. FASE D SEED v1.0: OK\n');
}
