-- Persist editorial ordering and reconcile the active design offers in the canonical seed.
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;

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

-- Expositores is consultation-led until its full configurator matrix is persisted.
UPDATE "Product" SET "modality"='CONSULTAR', "sortOrder"=25, "updatedAt"=NOW()
WHERE "slug"='expositores-stands';

-- Carpetas has an active, versioned price matrix and can be configured directly.
UPDATE "Product" SET "modality"='CONFIGURABLE', "updatedAt"=NOW()
WHERE "slug"='carpetas-folders';
UPDATE "ConfiguratorVersion" SET status='ARCHIVED', "updatedAt"=NOW()
WHERE "productId"=(SELECT id FROM "Product" WHERE slug='expositores-stands')
  AND "schemaVersion"='1.0' AND status='DRAFT';
