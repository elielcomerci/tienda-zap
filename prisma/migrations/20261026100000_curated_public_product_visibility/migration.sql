ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "publicVisible" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "publicGroup" TEXT;

UPDATE "Product"
SET "publicVisible" = true,
    "publicGroup" = CASE "slug"
    WHEN 'anuncios-campanas' THEN 'VENTAS'
    WHEN 'sistema-captacion-eventos' THEN 'VENTAS'
    WHEN 'landing-pages' THEN 'VENTAS'
    WHEN 'tiendas-online' THEN 'VENTAS'
    WHEN 'catalogos-digitales' THEN 'VENTAS'
    WHEN 'webs-eventos-reservas' THEN 'VENTAS'
    WHEN 'tarjetas-vouchers' THEN 'MARCA'
    WHEN 'flyers-desplegables' THEN 'MARCA'
    WHEN 'tags-etiquetas' THEN 'MARCA'
    WHEN 'adhesivos-stickers' THEN 'MARCA'
    WHEN 'fajas-envoltorios' THEN 'MARCA'
    WHEN 'bolsas-contenedores' THEN 'MARCA'
    WHEN 'cajas-personalizadas' THEN 'MARCA'
    WHEN 'menus-cartas' THEN 'MARCA'
    WHEN 'carteleria-ploteo' THEN 'MARCA'
    WHEN 'corporeos-marquesinas' THEN 'MARCA'
    WHEN 'senaletica-placas' THEN 'MARCA'
    WHEN 'expositores-stands' THEN 'MARCA'
    WHEN 'sistema-identidad' THEN 'MARCA'
    WHEN 'diseno-flyer-volante' THEN 'MARCA'
    WHEN 'diseno-cartel-afiche' THEN 'MARCA'
    WHEN 'diseno-pack-graficos-redes' THEN 'MARCA'
    WHEN 'diseno-carteleria-rotulos' THEN 'MARCA'
    WHEN 'diseno-menu-gastronomico' THEN 'MARCA'
    WHEN 'diseno-vidriera' THEN 'MARCA'
    WHEN 'diseno-etiquetas' THEN 'MARCA'
    WHEN 'diseno-papeleria-corporativa' THEN 'MARCA'
    WHEN 'diseno-presentaciones-digitales' THEN 'MARCA'
    WHEN 'asistentes-bots' THEN 'EXPERIENCIA'
    WHEN 'sitios-web-institucionales' THEN 'EXPERIENCIA'
    WHEN 'rediseno-web-optimizacion' THEN 'EXPERIENCIA'
    WHEN 'mantenimiento-web' THEN 'EXPERIENCIA'
    WHEN 'automatizaciones-comerciales' THEN 'EXPERIENCIA'
    WHEN 'formularios-cotizadores-digitales' THEN 'EXPERIENCIA'
    WHEN 'integraciones-digitales' THEN 'EXPERIENCIA'
    WHEN 'recursos-digitales-a-medida' THEN 'EXPERIENCIA'
    WHEN 'produccion-audiovisual' THEN 'PROYECTOS'
    WHEN 'jingle-publicitario' THEN 'PROYECTOS'
    WHEN 'identidad-sonora' THEN 'PROYECTOS'
    WHEN 'musica-original-cine' THEN 'PROYECTOS'
    ELSE NULL
    END
WHERE "slug" IN ('anuncios-campanas', 'sistema-captacion-eventos', 'landing-pages', 'tiendas-online', 'catalogos-digitales', 'webs-eventos-reservas', 'tarjetas-vouchers', 'flyers-desplegables', 'tags-etiquetas', 'adhesivos-stickers', 'fajas-envoltorios', 'bolsas-contenedores', 'cajas-personalizadas', 'menus-cartas', 'carteleria-ploteo', 'corporeos-marquesinas', 'senaletica-placas', 'expositores-stands', 'sistema-identidad', 'diseno-flyer-volante', 'diseno-cartel-afiche', 'diseno-pack-graficos-redes', 'diseno-carteleria-rotulos', 'diseno-menu-gastronomico', 'diseno-vidriera', 'diseno-etiquetas', 'diseno-papeleria-corporativa', 'diseno-presentaciones-digitales', 'asistentes-bots', 'sitios-web-institucionales', 'rediseno-web-optimizacion', 'mantenimiento-web', 'automatizaciones-comerciales', 'formularios-cotizadores-digitales', 'integraciones-digitales', 'recursos-digitales-a-medida', 'produccion-audiovisual', 'jingle-publicitario', 'identidad-sonora', 'musica-original-cine');

-- Seed the first approved portfolio sample without overwriting other media/configuration.
UPDATE "Product"
SET "mediaList" = (
  SELECT COALESCE(jsonb_agg(entry), '[]'::jsonb)
  FROM jsonb_array_elements(
    CASE
      WHEN jsonb_typeof("Product"."mediaList") = 'array' THEN "Product"."mediaList"
      ELSE '[]'::jsonb
    END
  ) AS items(entry)
  WHERE COALESCE(entry->>'type', '') <> 'SOUNDCLOUD'
) || jsonb_build_array(jsonb_build_object(
  'id', 'soundcloud-1',
  'type', 'SOUNDCLOUD',
  'url', 'https://soundcloud.com/eliel-comerci/sets/music-for-films-and-tv',
  'title', 'Music for Films and TV'
))
WHERE "slug" = 'musica-original-cine';

CREATE INDEX IF NOT EXISTS "Product_publicVisible_publicGroup_active_idx" ON "Product"("publicVisible", "publicGroup", "active");
