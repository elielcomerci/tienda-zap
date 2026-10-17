-- Persist editorial ordering and reconcile the active design offers in the canonical seed.
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 999;
ALTER TABLE "Product" ALTER COLUMN "sortOrder" SET DEFAULT 999;

INSERT INTO "Product" ("id","name","slug","price","catalogType","modality","engine","active","sortOrder","briefType","whatIs","purpose","includes","configurable","priceFrom","images","createdAt","updatedAt") VALUES
('prod_diseno_flyer_volante_20261017','Diseño de Flyer / Volante','diseno-flyer-volante',79000,'COSA','DIRECTO',NULL,TRUE,1,'DESIGN','Diseño de una pieza gráfica promocional lista para imprimir o publicar.','Resolver una comunicación puntual sin convertirla en un proyecto mayor.',ARRAY['Una pieza gráfica original','Una propuesta de diseño','Hasta dos rondas de ajustes','Archivo final listo para producción o publicación']::text[],ARRAY[]::text[],NULL,ARRAY[]::text[],NOW(),NOW()),
('prod_diseno_pack_graficos_redes_20261017','Diseño Pack de piezas para redes (10)','diseno-pack-graficos-redes',220000,'COSA','DIRECTO',NULL,TRUE,2,'DESIGN','Pack de diez piezas gráficas coordinadas para comunicación en redes sociales.','Tener una serie de piezas con un mismo criterio visual para comunicar durante un período.',ARRAY['10 piezas gráficas coordinadas','Criterio visual unificado a partir de una identidad existente','Hasta dos rondas de ajustes agrupados','Archivos finales listos para publicar']::text[],ARRAY[]::text[],NULL,ARRAY[]::text[],NOW(),NOW()),
('prod_diseno_menu_gastronomico_20261017','Diseño de Menú Gastronómico','diseno-menu-gastronomico',170000,'COSA','DIRECTO',NULL,TRUE,3,'DESIGN','Diseño de una carta o menú gastronómico a partir de la oferta y contenidos del negocio.','Ordenar la información y hacer más clara la elección del cliente.',ARRAY['Diseño de una carta de alcance acotado','Jerarquía y organización de contenidos provistos','Hasta dos rondas de ajustes','Archivo final listo para producción']::text[],ARRAY[]::text[],NULL,ARRAY[]::text[],NOW(),NOW()),
('prod_diseno_etiquetas_20261017','Diseño de Etiquetas','diseno-etiquetas',241485,'COSA','DIRECTO',NULL,TRUE,4,'DESIGN','Diseño de una etiqueta para producto, envase o packaging.','Resolver la pieza visual que identifica y presenta un producto.',ARRAY['Diseño de etiqueta','Preparación para producción','Archivo final listo para impresión']::text[],ARRAY[]::text[],NULL,ARRAY[]::text[],NOW(),NOW()),
('prod_diseno_cartel_afiche_20261017','Diseño de Cartel / Afiche','diseno-cartel-afiche',225386,'COSA','DIRECTO',NULL,TRUE,5,'DESIGN','Diseño de una pieza gráfica para comunicar una promoción, evento o mensaje.','Hacer visible una comunicación en un formato de cartel o afiche.',ARRAY['Una pieza gráfica','Una propuesta de diseño','Archivo final listo para producción']::text[],ARRAY[]::text[],NULL,ARRAY[]::text[],NOW(),NOW()),
('prod_diseno_carteleria_rotulos_20261017','Diseño de Cartelería / Rótulos','diseno-carteleria-rotulos',289782,'COSA','DIRECTO',NULL,TRUE,6,'DESIGN','Diseño de piezas gráficas para cartelería y rótulos comerciales.','Definir qué se comunica y cómo se ve antes de producir la cartelería.',ARRAY['Diseño de la pieza','Adaptación al formato definido','Archivo final listo para producción']::text[],ARRAY[]::text[],NULL,ARRAY[]::text[],NOW(),NOW()),
('prod_diseno_vidriera_20261017','Diseño de Vidriera','diseno-vidriera',402475,'COSA','DIRECTO',NULL,TRUE,7,'DESIGN','Diseño de una propuesta gráfica para una vidriera o escaparate comercial.','Definir qué debería ver primero quien pasa frente al local.',ARRAY['Concepto visual','Diseño de la propuesta','Archivo final listo para producción']::text[],ARRAY[]::text[],NULL,ARRAY[]::text[],NOW(),NOW()),
('prod_diseno_papeleria_corporativa_20261017','Diseño de Papelería Corporativa','diseno-papeleria-corporativa',185000,'COSA','DIRECTO',NULL,TRUE,8,'DESIGN','Diseño coordinado de piezas básicas de papelería institucional.','Mantener una misma identidad visual en los documentos y piezas de uso habitual.',ARRAY['Aplicación de identidad existente a tres piezas acordadas','Criterio visual consistente','Hasta dos rondas de ajustes','Archivos finales listos para producción']::text[],ARRAY[]::text[],NULL,ARRAY[]::text[],NOW(),NOW())
ON CONFLICT ("slug") DO UPDATE SET "sortOrder"=EXCLUDED."sortOrder";
-- Make the direct design offers discoverable through the existing Marca & Contenido category.
INSERT INTO "ProductCategory" ("productId","categoryId","sortOrder","createdAt")
SELECT p.id, c.id, p."sortOrder", NOW()
FROM "Product" p
JOIN "Category" c ON c.slug='marca-contenido'
WHERE p.slug IN (
  'diseno-flyer-volante','diseno-pack-graficos-redes','diseno-menu-gastronomico',
  'diseno-etiquetas','diseno-cartel-afiche','diseno-carteleria-rotulos',
  'diseno-vidriera','diseno-papeleria-corporativa'
)
ON CONFLICT ("productId","categoryId") DO NOTHING;


