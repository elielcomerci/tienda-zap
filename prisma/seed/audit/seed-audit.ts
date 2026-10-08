import { PrismaClient } from '@prisma/client';
import { businessTypesData } from '../data/02-business-types';
import { productsData } from '../data/05-products';
import { situationsData } from '../data/03-situations';
import { needsData } from '../data/04-needs';
import { offerMatrixData } from '../data/07-offer-matrix';
import { initialQuoterConfigs } from '../data/09-quoter-config';

export async function runSeedAudit(prisma: PrismaClient): Promise<void> {
  console.log('\n========================================');
  console.log('AUDITORÍA AUTOMÁTICA SEED v1.0 (FASE D)');
  console.log('========================================\n');

  const errors: string[] = [];

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
  const dbSituations = await prisma.situation.findMany({ select: { slug: true } });
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
  const dbNeeds = await prisma.need.findMany({ select: { slug: true } });
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
    select: { id: true, slug: true, modality: true, engine: true },
  });
  const expectedProductSlugs = new Set(productsData.map((p) => p.slug));
  const actualProductSlugs = new Set(dbProducts.map((p) => p.slug));

  if (dbProducts.length !== productsData.length) {
    errors.push(`[PRODUCTS COUNT] Esperados ${productsData.length}, encontrados en DB: ${dbProducts.length}`);
  }
  for (const slug of expectedProductSlugs) {
    if (!actualProductSlugs.has(slug)) {
      errors.push(`[PRODUCTS MISSING] Product Base faltante en DB: ${slug}`);
    }
  }
  for (const slug of actualProductSlugs) {
    if (!expectedProductSlugs.has(slug)) {
      errors.push(`[PRODUCTS EXTRA] Product Base no esperado en DB: ${slug}`);
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
    include: { product: { select: { slug: true, modality: true, engine: true } } },
  });

  for (const cv of dbConfigurators) {
    if (cv.product.modality !== 'CONFIGURABLE') {
      errors.push(`[CONFIGURATOR ERROR] ConfiguratorVersion creado para producto ${cv.product.modality} '${cv.product.slug}'`);
    }
    if (cv.schemaVersion !== '1.0') {
      errors.push(`[CONFIGURATOR ERROR] schemaVersion incorrecto '${cv.schemaVersion}' en '${cv.product.slug}'`);
    }
  }

  const configurableSlugs = new Set(
    productsData.filter((p) => p.modality === 'CONFIGURABLE').map((p) => p.slug)
  );
  const actualConfigSlugs = new Set(dbConfigurators.map((cv) => cv.product.slug));
  for (const cSlug of configurableSlugs) {
    if (!actualConfigSlugs.has(cSlug)) {
      errors.push(`[CONFIGURATOR MISSING] Falta versión 1.0 para producto configurable '${cSlug}'`);
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

  const expectedTupleKeys = new Set(
    offerMatrixData.map(
      (t) => `${t.businessTypeSlug}|${t.situationSlug}|${t.needSlug}|${t.productSlug}`
    )
  );

  const actualTupleKeys = new Set(
    dbEntries.map(
      (e) => `${e.businessType.slug}|${e.situation.slug}|${e.need.slug}|${e.product.slug}`
    )
  );

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

  // 8. Audit Packs
  const packCount = await prisma.pack.count();
  const packItemCount = await prisma.packItem.count();
  if (packCount !== 0 || packItemCount !== 0) {
    errors.push(`[PACKS ERROR] En v1.0 los packs deben ser 0. Encontrados: ${packCount} packs, ${packItemCount} items.`);
  }

  // 9. Audit Pricing Infrastructure
  const dbPricingConfigs = await prisma.productQuoterConfig.findMany({
    include: {
      product: { select: { slug: true, modality: true, engine: true } },
      allowedMaterials: { include: { rawMaterial: { include: { tiers: true } } } },
      finishings: { include: { finishing: { include: { tiers: true } } } },
      quantityPresets: true,
      sizePresets: true,
    },
  });

  const expectedPricingSlugs = new Set(initialQuoterConfigs.map((c) => c.productSlug));
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
  console.log(`Situaciones:         ${dbSituations.length} OK`);
  console.log(`Necesidades:         ${dbNeeds.length} OK`);
  const activeCount = dbConfigurators.filter((c) => c.status === 'ACTIVE').length;
  const draftCount = dbConfigurators.filter((c) => c.status === 'DRAFT').length;
  console.log(`Configuradores:      ${dbConfigurators.length} OK (${activeCount} ACTIVE, ${draftCount} DRAFT)`);
  console.log(`Offer Matrix:        EXACT MATCH (${dbEntries.length} tuplas verificadas 1:1)`);
  console.log('Packs:               0 (preparado sin packs ficticios)');
  console.log('Orphans:             0');
  console.log('Unexpected records:  0\n');
  console.log('🎉 Seed audit passed. FASE D SEED v1.0: OK\n');
}
