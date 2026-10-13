# Auditoría de precios del seed — Tienda ZAP

**Fecha:** 2026-10-13  
**Rama:** `audit/precios-seed-oct-2026`  
**Alcance:** auditoría de fuentes de costo, lógica de margen, IVA y competitividad.  
**Estado:** diagnóstico inicial; no modifica precios ni configura productos.

## 1. Hallazgo de alcance: el seed actual tiene 31 productos

El archivo `prisma/seed/data/05-products.ts` de `main` contiene **31 productos**, no 23. La referencia de 23 corresponde a una foto anterior del seed. En los 31 registros revisados, `priceFrom` figura como `null`; eso no significa que todos deban tener un precio fijo, porque algunos se resuelven por matriz/configurador y otros requieren consulta, pero sí obliga a comprobar que la interfaz no prometa precios que el modelo no puede calcular.

### Inventario del seed

| # | Producto | Modalidad | Motor declarado | Estado de precio inicial |
|---:|---|---|---|---|
| 1 | Tarjetas & Vouchers | Configurable | Impresos & packaging | Matriz de proveedor |
| 2 | Flyers & Desplegables | Configurable | Impresos & packaging | Matrices offset y digital |
| 3 | Tags & Etiquetas | Configurable | Impresos & packaging | Cotizador por materiales/terminaciones |
| 4 | Adhesivos & Stickers | Configurable | Impresos & packaging | Matriz de proveedor |
| 5 | Fajas & Envoltorios | Configurable | Impresos & packaging | Sin matriz activa identificada |
| 6 | Bolsas & Contenedores | Configurable | Impresos & packaging | Sin matriz activa identificada |
| 7 | Cajas Personalizadas | Consultar | — | Presupuesto |
| 8 | Carpetas & Folders | Configurable | Impresos & packaging | Matriz de proveedor |
| 9 | Menús & Cartas | Configurable | Impresos & packaging | Sin matriz activa identificada |
| 10 | Individuales & Posavasos | Configurable | Impresos & packaging | Sin matriz activa identificada |
| 11 | Cartelería & Ploteo | Configurable | Presencia física | Configurador DRAFT |
| 12 | Corpóreos & Marquesinas | Configurable | Presencia física | Configurador DRAFT |
| 13 | Señalética & Placas | Configurable | Presencia física | Configurador DRAFT |
| 14 | Expositores & Stands | Configurable | Presencia física | Configurador DRAFT |
| 15 | Indumentaria & Textil | Configurable | Textil | Configurador DRAFT |
| 16 | Objetos & Regalería | Directo | — | Falta precio/costo validado en seed de producto |
| 17 | Activos Web & Sitios | Configurable | Digital | Configurador DRAFT |
| 18 | Asistentes & Bots | Configurable | Digital | Configurador DRAFT |
| 19 | Anuncios & Campañas | Configurable | Campañas | Configurador DRAFT |
| 20 | Producción Audiovisual | Consultar | — | Presupuesto |
| 21 | Sistema de Identidad | Consultar | — | Presupuesto |
| 22 | Operaciones & Consultoría | Consultar | — | Presupuesto |
| 23 | Sistema de Captación para Eventos | Consultar | — | Presupuesto |
| 24 | Diseño de Flyer / Volante | Directo | — | Falta precio/costo validado en seed de producto |
| 25 | Diseño de Cartel / Afiche | Directo | — | Falta precio/costo validado en seed de producto |
| 26 | Diseño Pack de piezas para redes (10) | Directo | — | Falta precio/costo validado en seed de producto |
| 27 | Diseño de Cartelería / Rótulos | Directo | — | Falta precio/costo validado en seed de producto |
| 28 | Diseño de Menú Gastronómico | Directo | — | Falta precio/costo validado en seed de producto |
| 29 | Diseño de Vidriera | Directo | — | Falta precio/costo validado en seed de producto |
| 30 | Diseño de Etiquetas | Directo | — | Falta precio/costo validado en seed de producto |
| 31 | Diseño de Papelería Corporativa | Directo | — | Falta precio/costo validado en seed de producto |

## 2. Fuentes y vigencia

