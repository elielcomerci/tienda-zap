import { PrismaClient } from '@prisma/client';
import { businessTypesData } from '../data/02-business-types';
import { productsData } from '../data/05-products';
import { situationsData } from '../data/03-situations';
import { needsData } from '../data/04-needs';
import { offerMatrixData } from '../data/07-offer-matrix';
import { initialQuoterConfigs } from '../data/09-quoter-config';
import { quoterOptionConfigs } from '../data/09-quoter-options';
import { productRelationsData } from '../data/10-product-relations';
import { impresosPackagingConfigurators } from '../data/06-configurators/impresos-packaging';
import { presenciaFisicaConfigurators } from '../data/06-configurators/presencia-fisica';
import { textilConfigurators } from '../data/06-configurators/textil';
import { digitalConfigurators } from '../data/06-configurators/digital';
import { campanasConfigurators } from '../data/06-configurators/campanas';

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

  const configuratorSourceData = [
    ...impresosPackagingConfigurators,
    ...presenciaFisicaConfigurators,
    ...textilConfigurators,
    ...digitalConfigurators,
    ...campanasConfigurators,
  ];
  const configuratorSourceKey = (item: { productSlug: string; schemaVersion: string }) =>
    `${item.productSlug}|${item.schemaVersion}`;
  assertNoSourceDuplicates(
    'ConfiguratorVersion keys',
    configuratorSourceData.map(configuratorSourceKey)
  );

  // All catalog offers share one unique, persisted editorial order.
  const productOrders = new Set(productsData.map((product) => product.order));
  const missingProductOrders = Array.from({ length: productsData.length }, (_, index) => index + 1)
    .filter((order) => !productOrders.has(order));
  if (productsData.length !== 51 || productOrders.size !== productsData.length || missingProductOrders.length > 0) {
    errors.push(`[PRODUCT CATALOG ORDER] Esperados 51 productos con orden único 1–51; filas ${productsData.length}, órdenes faltantes ${missingProductOrders.join(', ') || 'ninguna'}.`);
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
    select: { id: true, slug: true, modality: true, engine: true, publicVisible: true },
  });
  const expectedProductSlugs = new Set(productsData.filter((p) => p.active !== false).map((p) => p.slug));
  // The seed owns the 51 catalog products, not historical/test rows kept in the DB.
  // Hidden out-of-catalog records are preserved; only an unexpected public offer is an error.
  const catalogDbProducts = dbProducts.filter((product) => expectedProductSlugs.has(product.slug));
  const catalogDbProductSlugs = new Set(catalogDbProducts.map((p) => p.slug));
  const unexpectedPublicProducts = dbProducts.filter(
    (product) => !expectedProductSlugs.has(product.slug) && product.publicVisible
  );

  if (catalogDbProducts.length !== expectedProductSlugs.size) {
    errors.push(`[PRODUCTS COUNT] Esperados ${expectedProductSlugs.size} productos activos del catálogo, encontrados en DB: ${catalogDbProducts.length}`);
  }
  for (const slug of expectedProductSlugs) {
    if (!catalogDbProductSlugs.has(slug)) {
      errors.push(`[PRODUCTS MISSING] Producto faltante en DB: ${slug}`);
    }
  }
  for (const product of unexpectedPublicProducts) {
    errors.push(`[PRODUCTS EXTRA PUBLIC] Producto fuera del seed visible públicamente: ${product.slug}`);
  }
  const preservedHiddenRecords = dbProducts.filter(
    (product) => !expectedProductSlugs.has(product.slug) && !product.publicVisible
  );
  if (preservedHiddenRecords.length > 0) {
    console.log(`[PRODUCTS LEGACY PRESERVED] ${preservedHiddenRecords.length} registros activos ajenos al seed permanecen ocultos y preservados.`);
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
  }

  // 6. Audit ConfiguratorVersion
  const dbConfigurators = await prisma.configuratorVersion.findMany({
    where: {
      product: { active: true },
      status: { in: ['ACTIVE', 'DRAFT'] },
    },
    include: { product: { select: { slug: true, modality: true, engine: true } } },
  });

  let unexpectedActiveCount = 0;
  let configuratorStatusMismatchCount = 0;
  for (const cv of dbConfigurators) {
    const sourceVersion = configuratorSourceData.find(
      (item) => configuratorSourceKey(item) === `${cv.product.slug}|${cv.schemaVersion}`
    );
    const managedPricingProduct = ['tarjetas-vouchers','flyers-desplegables','tags-etiquetas','adhesivos-stickers','imanes-personalizados','carpetas-folders'].includes(cv.product.slug);
    if (!sourceVersion && !managedPricingProduct) {
      errors.push(`[CONFIGURATOR SOURCE MISSING] No hay definición fuente para '${cv.product.slug}|${cv.schemaVersion}'.`);
    } else if (sourceVersion && cv.status !== sourceVersion.status) {
      configuratorStatusMismatchCount += 1;
      if (cv.status === 'ACTIVE' && sourceVersion.status !== 'ACTIVE') unexpectedActiveCount += 1;
      errors.push(
        `[CONFIGURATOR STATUS MISMATCH] '${cv.product.slug}|${cv.schemaVersion}': DB='${cv.status}', seed='${sourceVersion.status}'.`
      );
    }
    if (cv.status === 'ACTIVE' && cv.product.modality !== 'CONFIGURABLE') {
      errors.push(`[CONFIGURATOR ERROR] Configurador activo para producto ${cv.product.modality} '${cv.product.slug}'`);
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

  const managedPricingSlugs = new Set([
    'tarjetas-vouchers','flyers-desplegables','tags-etiquetas','adhesivos-stickers',
    'imanes-personalizados','carpetas-folders',
  ]);
  const actualConfigKeys = new Set(
    dbConfigurators.map((cv) => cv.product.slug + '|' + cv.schemaVersion)
  );
  const expectedConfigKeys = new Set(
    configuratorSourceData
      .filter((cfg) => cfg.status === 'ACTIVE' || cfg.status === 'DRAFT')
      .filter((cfg) => productsData.some((product) => product.slug === cfg.productSlug && product.active !== false))
      .filter((cfg) => !managedPricingSlugs.has(cfg.productSlug))
      .map((cfg) => cfg.productSlug + '|' + cfg.schemaVersion)
  );

  for (const key of expectedConfigKeys) {
    if (!actualConfigKeys.has(key)) {
      errors.push(`[CONFIGURATOR MISSING] Falta versión esperada '${key}'`);
    }
  }

  for (const key of actualConfigKeys) {
    const slug = key.split('|')[0];
    if (!expectedConfigKeys.has(key) && !managedPricingSlugs.has(slug)) {
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
  const catalogProductSlugs = new Set(productsData.map((product) => product.slug));
  if (matrixProductSlugs.size !== 23) {
    errors.push(`[MATRIX PRODUCT BASE COUNT] Esperadas 23 Product Bases distintas en la matriz, encontradas ${matrixProductSlugs.size}.`);
  }
  for (const slug of matrixProductSlugs) {
    if (!catalogProductSlugs.has(slug)) {
      errors.push(`[MATRIX PRODUCT NOT IN CATALOG] La matriz referencia '${slug}', que no existe en el catálogo de productos.`);
    }
  }
  for (const product of productsData) {
    if (!Number.isInteger(product.order) || product.order < 1 || product.order > productsData.length) {
      errors.push(`[CATALOG PRODUCT ORDER] Producto con orden editorial inválido: '${product.slug}' (${product.order}).`);
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
  const relationCatalogSlugs = new Set(productsData.map((product) => product.slug));
  const relatedProductSlugs = new Set<string>();
  for (const relation of productRelationsData) {
    relatedProductSlugs.add(relation.productSlug);
    if (!relationCatalogSlugs.has(relation.productSlug)) {
      errors.push(`[PRODUCT RELATIONS UNKNOWN PRODUCT] Producto inexistente: ${relation.productSlug}`);
    }
    if (!relationCatalogSlugs.has(relation.relatedProductSlug)) {
      errors.push(`[PRODUCT RELATIONS UNKNOWN RELATED PRODUCT] Producto relacionado inexistente: ${relation.relatedProductSlug}`);
    }
    if (!expectedRelationKeys.has(relation.relatedProductSlug + '|' + relation.productSlug)) {
      errors.push(`[PRODUCT RELATIONS NOT RECIPROCAL] Falta el vínculo inverso: ${relation.relatedProductSlug}|${relation.productSlug}`);
    }
  }
  for (const product of productsData.filter((item) => item.active !== false)) {
    if (!relatedProductSlugs.has(product.slug)) {
      errors.push(`[PRODUCT RELATIONS ORPHAN PRODUCT] Producto activo sin complementos definidos: ${product.slug}`);
    }
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

  const auditTiers = (tiers: Array<{ minQty: number; maxQty: number | null; unitPrice: number }>, label: string, requireStartAtOne = true) => {
    if (tiers.length === 0) { errors.push(`[PRICING TIERS MISSING] ${label}: no tiene tiers.`); return; }
    const ordered = [...tiers].sort((a, b) => a.minQty - b.minQty);
    if (requireStartAtOne && ordered[0].minQty !== 1) errors.push(`[PRICING TIERS START] ${label}: debe comenzar en 1.`);
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
    if (cfg.pricingMode !== 'PROVIDER_FINISHED_COST' && cfg.allowedMaterials.length === 0) errors.push(`[PRICING MATERIALS MISSING] '${cfg.product.slug}' no tiene materias primas.`);
    if (cfg.quantityPresets.length === 0) errors.push(`[PRICING QUANTITIES MISSING] '${cfg.product.slug}' no tiene cantidades.`);
    if (cfg.pricingMode !== 'PROVIDER_FINISHED_COST' && cfg.sizePresets.length === 0 && !cfg.allowCustomSize) errors.push(`[PRICING SIZES MISSING] '${cfg.product.slug}' no tiene tamaños.`);

    const expectedOptionConfig = quoterOptionConfigs.find((entry) => entry.productSlug === cfg.product.slug);
    if (!expectedOptionConfig && cfg.pricingMode !== 'PROVIDER_FINISHED_COST') {
      errors.push(`[PRICING OPTIONS MISSING SEED] No hay semántica de opciones declarada para '${cfg.product.slug}'.`);
    } else if (expectedOptionConfig) {
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
      auditTiers(link.finishing.tiers, `terminación '${link.finishing.id}'`, link.finishing.costType !== 'FIXED_SETUP');
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
  console.log(`Productos fuente:    ${productsData.length} / 51`);
  console.log(`Productos catálogo:  ${dbProducts.length} / ${expectedProductSlugs.size}`);
  console.log(`Situaciones:         ${dbSituations.length} OK`);
  console.log(`Necesidades:         ${dbNeeds.length} OK`);
  const activeCount = dbConfigurators.filter((c) => c.status === 'ACTIVE').length;
  const draftCount = dbConfigurators.filter((c) => c.status === 'DRAFT').length;
  console.log(`Configuradores:      ${dbConfigurators.length} OK (${activeCount} ACTIVE, ${draftCount} DRAFT)`);
  console.log(`Offer Matrix:        EXACT MATCH (${dbEntries.length} tuplas verificadas 1:1)`);
  console.log('Packs:               0 (preparado sin packs ficticios)');
  console.log('Orphans:             0');
  console.log(`Status mismatches vs seed: ${configuratorStatusMismatchCount}`);
  console.log(`Unexpected active records: ${unexpectedActiveCount}\n`);
  console.log('🎉 Seed audit passed. FASE D SEED v1.0: OK\n');
}
