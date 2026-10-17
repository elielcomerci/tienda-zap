-- Consolidate the lavadero-specific SKU under the Talonarios & Formularios family.
-- Preserve the legacy product and configurator as inactive records for historical references.
INSERT INTO "Product" (
  id, name, slug, description, price, "priceFrom", modality, engine, images, active, stock,
  "briefType", "mediaType", "mediaUrl", "mediaTitle", "mediaList", "whatIs", purpose, includes,
  configurable, "consultationNote", "creditDownPaymentPercent", "createdAt", "updatedAt", "catalogType"
)
SELECT
  'prod_talonarios_formularios_20261017', 'Talonarios & Formularios', 'talonarios-formularios',
  'Talonarios numerados, bonos duplicados y formularios impresos para registrar operaciones y controlar entregas.',
  p.price, NULL, p.modality, p.engine, p.images, TRUE, 0,
  p."briefType", p."mediaType", p."mediaUrl", p."mediaTitle", p."mediaList",
  'Talonarios numerados, bonos duplicados y formularios impresos para registrar operaciones y controlar entregas.',
  'Ordenar registros, entregas y comprobantes del negocio.',
  ARRAY['Bonos numerados para lavaderos como primera opción configurable']::text[],
  ARRAY['Tipo de talonario','Formato','Impresión','Cantidad','Numeración y duplicado según necesidad']::text[],
  'La configuración publicada cubre bonos numerados para lavaderos; otros formatos se incorporarán cuando tengan matriz comercial validada.',
  p."creditDownPaymentPercent", NOW(), NOW(), p."catalogType"
FROM "Product" p
WHERE p.slug = 'bonos-para-lavaderos'
  AND NOT EXISTS (SELECT 1 FROM "Product" WHERE slug = 'talonarios-formularios');

INSERT INTO "ConfiguratorVersion" (
  id, "productId", "schemaVersion", status, schema, compatibility, pricing, "createdAt", "updatedAt"
)
SELECT
  'cfg_talonarios_formularios_20261017', np.id, cv."schemaVersion", cv.status,
  jsonb_set(
    jsonb_set(cv.schema, '{productSlug}', '"talonarios-formularios"'::jsonb, TRUE),
    '{fields,productType}',
    '{"label":"Tipo de talonario","type":"select","required":true,"default":"bonos_lavadero","options":[{"id":"bonos_lavadero","label":"Bonos numerados para lavaderos"}]}'::jsonb,
    TRUE
  ),
  cv.compatibility, cv.pricing, NOW(), NOW()
FROM "Product" oldp
JOIN "ConfiguratorVersion" cv ON cv."productId" = oldp.id AND cv.status = 'ACTIVE'
JOIN "Product" np ON np.slug = 'talonarios-formularios'
WHERE oldp.slug = 'bonos-para-lavaderos'
  AND NOT EXISTS (SELECT 1 FROM "ConfiguratorVersion" WHERE "productId" = np.id AND "schemaVersion" = cv."schemaVersion");

INSERT INTO "ProductCategory" ("productId", "categoryId", "sortOrder")
SELECT p.id, c.id, 0
FROM "Product" p CROSS JOIN "Category" c
WHERE p.slug = 'talonarios-formularios' AND c.slug = 'talonarios-formularios'
  AND NOT EXISTS (
    SELECT 1 FROM "ProductCategory" pc
    WHERE pc."productId" = p.id AND pc."categoryId" = c.id
  );

UPDATE "Product"
SET active = FALSE, "updatedAt" = NOW()
WHERE slug = 'bonos-para-lavaderos' AND active = TRUE;

-- Do not advertise an interactive configurator until its active schema and pricing
-- are published. Keep the product visible as a consultation-led offer meanwhile.
UPDATE "Product"
SET modality = 'CONSULTAR', "updatedAt" = NOW()
WHERE active = TRUE
  AND slug IN (
    'anuncios-campanas',
    'asistentes-bots',
    'carteleria-ploteo',
    'corporeos-marquesinas',
    'indumentaria-textil',
    'senaletica-placas',
    'sitios-web-catalogos-digitales',
    'objetos-regaleria'
  )
  AND modality <> 'CONSULTAR';