UPDATE "Product" SET "sortOrder" = CASE "slug"
  WHEN 'diseno-flyer-volante' THEN 1 WHEN 'diseno-pack-graficos-redes' THEN 2
  WHEN 'diseno-menu-gastronomico' THEN 3 WHEN 'diseno-etiquetas' THEN 4
  WHEN 'diseno-cartel-afiche' THEN 5 WHEN 'diseno-carteleria-rotulos' THEN 6
  WHEN 'diseno-vidriera' THEN 7 WHEN 'diseno-papeleria-corporativa' THEN 8
  WHEN 'flyers-desplegables' THEN 9 WHEN 'adhesivos-stickers' THEN 10
  WHEN 'imanes-personalizados' THEN 11 WHEN 'menus-cartas' THEN 12
  WHEN 'tarjetas-vouchers' THEN 13 WHEN 'talonarios-formularios' THEN 14
  WHEN 'tags-etiquetas' THEN 15 WHEN 'bolsas-contenedores' THEN 16
  WHEN 'fajas-envoltorios' THEN 17 WHEN 'cajas-personalizadas' THEN 18
  WHEN 'carpetas-folders' THEN 19 WHEN 'carteleria-ploteo' THEN 20
  WHEN 'corporeos-marquesinas' THEN 21 WHEN 'senaletica-placas' THEN 22
  WHEN 'indumentaria-textil' THEN 23 WHEN 'individuales-posavasos' THEN 24
  WHEN 'expositores-stands' THEN 25 WHEN 'objetos-regaleria' THEN 26
  WHEN 'sitios-web-catalogos-digitales' THEN 27 WHEN 'anuncios-campanas' THEN 28
  WHEN 'sistema-identidad' THEN 29 WHEN 'produccion-audiovisual' THEN 30
  WHEN 'asistentes-bots' THEN 31 WHEN 'operaciones-consultoria' THEN 32
  WHEN 'sistema-captacion-eventos' THEN 33 ELSE 999 END;