| Familia | Fuente/capa que aparece en el seed | Vigencia conocida | Riesgo |
|---|---|---|---|
| Tarjetas | Matriz de proveedor terminado y listas digitales/clásicas | Parte de la fuente no tiene fecha explícita | Hay que validar resolución efectiva y equivalencia de especificaciones |
| Flyers | `PROMO_DIRECTA_OFFSET` y matriz digital Ricoh Pro C9200 | Offset declara junio-julio 2026; digital sin fecha explícita en el bloque revisado | La matriz offset ya necesita revalidación de proveedor |
| Tags | Materiales, laminado y terminaciones del cotizador | Varias tarifas sin fecha visible | Deuda documentada en perforación |
| Stickers | Matriz de proveedor circular | Fuente referenciada como lista de proveedor; verificar fecha y alcance | Confirmar soporte, corte, laminado y cantidad exactos |
| Carpetas | Matriz de producto terminado | Referencia a lista de abril 2026 | Revalidar antes de publicar |
| Gran formato | Catálogo de materiales (23/07/2026) e impresiones (06/07/2026) | Julio 2026 | Costos sin IVA; faltan costos de mano de obra, desperdicio, preparación, instalación y traslado donde correspondan |
| Servicios/diseño | No se ve costo de proveedor unitario en `05-products.ts` | No aplica | Deben costearse por horas/capacidad, alcance, revisiones y gastos, no con el margen de imprenta |

**Regla:** un costo sin fecha, unidad, especificación, condición de pago o fuente verificable queda como **pendiente de validar**, no como costo confirmado.

## 3. Hallazgos que bloquean el precio definitivo

### P0 — No aplicar un margen global a todo el catálogo

`09-quoter-config.ts` asigna `profitMargin: 150`, mínimo 120 y máximo 180 a tarjetas, flyers y tags. Hay que confirmar en el código del cotizador si ese campo significa recargo porcentual, margen objetivo o parámetro de optimización. No cambiarlo hasta comprobar su semántica en el cálculo de precio final.

Si fuera **recargo sobre costo**, 150% implica precio = costo × 2,5 y margen bruto sobre venta de 60%; no es un margen de 150%. Si fuera **margen sobre venta**, la fórmula sería distinta y un 150% no tiene sentido económico como margen bruto ordinario.

### P0 — Separar costos y precios con IVA

Las matrices de proveedor consultadas indican `taxIncluded: false`. Para un responsable inscripto, el IVA de compra normalmente se trata como crédito fiscal cuando corresponde y es computable; no debe sumarse como costo económico y después volver a gravar el precio de venta. La condición fiscal concreta debe validarse con el contador.

Modelo de cálculo para cada configuración:

1. Costo de proveedor neto de IVA recuperable.
2. + flete, retiro, embalaje y otros cargos de compra.
3. + preparación, diseño/arte, control, mermas y gestión no incluidas por proveedor.
4. + comisiones de cobro/financiación y costo comercial variable.
5. = costo operativo completo.
6. Precio neto objetivo = costo operativo completo / (1 − margen bruto objetivo).
7. IVA de venta según alícuota aplicable; mostrar precio final al consumidor cuando corresponda.

No agregar IVA a una base que ya lo incluye, ni aplicar IVA automáticamente a una prestación sin revisar su tratamiento.

### P0 — Tags subcosteados en perforación

`docs/costing-debts.md` registra que el cotizador estima $1.250 para 500 unidades, $2.500 para 1.000 y $7.500 para 3.000, mientras la tarifa de referencia de proveedor es $3.225, $4.500 y $11.612 respectivamente. El costo está subestimado en $1.975, $2.000 y $4.112 por lote. Corregir el modelo de terminación antes de considerar validado el margen de Tags.

### P0 — Tarjetas: costo fuente posiblemente fuera del rango minorista

La matriz digital del seed contiene un costo de $39.930 para 500 tarjetas 350 g, impresión 4/4, sin laminado. Como referencia externa, Imprimime publica tarjetas brillantes de 300 g, 4/4 y laca UV frontal desde $34.290 + IVA por 500 unidades (lista consultada el 13/10/2026; precios publicados vigentes al 10/10/2026).

No es una comparación idéntica: difieren el gramaje y la terminación. Sin embargo, el costo de proveedor de ZAP supera el precio minorista publicado de referencia. Antes de definir precio hay que verificar que la celda, unidad y especificación de la matriz sean correctas, y solicitar una cotización comparable. **No solucionar esta brecha bajando el margen.**

### P1 — Flyers: revalidar el costo y normalizar especificaciones

La matriz offset tiene un costo de $23.000 para 1.000 unidades de 10×15 cm en obra 80 g; la vigencia declarada es junio-julio de 2026. Las listas públicas consultadas muestran precios variables por tamaño, papel, impresión a una/dos caras y cantidad. No hay que comparar solo por “flyer”: la ficha de contraste debe incluir esas cuatro variables y el plazo de entrega.

### P1 — Gran formato: no confundir material con producto terminado

