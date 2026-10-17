INSERT INTO "Category" ("id","name","slug","description","active","sortOrder","createdAt","updatedAt")
VALUES
('cat-marca-contenido','Marca & Contenido','marca-contenido','Identidad de marca y producción de contenidos.',true,70,NOW(),NOW()),
('cat-eventos-captacion','Eventos & Captación','eventos-captacion','Experiencias presenciales y generación de contactos.',true,80,NOW(),NOW()),
('cat-estrategia-operaciones','Estrategia & Operaciones','estrategia-operaciones','Diagnóstico, procesos y mejora comercial.',true,90,NOW(),NOW()),
('cat-regaleria-merchandising','Regalería & Merchandising','regaleria-merchandising','Objetos promocionales y regalos de marca.',true,100,NOW(),NOW())
ON CONFLICT ("slug") DO UPDATE SET "name"=EXCLUDED."name","description"=EXCLUDED."description","active"=true,"sortOrder"=EXCLUDED."sortOrder","updatedAt"=NOW();

INSERT INTO "ProductCategory" ("productId","categoryId","sortOrder","createdAt")
SELECT p.id, c.id, 0, NOW()
FROM "Product" p
JOIN "Category" c ON c.slug = CASE p.slug
  WHEN 'cajas-personalizadas' THEN 'impresos-packaging'
  WHEN 'objetos-regaleria' THEN 'regaleria-merchandising'
  WHEN 'sistema-identidad' THEN 'marca-contenido'
  WHEN 'produccion-audiovisual' THEN 'marca-contenido'
  WHEN 'operaciones-consultoria' THEN 'estrategia-operaciones'
  WHEN 'sistema-captacion-eventos' THEN 'eventos-captacion'
END
WHERE p.active = true
AND p.slug IN ('cajas-personalizadas','objetos-regaleria','sistema-identidad','produccion-audiovisual','operaciones-consultoria','sistema-captacion-eventos')
ON CONFLICT ("productId","categoryId") DO NOTHING;