-- Expositores has a validated finished-cost matrix; persist its tested schema and pricing.
UPDATE "Product" SET "modality"='CONFIGURABLE', "sortOrder"=25, "updatedAt"=NOW()
WHERE "slug"='expositores-stands';
UPDATE "Product" SET "modality"='CONFIGURABLE', "updatedAt"=NOW()
WHERE "slug"='carpetas-folders';
UPDATE "ConfiguratorVersion" SET status='ARCHIVED', "updatedAt"=NOW()
WHERE "productId"=(SELECT id FROM "Product" WHERE slug='expositores-stands')
  AND "schemaVersion"='1.0' AND status='DRAFT';

INSERT INTO "ConfiguratorVersion" ("id","productId","schemaVersion","status","schema","compatibility","pricing","createdAt","updatedAt")
SELECT 'cfg_expositores_stands_1_2_20261017', p.id, '1.2', 'ACTIVE',
  '{"engine":"PRESENCIA_FISICA","productSlug":"expositores-stands","fields":{"model":{"label":"Modelo","type":"select","required":true,"default":"double_90x190","options":[{"id":"double_90x190","label":"Portabanner doble tensor 90 × 190 cm"},{"id":"rollup_85x200","label":"Roll Up retráctil 85 × 200 cm"}]},"printing":{"label":"Impresión","type":"select","required":true,"default":"latex","options":[{"id":"latex","label":"Impresión látex"},{"id":"uv","label":"Impresión UV"}]},"quantity":{"label":"Cantidad","type":"quantity_selector","required":true,"default":1,"options":[{"value":1,"label":"1 unidad"},{"value":2,"label":"2 unidades"},{"value":3,"label":"3 unidades"},{"value":5,"label":"5 unidades"},{"value":10,"label":"10 unidades"}]}}}'::jsonb, '{"uiRules":[]}'::jsonb, '{"engine":"PROVIDER_FINISHED_COST","commercialPricingPolicy":{"version":1,"mode":"MARKUP","percentage":35,"vatRatePercent":21},"providerFinishedCostMatrix":{"resolver":{"type":"PORTABANNER_FINISHED"},"currency":"ARS","taxIncluded":false,"source":"CATALOGO_GRAN_FORMATO_2026_07","portabanner":{"kind":"PRODUCTO_TERMINADO","note":"Precio fuente combinado: estructura + impresión. No sumar estructura nuevamente.","frontMaterial":"FRONT_13OZ","items":{"simple_60x150":{"structure":16500,"latex":24700,"ecosolvent":28500,"uv":23500},"double_90x190":{"structure":32000,"latex":44800,"ecosolvent":47000,"uv":54700},"eco_double_90x190":{"structure":20900,"latex":43000,"ecosolvent":33900,"uv":36100},"simple_90x190":{"structure":21000,"latex":36500,"uv":44700},"eco_simple_90x190":{"structure":16000,"latex":40100,"uv":31500},"vertical_double_150x200":{"structure":49000,"latex":72600,"ecosolvent":75850,"uv":90500},"three_200x200":{"structure":75000,"latex":110200,"uv":104900},"eco_three_200x200":{"structure":59000,"latex":97200,"uv":92100},"four_300x200":{"structure":92000,"latex":141400,"uv":137400},"eco_four_300x200":{"structure":67000,"latex":125000,"uv":116900},"rollup_85x200":{"structure":26600,"latex":53400,"uv":43500,"assembly":3000},"fly_banner_50x260":{"structure":32000,"latex":98600},"drop_banner_60x250":{"structure":32000,"latex":98600},"drop_banner_gota_eco_73x220":{"structure":18000,"latex":59800},"cross_base":{"standalone":15000,"combo":9700}}}}}'::jsonb, NOW(), NOW()
FROM "Product" p WHERE p.slug='expositores-stands'
ON CONFLICT ("productId","schemaVersion") DO UPDATE SET
  status='ACTIVE', schema=EXCLUDED.schema, compatibility=EXCLUDED.compatibility,
  pricing=EXCLUDED.pricing, "updatedAt"=NOW();
