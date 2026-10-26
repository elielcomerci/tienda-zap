# Activación del catálogo público — Tienda ZAP

**Estado:** implementación preparada en rama; pendiente de validación automatizada y activación.
**Rama:** `feat/catalogo-oferta-zap-20261026`
**Fecha:** 2026-10-26
**No se hizo merge a main ni despliegue de producción.**

## Qué cambia

El catálogo público deja de ser equivalente al inventario completo. Cada producto tiene dos decisiones separadas:
- `active`: estado operativo existente.
- `publicVisible`: si puede aparecer en páginas, listados y recomendaciones públicas.
- `publicGroup`: puerta comercial donde se presenta: `VENTAS`, `MARCA`, `EXPERIENCIA` o `PROYECTOS`.

La visibilidad pública nueva tiene valor predeterminado `false`. Un producto nuevo o duplicado no se publica por accidente. El formulario de administración permite activar la visibilidad y elegir una puerta; no permite publicar un producto sin asignarlo a una de las cuatro puertas.

## Puertas públicas

### VENTAS — Vender y conseguir más clientes (6)
- Anuncios & Campañas
- Sistema de Captación para Eventos
- Landing Pages
- Tiendas Online
- Catálogos Digitales
- Webs para Eventos y Reservas

### MARCA — Marca y comunicación (22)
- Tarjetas & Vouchers
- Flyers & Desplegables
- Tags & Etiquetas
- Adhesivos & Stickers
- Fajas & Envoltorios
- Bolsas & Contenedores
- Cajas Personalizadas
- Menús & Cartas
- Cartelería & Ploteo
- Corpóreos & Marquesinas
- Señalética & Placas
- Expositores & Stands
- Sistema de Identidad
- Diseño de Flyer / Volante
- Diseño de Cartel / Afiche
- Diseño Pack de piezas para redes (10)
- Diseño de Cartelería / Rótulos
- Diseño de Menú Gastronómico
- Diseño de Vidriera
- Diseño de Etiquetas
- Diseño de Papelería Corporativa
- Diseño de Presentaciones Digitales

### EXPERIENCIA — Experiencia digital y funcionamiento (8)
- Asistentes & Bots
- Sitios Web Institucionales
- Rediseño y Optimización Web
- Mantenimiento Web
- Automatizaciones Comerciales
- Formularios y Cotizadores Digitales
- Integraciones Digitales
- Recursos Digitales a Medida

### PROYECTOS — Acceso secundario (4)
- Producción Audiovisual
- Jingle Publicitario
- Identidad Sonora
- Música Original para Cine y Audiovisual

Los proyectos de esta última puerta no aparecen en el listado general. Se muestran cuando la persona elige explícitamente “Tengo un proyecto más específico”.

## Ocultos de la tienda pública (12)

Siguen siendo registros activos para gestión interna y no se borran de la base:
- Sitios web y catálogos digitales (ficha paraguas redundante frente a ofertas más concretas)
- Operaciones & Consultoría (demasiado genérica para la promesa pública actual)
- Imanes personalizados
- Talonarios & Formularios
- Carpetas & Folders
- Individuales & Posavasos
- Indumentaria & Textil
- Objetos & Regalería
- Música Original para Videojuegos
- Diseño Sonoro y Efectos
- Música e Identidad Sonora para Podcasts

La ocultación no niega la capacidad de ejecución. Evita que estas prestaciones compitan en la presentación principal o se conviertan en una oferta pública sin una tesis comercial clara.

## Cambios técnicos

- `Product.publicVisible` y `Product.publicGroup` en Prisma.
- Migración `20261026100000_curated_public_product_visibility`: publica la selección aprobada y deja ocultos los demás registros existentes.
- Seed explícito de visibilidad y grupo para los 51 productos actuales.
- Listados, páginas de detalle y recomendaciones públicas respetan la visibilidad; las fichas se generan bajo demanda para evitar consultas de base de datos durante el build.
- La administración permite cambiar la visibilidad y la puerta.
- La página inicial reemplaza la división plana “Productos / Desarrollos a medida” por tres entradas basadas en necesidades y una vía secundaria para proyectos específicos.
- El grupo elegido se conserva al buscar, filtrar, entrar en una ficha y volver a navegar.

## Antes de activar

1. Ejecutar `npm run db:generate`.
2. Ejecutar `npm run typecheck`.
3. Ejecutar `npm run build` (incluye `prebuild` y sus pruebas).
4. Aplicar la migración con el procedimiento normal del entorno.
5. Ejecutar el seed de productos y verificar que el resultado sea: 40 visibles, 11 ocultos; 22 MARCA, 6 VENTAS, 8 EXPERIENCIA y 4 PROYECTOS.
6. Probar que un producto oculto no aparece en `/productos`, no abre por su slug público y no se recomienda como relacionado.
7. Probar las cuatro puertas, búsqueda, filtros, fichas y navegación móvil.
8. Revisar en producción los precios públicos e IVA ya existentes; esta modificación no cambia importes ni aprueba nuevas tarifas.

## Fuera de alcance

No se cambiaron importes, no se publicaron nuevas tarifas, no se borraron productos, no se modificó la matriz de necesidades/rubros, no se hizo merge a `main` y no se desplegó producción.