El catálogo de costos distingue `MATERIAL`, `IMPRESION`, `PROCESO`, `MATERIAL_PROCESO` y `PRODUCTO_TERMINADO`. Es correcto conservar esa distinción: sumar una línea de material+proceso a los componentes que ya incluye duplicaría costos. Antes de poner precio se debe mapear cada producto y configuración a los componentes exactos y sumar instalación/traslado solo cuando corresponda.

## 4. Política de margen inicial propuesta

No es todavía una orden de modificación del seed; es la hipótesis para evaluar los precios.

| Tipo de venta | Objetivo inicial | Tratamiento |
|---|---:|---|
| Impresos tercerizados de catálogo, con costos y especificaciones validados | 30–40% de margen bruto sobre venta neta | Usar 35% como centro inicial y comprobar contra mercado |
| Productos con gestión, armado, terminación o control adicional | 35–45% | Incorporar ese trabajo al costo o tratarlo explícitamente como componente |
| Gran formato, fabricación e instalación | Cotización por componentes y riesgo | No fijar porcentaje sin mano de obra, merma, traslado e instalación |
| Diseño y servicios profesionales propios | Costeo por capacidad/horas y alcance | Definir tarifa efectiva y horas no facturables; no copiar margen de reventa |
| Productos sin costo fiable o matriz DRAFT | Sin precio automático definitivo | Consulta o bloqueo comercial hasta costear |

Fórmulas:
- **Margen bruto** = (precio neto − costo operativo completo) / precio neto.
- **Precio neto objetivo** = costo operativo completo / (1 − margen objetivo).
- **Precio final** = precio neto + impuestos aplicables.

Un recargo del 35% sobre costo produce un margen bruto de 25,9%, no 35%. Para conseguir 35% de margen, el recargo equivalente sobre costo es aproximadamente 53,8%, antes de considerar otros gastos si no estaban incluidos en el costo.

## 5. Contraste competitivo externo

Referencias públicas revisadas el 13/10/2026:

- Imprimime publica tarjetas brillantes 300 g, 4/4 y laca UV frontal desde $34.290 + IVA / 500 unidades; tarjetas mate desde $39.320 + IVA / 500 y sectorizadas desde $59.570 + IVA / 500. Lista de precios con vigencia publicada al 10/10/2026: https://imprimime.com.ar/lista-de-precios
- Gráfica Lugano publica volantes 10×15 cm a $65.000 / 1.000 unidades y $150.000 / 5.000; la página indica que el diseño no está incluido. Confirmar tratamiento de IVA y especificaciones antes de usar como comparación cerrada: https://www.graficalugano.com.ar/

Estos datos son una referencia de mercado, no sustituyen una cotización comparable ni demuestran que un precio sea rentable para ZAP.

## 6. Orden de trabajo

1. **Confirmar la semántica de cálculo** del cotizador y dónde se aplica `profitMargin`.
2. **Resolver los cinco configuradores activos**: tarjetas, flyers, tags, stickers y carpetas. Documentar cada precio final en combinaciones reproducibles.
3. **Actualizar y fechar las listas de proveedor**, empezando por tarjetas y flyers; registrar precio, impuestos, fecha, entrega y condición de pago.
4. **Corregir la deuda de perforación** y ejecutar regresiones de Tags.
5. **Agregar costos de operación omitidos** cuando correspondan: flete/retiro, embalaje, merma, armado, control, comisiones de cobro y financiación.
6. **Construir la matriz de comparación** con especificaciones iguales, precio neto, precio final con IVA, costo completo, margen efectivo y brecha contra mercado.
7. **Mantener en consulta o DRAFT** los productos sin costeo fiable. No inventar costos para que el catálogo parezca completo.
8. Solo después de aprobar los precios, decidir cuáles se escriben en seed y cuáles quedan dinámicos en los configuradores.

## 7. Criterio de aprobación por combinación

Ninguna combinación se declara lista para venta hasta que tenga:

- fuente y fecha de costo;
- descripción exacta, tamaño/gramaje/material, impresión y terminaciones;
- cantidad y plazo;
- condición de pago y costo logístico;
- tratamiento de IVA documentado;
- costo operativo completo;
- precio neto y final;
- margen bruto calculado;
- precio de mercado comparable o explicación de diferenciación;
- prueba del precio que realmente calcula el configurador.

**Decisión por ahora:** no se modifican precios de venta ni porcentajes del seed. La evidencia actual muestra que hacerlo globalmente puede tanto sobrepreciar productos como esconder configuraciones subcosteadas.
