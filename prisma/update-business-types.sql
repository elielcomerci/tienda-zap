-- Actualiza los nombres de los BusinessType en tienda-zap
-- Los slugs NO cambian para no romper URLs existentes
-- Solo cambia el campo `name` visible al usuario

UPDATE "BusinessType" SET name = 'Wellness'             WHERE slug = 'gym-y-yoga';
UPDATE "BusinessType" SET name = 'Comercios & Retail'   WHERE slug = 'retail' OR slug = 'comercios-retail';
UPDATE "BusinessType" SET name = 'Eventos & Experiencias' WHERE slug = 'eventos';
-- Los demás ya tienen el nombre correcto:
-- Gastronomía, Moda & Showrooms, Inmobiliarias, Belleza & Salud
