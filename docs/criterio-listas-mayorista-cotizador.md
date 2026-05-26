# Criterio para listas mayoristas, materiales y productos

Fecha: 2026-05-25

## Objetivo

Usar las listas de precios del mayorista como fuente comercial ordenada, sin convertir cada item de proveedor en una materia prima del cotizador.

La regla central:

- La lista mayorista se guarda como catalogo proveedor.
- El cotizador usa solo insumos productivos reales.
- La tienda vende productos simples, configurables o cotizables.

## Fuentes actuales

Archivos en `/listas`:

- `lista-print.pdf`
- `lista-low.pdf`
- `lista-mega.pdf`
- `lista-post.pdf`

Estas listas deben tratarse como fuente externa versionada. No conviene copiar sus items uno a uno como materiales si el item representa un producto terminado.

## Capas de datos

### 1. Item de proveedor

Representa exactamente lo que aparece en la lista mayorista.

Debe preservar:

- Proveedor o lista origen.
- Familia/rubro del proveedor.
- Codigo interno si existe.
- Nombre original.
- Descripcion original.
- Presentacion.
- Medida.
- Unidad comercial.
- Precio mayorista.
- Moneda.
- Fecha/version de lista.
- Estado: activo, discontinuado, revisar.

Ejemplos:

- Carpeta A4 cristal.
- Carpeta A4 con tapa.
- Broche plastico.
- Sobre bolsa.
- Resma.
- Lomo oficio.

Estos items sirven para compra, reposicion y referencia de costo, pero no todos son materias primas del cotizador.

### 2. Materia prima de produccion

Representa un insumo que el sistema puede consumir para fabricar/cotizar.

Debe ser algo medible o consumible:

- Pliego.
- Metro lineal.
- Metro cuadrado.
- Unidad base.
- Kilo.
- Litro.
- Componente.

Ejemplos correctos:

- Papel ilustracion 300 g 32x47.
- Vinilo impreso por metro lineal.
- Lona front por m2.
- DTF por metro lineal.
- Remera lisa.
- PVC espumado 3 mm.
- Acrilico.
- Iman.
- Liston de madera.
- Cano cuadrado.
- Modulo LED.
- Fuente LED.

No deben cargarse aca productos terminados como si fueran insumos, salvo que se usen como base de transformacion.

Ejemplo aceptable:

- Remera lisa como materia prima, porque se transforma con DTF, sublimacion o vinilo.

Ejemplo no aceptable:

- Carpeta A4 como cientos de materias primas si se vende como producto simple de libreria.

### 3. Producto de tienda

Representa lo que compra el cliente.

Puede ser:

- Producto simple: precio fijo, stock simple.
- Producto configurable: variantes de venta, stock, fotos y SKU.
- Producto cotizable: usa materias primas, medidas, terminaciones y cantidades.

Ejemplos:

- Carpetas A4: producto simple o configurable muy acotado.
- Tarjetas personales: producto cotizable o configurable por papel, impresion, terminacion y cantidad.
- Remeras personalizadas: configurable por color/talle y cotizable por tecnica/ubicacion/tamano.
- Carteleria: cotizable por sustrato, ancho, alto, estructura, iluminacion y terminaciones.

## Regla para Carpetas A4

Carpetas A4 no debe explotar como material.

Modelo recomendado:

- Si se vende tal cual viene del mayorista: Producto simple o configurable.
- Si tiene pocas opciones reales: Producto configurable.
- Si se imprime/personaliza: Producto cotizable que usa como base una materia prima "Carpeta A4 base" y suma impresion/terminacion.

No crear una materia prima por cada variante comercial del mayorista.

## Clasificacion al importar listas

Cada item mayorista debe pasar por una decision:

| Decision | Uso |
| --- | --- |
| `PROVIDER_ONLY` | Solo referencia de compra, no aparece en tienda ni cotizador. |
| `RAW_MATERIAL` | Insumo productivo disponible para cotizar. |
| `SIMPLE_PRODUCT` | Producto vendible directo. |
| `CONFIGURABLE_PRODUCT` | Producto con opciones/variantes de venta. |
| `PRODUCT_BASE_INPUT` | Producto comprado que se usa como base para personalizar. |
| `IGNORE` | No aplica o esta duplicado. |

## Normalizacion de nombres

Guardar siempre dos nombres:

- Nombre original del proveedor.
- Nombre normalizado ZAP.

Ejemplo:

- Original: `CARPETA A4 CRISTAL TRANSPARENTE X 10`
- Normalizado: `Carpeta A4 cristal transparente`

El nombre original permite auditar y volver a comparar listas. El normalizado permite buscar, filtrar y vender sin ruido.

## Precios

Los precios del mayorista no deben pisar automaticamente precios de venta.

Flujo recomendado:

1. Se importa precio proveedor.
2. Se actualiza costo base.
3. El cotizador calcula precio sugerido con margen.
4. El admin decide aplicar o no aplicar a producto/variante.

## Cambios futuros recomendados en base de datos

Crear entidades separadas:

- `Supplier`
- `SupplierPriceList`
- `SupplierCatalogItem`
- `SupplierCatalogItemPrice`
- Relacion opcional `SupplierCatalogItem -> RawMaterial`
- Relacion opcional `SupplierCatalogItem -> Product`

Campos clave para `SupplierCatalogItem`:

- `supplierId`
- `priceListId`
- `externalCode`
- `originalName`
- `normalizedName`
- `family`
- `subcategory`
- `unit`
- `width`
- `height`
- `quantityPack`
- `currency`
- `cost`
- `classification`
- `active`
- `needsReview`

## Proximo paso

Antes de limpiar materiales:

1. Extraer o transcribir estructura de las listas.
2. Agrupar items por familia del proveedor.
3. Marcar carpetas A4 y similares como productos simples/configurables, no materias primas.
4. Dejar en materias primas solo insumos productivos reales.
5. Conectar productos cotizables a materiales normalizados.

