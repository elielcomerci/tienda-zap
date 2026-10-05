# Migración UI al dominio comercial v1

El esquema Prisma actual es la fuente de verdad. Este documento registra los
reemplazos necesarios en la aplicación; no autoriza a restaurar modelos o
campos retirados para conservar una interfaz anterior.

| Dominio retirado | Consumidor anterior | Equivalente actual | Decisión de adaptación |
| --- | --- | --- | --- |
| `Category` / `categoryId` | Filtros y etiquetas del catálogo; administración de categorías; alcance de materiales y promociones | `Product.engine` + `Product.modality` | La UI pública agrupa por familia comercial derivada. Las categorías administrativas se retiran; cotizador y promociones deben referir productos o motores, nunca IDs de categoría. |
| `Intention` | Navegación editorial, cabecera y administración | `Situation` | Las URLs y textos pasan a situaciones. No se conserva una segunda taxonomía editorial. |
| `Product.needs` y relaciones directas de situación/rubro | Descubrimiento y búsqueda de productos | `OfferMatrixEntry` | Todo filtrado editorial consulta la tupla `BusinessType → Situation → Need → Product`. |
| `Product.isCombo`, precio dinámico y rubros objetivo | Combos dentro del catálogo de productos | `Pack` / `PackItem` | Los packs son una entidad separada. Como v1 tiene cero packs, la UI no presenta combos comprables. |
| `category.isService` | Flujo de archivos, CTA y etiquetas de "servicio" | `modality` + `engine` | La aplicación deriva el comportamiento: `CONSULTAR`, `DIGITAL` y `CAMPANAS` se atienden como servicios; la obligación de archivo se evalúa por producto, no por categoría. |
| `conversionType`, `taxonomy`, `configuratorVersion` en `Product` | CTA y fichas de producto | `modality`, `engine`, `ConfiguratorVersion` | La ficha toma modalidad y motor del Product Base. Una versión de configurador se consulta como relación versionada, nunca como string en `Product`. |

## Orden de trabajo

1. Consultas públicas, descubrimiento y detalle de Product Base.
2. Carrito, checkout, APIs y acciones de servidor.
3. Administración: productos, descubrimiento, cotizador y promociones.
4. Regenerar Prisma, ejecutar seed y auditoría en una base de prueba, luego typecheck y build.

## Límite actual

`PRESENCIA_FISICA` permanece en `DRAFT`. Esta migración no agrega opciones,
reglas ni pricing para Cartelería, Corpóreos, Señalética o Expositores.
