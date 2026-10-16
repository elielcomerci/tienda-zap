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


## 8. Hallazgos de la implementación real del cotizador

Revisión del código en `src/lib/pricing/product-quoter.ts`, `src/lib/pricing/nesting.ts`, `src/lib/pricing/configurator-adapter.ts`, `src/app/api/product-quote/route.ts` y `src/components/public/SemanticProductConfigurator.tsx`. Se inspeccionó la rama `main`; esta sección documenta hallazgos, no modifica la lógica de producción.

### P0 — `profitMargin` es un recargo sobre costo, no margen bruto

La implementación calcula `costo × (1 + profitMargin / 100)`. Con `profitMargin: 150`, el precio es 2,5 veces el costo y el margen bruto teórico sobre el precio neto es 60%, antes de costos omitidos. En cambio, el campo devuelto como `breakdown.marginPercent` conserva el valor 150, por lo que su nombre puede inducir a interpretar erróneamente el recargo como margen efectivo.

Recomendación: separar explícitamente `markupPercent` de `targetGrossMarginPercent` o renombrar el campo con una migración compatible. El precio por margen objetivo debe calcularse como `costoCompleto / (1 - margenObjetivo)`; no cambiar la semántica existente sin pruebas de regresión.

### P0 — El cotizador etiqueta el importe como final, pero no suma IVA

La API devuelve `totalPrice` calculado por el motor. La interfaz semántica muestra ese valor bajo la etiqueta “Precio final” y lo pasa al carrito; en el recorrido revisado no aparece un cálculo explícito de IVA entre cotización, interfaz y carrito. Las matrices de proveedor declaran costos sin IVA en varios casos.

Antes de publicar, hay que definir y probar una única convención fiscal: costos económicos netos cuando el IVA de compra sea computable, precio neto de venta y precio final con la alícuota aplicable. La interfaz debe indicar inequívocamente qué importe muestra y el carrito/checkout debe conservar la misma convención. La alícuota y el tratamiento concreto requieren validación contable; no aplicar 21% indiscriminadamente a cualquier prestación.

### P0 — Ejemplo reproducible de la brecha de tarjetas

Para 500 tarjetas 350 g, 4/4, sin laminar, la matriz `digitalOndemand.cards` registra costo de $39.930 sin IVA. Con el recargo de 150%, la fórmula produce $99.825 y el redondeo psicológico lo lleva aproximadamente a $99.890 antes de impuestos. Si correspondiera IVA del 21%, el total sería aproximadamente $120.867.

El precio de referencia publicado por Imprimime para tarjetas brillantes 300 g, 4/4, laca UV frontal es $34.290 + IVA / 500; no es una comparación idéntica, pero evidencia que primero hay que auditar la celda de costo y el proveedor. El importe de $39.930 ya supera la referencia minorista antes de aplicar el recargo. No resolverlo bajando el margen: confirmar origen, unidad, gramaje, terminación y cotización vigente.

### P1 — La fecha de vigencia de flyers ya venció

La matriz offset de flyers identifica la fuente `PROMO_DIRECTA_OFFSET` y vigencia `JUNIO_JULIO_2026`. A la fecha de esta auditoría (13/10/2026), no se debe tratar como tarifa vigente sin confirmación. La matriz digital on-demand es otra fuente y canal, y no debe mezclarse con la offset.

### P1 — Las fuentes comerciales conviven con motores y bases diferentes

- Tarjetas: `PROVIDER_FINISHED_COST`, costo de producto terminado y margen maestro.
- Flyers: `PRODUCT_QUOTER`, cálculo por pliego, nesting y terminaciones; la matriz de proveedor de la versión no es por sí sola el precio calculado por ese motor.
- Tags: `PRODUCT_QUOTER`; el costo de perforación del cotizador no coincide con la tarifa de proveedor documentada.
- Stickers: `PROVIDER_FINISHED_COST`, la matriz cargada resuelve solo forma circular, material y terminación definidos.
- Carpetas: `PROVIDER_FINISHED_COST` para la matriz digital de 300 g; el motor toma el costo unitario de la escala y lo multiplica por la cantidad.

Por eso no alcanza con inspeccionar una matriz aislada: cada caso de prueba debe recorrer la selección comercial, el adapter, el costo resuelto, el redondeo, el importe presentado y el importe que llega al carrito.

### Pruebas mínimas antes de aprobar precios

1. Probar una combinación representativa por producto y luego todas las combinaciones vendibles.
2. Comparar costo y precio calculado contra una planilla independiente.
3. Verificar que el margen reportado sea el margen bruto efectivo después del redondeo, no el recargo configurado.
4. Verificar IVA de forma consistente desde la cotización hasta carrito y checkout.
5. Rechazar o enviar a consulta cualquier combinación sin costo vigente, con especificación no cubierta o con proceso obligatorio sin costo correcto.
6. Ejecutar regresiones E2E de tarjetas, flyers y tags después de cualquier ajuste.


### P0 — Flyers y Tags no incorporan costo de impresión en el motor que realmente calcula el precio

El recorrido de `PRODUCT_QUOTER` llama a `calculateProductQuote`, que en modo `SHEET_NESTING` calcula el costo con pliegos de materia prima y las terminaciones seleccionadas. La función `calculateQuote` suma `materialCost + finishingsCost`; el desglose devuelve `printingCost: 0`, `processCost: 0` y `wasteCost: 0`. No consume automáticamente `providerFinishedCostMatrix` solo porque esa matriz esté presente en la versión del configurador.

Esto afecta especialmente a:
- **Flyers & Desplegables:** la configuración comercial contiene matrices de proveedor offset y digital, pero el motor activo `PRODUCT_QUOTER` deriva el precio del papel por pliego y, en los casos plegados, del costo de doblado. La matriz de costo de impresión no se incorpora en ese cálculo.
- **Tags & Etiquetas:** el motor deriva costo del papel y terminaciones, pero no incorpora un costo de impresión de proveedor. Además, la perforación está subcosteada.

Por tanto, los precios calculados por esos dos configuradores no deben considerarse vendibles ni usarse para calibrar margen hasta conectar una fuente de costo de impresión válida o cambiar el modelo de cálculo con pruebas. El costo del papel no equivale al costo del impreso terminado. No basta con cambiar `profitMargin`: primero hay que corregir el costo base.



### P0 — Stickers y Carpetas están ACTIVE, pero no tienen margen maestro sembrado

La lista `initialQuoterConfigs` de `prisma/seed/data/09-quoter-config.ts` define solo `tarjetas-vouchers`, `flyers-desplegables` y `tags-etiquetas`. Sin embargo, `adhesivos-stickers` y `carpetas-folders` también están en estado `ACTIVE` y usan el motor `PROVIDER_FINISHED_COST`.

Ese motor requiere `quoterConfig.profitMargin`; si falta, devuelve `CONSULT_REQUIRED: Falta el margen maestro del producto.`. Con el seed revisado, stickers y carpetas no tienen margen maestro declarado en esa lista. Confirmar en una base sembrada que no exista configuración residual, pero el repositorio no declara la configuración necesaria.

Acción: definir explícitamente el modelo de margen para ambos productos y agregar una prueba que confirme que la cotización responde con precio para una combinación válida. Hasta entonces, el estado comercial `ACTIVE` puede crear una experiencia de configuración que termina en consulta en vez de precio automático.

## 7. Tarjetas offset — costos normalizados y propuesta de precio final

La lista vigente confirmada por ZAP expresa los importes de 3.000 y 5.000 unidades **por millar**. Para el seed, esos importes se convierten en costo total de la tirada. Los importes de 1.000 unidades ya representan el costo de un millar.

| Impresión | Costo proveedor por millar (1.000) | Costo total (3.000) | Costo por millar (3.000) | Costo total (5.000) | Costo por millar (5.000) |
|---|---:|---:|---:|---:|---:|
| 4/0 | $24.000 | $70.500 | $23.500 | $115.000 | $23.000 |
| 4/1 | $29.000 | $84.000 | $28.000 | $135.000 | $27.000 |
| 4/4 | $30.000 | $87.000 | $29.000 | $140.000 | $28.000 |

**Propuesta comercial para contrastar:** 40% de margen bruto sobre venta neta, IVA de venta del 21% y redondeo hacia arriba a múltiplos de $500. Fórmula: costo operativo validado / 0,60 × 1,21. En esta primera simulación se usa el costo de proveedor como base; todavía no se han sumado costos operativos no informados, por lo que los importes son pisos comerciales provisionales, no una promesa de rentabilidad neta final.

| Impresión | 1.000 unidades — precio final propuesto | 3.000 unidades — precio final propuesto | 5.000 unidades — precio final propuesto |
|---|---:|---:|---:|
| 4/0 | $48.500 | $142.500 | $232.000 |
| 4/1 | $58.500 | $169.500 | $272.500 |
| 4/4 | $60.500 | $175.500 | $282.500 |

**Importante:** esta tabla es una propuesta calculada a partir de la promoción vigente que informó ZAP. No está publicada en el cotizador. La integración pública sigue bloqueada hasta que el motor permita distinguir producción offset de digital y asocie cada precio con su terminación exacta. No mezclar estos valores con los costos de la matriz digital ni mostrar cantidades que el resolver no pueda cotizar.


## 8. Revisión de otros costos y contraste con mercado (16/10/2026)

### Criterio común

Para comparar los productos con el mismo criterio comercial usado en tarjetas se calcula:

`precio final objetivo = costo proveedor validado / 0,60 × 1,21`

El resultado busca 40% de margen bruto sobre la venta neta, agrega 21% de IVA de venta y se redondea hacia arriba a múltiplos de $500. Es una simulación, no una activación automática. Supone que el costo informado es el costo completo del producto terminado y que corresponde aplicar IVA del 21%; antes de publicar deben validarse flete, preparación, diseño, comisiones de cobro y tratamiento fiscal.

### A. Stickers circulares en papel autoadhesivo 90g

La matriz vigente en el seed marca costo proveedor terminado sin IVA. Para 5×5 cm, la celda es $19.231 por 500 y $36.859 por 1.000 unidades.

| Cantidad | Costo proveedor | Precio final objetivo (40% margen bruto + IVA) |
|---|---:|---:|
| 100 | $4.968 | $10.500 |
| 500 | $19.231 | $39.000 |
| 1.000 | $36.859 | $74.500 |

**Contraste público:**
- Imprimime publica stickers de papel autoadhesivo, corte recto y medio corte, a $30.590 + IVA por 1.000 ($37.014 final). La medida concreta depende de la selección del cotizador, por lo que sirve como referencia de entrada, no como comparación exacta con 5×5 circular.
- Dokan publica stickers circulares de 5 cm a $95.000 por 1.000, en autoadhesivo Avery Fasson y entregados en planchas.
- Gráfica B377 informa como referencia $110.000 por 1.000 stickers circulares de 5 cm.

Las dos referencias de 5 cm circulares promedian $102.500. El objetivo ZAP de $74.500 queda aproximadamente 27% por debajo de ese promedio, pero casi duplica la referencia básica de Imprimime, que no especifica en el resultado la misma medida y forma. **Conclusión:** puede posicionarse en un rango medio/medio-alto para sticker circular de 5 cm, pero hay que confirmar que la matriz ZAP realmente incluye la laca UV y el mismo tipo de corte/entrega. No comparar con etiquetas rectangulares de corte recto como si fueran equivalentes.

Fuentes: https://imprimime.com.ar/stickers/stickers · https://dokan.com.ar/product/stickers-redondos/ · https://graficab377.com/blog/cuanto-cuesta-imprimir-en-buenos-aires

### B. Flyers / volantes offset

La matriz de proveedor está identificada como `PROMO_DIRECTA_OFFSET` y su vigencia declara junio-julio de 2026. A fecha de esta revisión está vencida: los importes siguientes sirven para evaluar la estructura y el posicionamiento, **no para publicar sin recotizar**.

| Especificación de la matriz | Costo proveedor | Precio final objetivo |
|---|---:|---:|
| 10×15 cm, ilustración 150g, 4/4, 1.000 u. | $32.000 | $65.000 |
| 10×15 cm, ilustración 150g, 4/4, 5.000 u. | $85.000 | $171.500 |
| 15×20 cm, ilustración 150g, 4/4, 1.000 u. | $64.000 | $129.500 |

**Contraste público:**
- Gráfica Lugano publica 10×15 cm, ilustración 115g, doble faz, a $65.000 por 1.000 y $150.000 por 5.000.
- Imprimime publica flyers offset full color frente y dorso desde $64.050 + IVA por 1.000 (unos $77.501 finales). La página permite elegir medida y gramaje, por lo que el valor “desde” no garantiza la misma especificación.

Para 1.000 unidades, el precio objetivo de $65.000 queda alrededor de 9% debajo del promedio simple de esas dos referencias (aprox. $71.250 finales). Para 5.000 unidades, $171.500 queda aproximadamente 14% por encima de los $150.000 publicados por Lugano para 115g; la diferencia de gramaje y la tarifa vencida impiden cerrar una conclusión definitiva.

**Conclusión:** el precio teórico de 1.000 unidades parece competitivo; el de 5.000 puede quedar alto. No tocar margen para compensarlo: primero renovar la cotización de proveedor y confirmar formato, gramaje y tirada exactos.

Fuentes: https://www.graficalugano.com.ar/ · https://imprimime.com.ar/folletos/folletos-flyers

### C. Carpetas corporativas A4 con solapa

Esta categoría presenta la alerta económica más fuerte. La matriz digital de 300g contiene precios unitarios por tramo. Aplicando la misma fórmula a 500 unidades:

| Configuración del seed | Costo unitario | Costo total a 500 | Precio final objetivo |
|---|---:|---:|---:|
| 4/0, sin laminar, solapa blanca | $1.186 | $593.000 | $1.196.000 |
| 4/0, OPP brillo, solapa blanca | $1.271 | $635.500 | $1.282.000 |
| 4/4, OPP brillo, solapa blanca | $1.649 | $824.500 | $1.663.000 |
| 4/4, OPP mate, solapa blanca | $1.662 | $831.000 | $1.676.000 |

**Contraste público a 500 unidades:**
- Imprenta Lugones publica $541.900 para carpeta económica sin laminar, $681.900 para carpeta laminada de 300g con solapa blanca, y $1.076.300 para carpeta premium impresa frente y dorso con solapa impresa.
- Soluciones Gráficas muestra un precio final de $786.566 para 500 carpetas A4 con solapa; la selección de terminaciones asociada al precio mostrado no queda totalmente clara en el resultado público.

La referencia de $681.900 para carpeta laminada básica y la de $786.566 sitúan un promedio de referencia de alrededor de $734.000, aunque no son dos configuraciones idénticas. El objetivo ZAP de $1.282.000 para 4/0 laminada queda aproximadamente 75% por encima de ese promedio. Para 4/4, el objetivo de $1.663.000 también supera en alrededor de 55% la referencia premium de $1.076.300, aun cuando las especificaciones no coinciden exactamente.

**Conclusión: no publicar estos precios.** El costo de proveedor cargado ya está en niveles cercanos o superiores al precio minorista de otros talleres antes de agregar margen e IVA. Hay que confirmar que los importes de `carpetasDigital300gTiers` sean realmente costos de compra y no precios de venta de una lista anterior, validar la unidad y pedir cotización comparable. No se resuelve reduciendo el margen: el costo base necesita auditoría.

Fuentes: https://www.imprentalugones.com.ar/productos/carpetas/ · https://shop.solucionesgraficas.com.ar/storefront/nuestros-productos/carpetas-a4-con-solapa/prod08778E5D_82C5_B72C_5FDD_3ACD67BC7BE5.html

### D. Tags y etiquetas colgantes

No se fija precio final todavía. El configurador de tags usa `PRODUCT_QUOTER` y el cálculo físico por pliegos; la auditoría anterior detectó que ese recorrido no incorpora el costo de impresión de proveedor terminado y que el costo de perforación no coincide con la tarifa documentada. Aplicar el 40% de margen a ese costo incompleto produciría un precio ficticio. **Bloqueo:** corregir primero el costo completo de impresión y perforación, luego contrastar con precios publicados para el mismo tamaño, gramaje, impresión y perforación.

### E. Resultado de esta revisión

| Producto | Resultado preliminar | Decisión |
|---|---|---|
| Stickers circulares 5×5 | $74.500 / 1.000; por debajo del promedio de dos referencias circulares de 5 cm, pero por encima de la referencia básica de corte recto | Validar material, laca UV y corte; después cotizar |
| Flyers 10×15 150g | $65.000 / 1.000; competitivo frente a dos referencias, pero la lista fuente venció | Pedir costo vigente antes de publicar |
| Carpetas A4 300g | Objetivos de $1,28 M a $1,68 M / 500, claramente altos frente a referencias minoristas | No publicar; auditar la fuente y la unidad de costo |
| Tags | No se puede obtener un precio confiable con el costo actual del motor | Corregir impresión y perforación antes de fijar precio |

Los precios de competencia son precios publicados consultados el 16/10/2026; pueden cambiar y no todos incluyen las mismas terminaciones, envío o diseño. Se usa el promedio sólo cuando las referencias son suficientemente comparables, y se explicitan las diferencias cuando no lo son.


## 9. Política comercial acordada: centro del mercado + leve prima (16/10/2026)

### Margen: definición y regla

Se adopta como política de partida:

- **Margen bruto objetivo: 40% de la venta neta de IVA.**
- **Piso de margen bruto: 35%**, siempre que el costo incluya todos los costos directos atribuibles al pedido.
- El porcentaje se calcula como `(venta neta de IVA - costo completo) / venta neta de IVA × 100`. No confundir margen con recargo sobre costo.
- El precio final al consumidor incluye IVA del 21% cuando corresponde. Si el precio público se expresa con IVA, primero se divide por 1,21 para calcular el margen neto.
- El precio de mercado se fija usando la mediana de varias ofertas comparables y una prima inicial de **5% por encima de esa mediana** (no del competidor más barato). Si sólo hay dos referencias comparables, se usa su punto medio como aproximación provisional.
- La referencia de mercado no autoriza vender por debajo del piso. Si la mediana + 5% no deja al menos 35% de margen bruto, se revisa proveedor, costo, especificación o se deja el producto sin precio automático. No se baja el margen sin una decisión explícita.
- Diseño, envío, urgencias, comisiones de cobro, preparación y otros cargos deben estar incluidos en el costo cuando los absorbe ZAP; si se cobran aparte, deben quedar explícitos.

El 40% es **margen bruto**, no ganancia neta del negocio: todavía debe financiar estructura, comercialización, administración, impuestos no recuperables, mermas, garantías y costos generales. La rentabilidad neta real se conoce al medir esos gastos.

### Precios objetivo revisados con la política de mercado

Valores de trabajo, redondeados hacia arriba a $500, sujetos a confirmar equivalencia de terminaciones y costos vigentes. No publicar automáticamente hasta cerrar esas validaciones.

| Producto / especificación | Costo de proveedor usado | Referencia de mercado | Precio ZAP objetivo | Margen bruto estimado |
|---|---:|---|---:|---:|
| Tarjetas 9×5, 350 g, 4/0 | $24.000 / 1.000 | Referencias de tarjetas full color 9×5: $55.000–$63.500 / 1.000; no es comparación exacta de impresión a una cara | $52.500 / 1.000 | 44,7% |
| Tarjetas 9×5, 350 g, 4/1 | $29.000 / 1.000 | Sin suficientes referencias públicas exactas 4/1; precio intermedio provisional | $60.000 / 1.000 | 41,5% |
| Tarjetas 9×5, 350 g, 4/4 | $30.000 / 1.000 | B377 $55.000 (300 g, 4/4, laminado frontal opcional); Cubo $72.000 (350 g, mate frente y dorso) | $67.000 / 1.000 | 45,8% |
| Stickers circulares 5 cm, papel autoadhesivo | $36.859 / 1.000 | B377 $110.000; Dokan $95.000; punto medio de dos referencias $102.500 | $108.000 / 1.000 | 58,7% |
| Flyers 10×15 cm, 150 g, 4/4 | $32.000 / 1.000 | Imprimime $77.501 final; Gráfica de la Plaza $58.806 final (promo + IVA); centro aproximado $68.153 | $72.000 / 1.000 | 46,2% |
| Flyers 10×15 cm, 150 g, 4/4 | $85.000 / 5.000 | Imprimime $162.443 final; Gráfica de la Plaza $154.275 final; centro aproximado $158.359 | $166.500 / 5.000 | 38,2% |
| Carpetas A4 300 g, 1 solapa, 4/0 laminadas | $635.500 / 500 | Imprenta Lugones $681.900 / 500; especificación cercana, no idéntica | No fijar aún | Negativo al precio de mercado |
| Carpetas A4 300 g, 1 solapa, 4/4 laminadas | $824.500 / 500 | Lugones publica $777.200 solo frente premium y $1.076.300 frente y dorso premium | No fijar aún | No confiable hasta validar el costo de origen |

**Cálculo del margen estimado:** se toma el precio público final, se divide por 1,21 para estimar la venta neta y se compara contra el costo del proveedor indicado. No incluye costos operativos faltantes; por eso es un margen provisional y puede ser menor al real cuando esos costos se incorporen.

### Lectura y decisiones

- **Tarjetas:** los objetivos de $52.500, $60.000 y $67.000 evitan ubicarse como la opción barata y mantienen, sobre el costo de proveedor cargado, un margen bruto teórico superior al 40%. Antes de publicar, confirmar si el OPP brillo de la lista vigente es laminado de frente o frente y dorso, y obtener al menos una referencia pública exacta para 4/1.
- **Stickers:** $108.000 se acerca al rango alto del centro de las dos referencias circulares de 5 cm ($95.000 y $110.000); el margen teórico queda alto porque el costo proveedor cargado es relativamente bajo. Verificar que la laca, el troquel y la presentación sean equivalentes.
- **Flyers:** $72.000 por 1.000 queda ligeramente por encima del centro de las dos referencias finales consultadas. Para 5.000, $166.500 queda por encima del centro y deja un margen teórico de 38,2% antes de otros costos; la lista de proveedor del seed está vencida, por lo que **no aprobar ni publicar sin recotizar**.
- **Carpetas:** la estructura actual no soporta un precio de mercado con el piso de margen acordado. No forzar un precio público ni rebajar el margen: revisar primero si los costos son costos de compra reales y si la unidad/tirada está bien interpretada.
- **Tags:** sigue bloqueado hasta que el costo de impresión y perforación quede completo.

### Referencias de competencia revisadas el 16/10/2026

- Gráfica B377: https://graficab377.com/blog/cuanto-cuesta-imprimir-en-buenos-aires
- Gráfica B377 catálogo: https://graficab377.com/catalogo
- Imprimime: https://imprimime.com.ar/lista-de-precios
- Imprimime flyers: https://imprimime.com.ar/folletos/folletos-flyers
- Imprimime carpetas: https://imprimime.com.ar/carpetas-impresas/carpetas-impresas-1-solapa
- Gráfica de la Plaza: https://graficadelaplaza.com/impresion-folletos-color/
- Imprenta Lugones: https://www.imprentalugones.com.ar/productos/carpetas/
- Dokan: https://dokan.com.ar/product/stickers-redondos/
- Imprenta Cubo Digital: https://imprentacubodigital.com.ar/

Los precios son los publicados al consultar y pueden cambiar. Las referencias “desde” y las ofertas promocionales se consideran aproximadas cuando la selección exacta no queda confirmada.


## 10. Control de cobertura del universo completo (16/10/2026)

### 10.1 No mezclar los dos catálogos

La revisión del repositorio muestra dos universos distintos que deben reconciliarse, no sumarse como si fueran una sola lista:

1. **31 Product Bases del seed estratégico** en `prisma/seed/data/05-products.ts`. Es el universo comercial de referencia conectado a rubros, situaciones, necesidades y relaciones.
2. **Catálogo transaccional anterior de la tienda** documentado en `docs/auditoria-catalogo-productos.md` (foto fechada 20/05/2026): 30 productos cargados, 28 activos, 2 inactivos, incluidos productos con variantes y cotizadores. Esa foto no prueba por sí sola el estado actual de la base de datos; debe contrastarse con el estado vigente antes de publicar o migrar.

Los 31 Product Bases son: Tarjetas & Vouchers; Flyers & Desplegables; Tags & Etiquetas; Adhesivos & Stickers; Fajas & Envoltorios; Bolsas & Contenedores; Cajas Personalizadas; Carpetas & Folders; Menús & Cartas; Individuales & Posavasos; Cartelería & Ploteo; Corpóreos & Marquesinas; Señalética & Placas; Expositores & Stands; Indumentaria & Textil; Objetos & Regalería; Activos Web & Sitios; Asistentes & Bots; Anuncios & Campañas; Producción Audiovisual; Sistema de Identidad; Operaciones & Consultoría; Sistema de Captación para Eventos; Diseño de Flyer / Volante; Diseño de Cartel / Afiche; Diseño Pack de piezas para redes (10); Diseño de Cartelería / Rótulos; Diseño de Menú Gastronómico; Diseño de Vidriera; Diseño de Etiquetas; Diseño de Papelería Corporativa.

### 10.2 Resultado de la inspección de fuentes de costo

| Familia / fuente | Qué existe en código | Resultado de auditoría |
|---|---|---|
| Tarjetas, flyers, tags, stickers, carpetas | `09-quoter-config.ts`, `09-quoter-options.ts`, `06-configurators/impresos-packaging.ts` | Costos parciales por matriz y proveedor; vigencia, equivalencia de terminaciones y conexión con el motor deben verificarse por producto y variante. |
| Gran formato y vinilos | `06-configurators/gran-formato-costos.ts` | Catálogo de costos por componentes, fuentes fechadas 06/07/2026 y 23/07/2026, sin IVA. No equivale a costo final universal: hay mínimos, descuentos, materiales+proceso y productos terminados que no deben sumarse dos veces. |
| Cartelería, corpóreos, señalética y stands | `06-configurators/presencia-fisica.ts` | Los contratos de configurador están en DRAFT con opciones vacías y `pricing: null`; no existe base suficiente para precio automático integral de producto terminado e instalación. |
| Indumentaria y textil | `06-configurators/textil.ts` | Contrato en DRAFT, opciones vacías y `pricing: null`; falta una matriz vigente de prendas, técnicas, ubicaciones, talles, mermas y mínimos. |
| Web, sitios y asistentes | `06-configurators/digital.ts` | Contratos en DRAFT, opciones vacías y `pricing: null`; el precio necesita costo interno por alcance, horas, QA, integraciones, puesta en marcha y soporte. |
| Anuncios y campañas | `06-configurators/campanas.ts` | Contrato en DRAFT, opciones vacías y `pricing: null`; hay que separar honorarios de inversión en medios y costos de herramientas. |
| Packaging: fajas, bolsas, cajas, menús, individuales y posavasos | No se encontró una matriz de producto terminado activa y suficiente en las fuentes revisadas | Sin costo completo y especificación cerrada; pedir cotización por medidas, material, impresión, terminación, cantidad, armado y entrega. |
| Objetos y regalería | Producto base directo sin costo proveedor validado asociado en el seed | Sin costo validado; cotizar cada artículo y personalización, incluyendo mínimos y logística. |
| Producción audiovisual, identidad, operaciones, captación de eventos y servicios a medida | Productos de consulta sin estructura de costos completa en seed | No usar margen de reventa gráfica. Costear horas, equipo, proveedores, herramientas, coordinación, rondas, derechos, traslados y entregables. |
| Ocho productos de diseño directo | El seed registra precios directos, pero no horas/costos completos visibles | Precio existente no significa precio validado. Costear tiempo, revisiones, coordinación, preparación de originales y capacidad no facturable. |

### 10.3 Brecha adicional: catálogo transaccional anterior

La foto documentada del catálogo anterior identifica estas variantes incompletas o con precio cero: Banners (6 de 9 en cero), Calendario (3 de 3), Carpeta corporativa (4 de 4), Cartel Venta/Alquiler (2 de 9), Folleto (30 de 64), Imanes (2 de 3), Block/anotador (2 de 4) y Ploteo vehicular (2 de 2). También marca como pendiente de verificación los precios de variantes de otros productos, aunque algunas ya tienen un precio cargado.

No se deben completar estas celdas copiando un multiplicador genérico. Las reglas anteriores de `costo × 2,5` solo sirven como hipótesis histórica cuando el costo base es confiable; no demuestran margen bruto, competencia ni cobertura de comisiones, desperdicio, armado, flete o instalación.

### 10.4 Orden de trabajo para cerrar cobertura sin inventar datos

1. **Reconciliar los universos:** extraer el estado actual del catálogo transaccional y cruzarlo por slug/ID con los 31 Product Bases; identificar duplicados, productos que existen en uno solo y variantes comprables sin precio.
2. **Normalizar costos fuente:** para cada registro, conservar proveedor, fecha, moneda, IVA, unidad, mínimo, cantidad, terminación, vigencia y si el costo incluye material/proceso/producto terminado. No inferir equivalencias ambiguas.
3. **Cerrar costos de producto terminado:** primero familias con datos existentes (impresos y gran formato); después pedir costos faltantes de packaging, textil y merchandising; en paralelo costear servicios propios por horas y capacidad.
4. **Contrastar mercado por configuración comparable:** guardar URL, fecha, precio final/impuestos, especificación, cantidad, envío y si incluye diseño/instalación. No usar referencias que no informan cantidad o terminación como si fueran equivalentes.
5. **Calcular y bloquear:** aplicar mediana + 5% solo con referencias comparables; verificar margen bruto objetivo del 40% y piso del 35% sobre costo completo. Si falla o falta evidencia, estado BLOQUEADO/SIN COSTO, no precio estimado publicable.
6. **Probar el camino real:** validar configurador, vista de producto, cotización, carrito y checkout con las mismas selecciones. No activar precios ni ejecutar seeds productivos como parte de esta auditoría.

### 10.5 Estado global

- **Universo estratégico:** 31 Product Bases identificados.
- **Configuradores contractuales:** 18 definidos históricamente, pero no equivalen a 18 cotizadores listos para producción.
- **Costos fuente parciales:** impresos y gran formato.
- **Costos de producto terminado insuficientes o no identificados:** varias familias de packaging, presencia física, textil, objetos y servicios propios.
- **Precios listos para aprobación integral:** ninguno con la evidencia disponible en esta pasada.
- **Producción:** esta auditoría documental no ejecuta seeds ni cambia precios en vivo.

El criterio para declarar un producto “validado” es tener simultáneamente costo vigente y completo, especificación cerrada, contraste de mercado comparable, margen comprobado y prueba del recorrido de compra. Un precio cargado en base de datos o una fórmula que devuelve un número no alcanza ese criterio.


## 11. Primera ampliación de referencias de mercado por familias aún sin precio aprobado (16/10/2026)

Esta pasada amplía el contraste fuera de tarjetas/flyers/stickers. Las referencias sirven para construir comparables; **no son precios ZAP recomendados ni prueban margen**, porque todavía falta emparejar cada ficha con un costo de proveedor completo y la misma especificación.

| Familia / referencia pública | Precio publicado observado | Qué permite comparar | Límite / decisión |
|---|---:|---|---|
| Banner tensor simple, 190×90 cm, full color y estructura metálica — Imprimime | $54.601 + IVA / unidad | Referencia de producto terminado con estructura | No comparar con lona sola ni con roll-up. Confirmar soporte, impresión, estructura y envío. https://imprimime.com.ar/ |
| Banner Roll Up, 200×85 cm, full color y portabanner — Imprimime | $97.248 + IVA / unidad | Referencia de roll-up completo | Mantener separado de banners tensores y lona impresa. https://imprimime.com.ar/ |
| Imanes publicitarios full color — Imprimime | Desde $18.611 + IVA / 250 unidades | Referencia inicial para familia de imanes | El resultado no detalla tamaño/espesor; no fijar precio hasta abrir ficha y verificar equivalencia. https://imprimime.com.ar/ |
| Calendario CD, 12×14 cm, una hoja por mes y caja acrílica — Imprimime | Desde $55.238 + IVA / 10 unidades | Referencia para calendario de escritorio con caja | No es comparable con calendario de pared; identificar formato exacto del producto ZAP. https://imprimime.com.ar/ |
| Bolsa de papel 26×12×36 cm, manija, impresión 1 color en una cara — Paperland | Precio de lista visible $92.600 / pack de 100; precio rebajado visible $85.934 y transferencia $77.340,60 | Referencia de bolsa terminada, formato y cantidad definidos | Diferenciar precio de lista, descuento y transferencia; confirmar gramaje, IVA, entrega y vigencia. https://www.paperland.ar/productos/bolsas-de-papel-kraft-c-manija-26x12x36-impresas/ |
| Bolsa de papel 30×41 cm, impresión a 1 color configurable — Ecoingenio | $115.865 / 100 unidades; el sitio indica IVA incluido | Referencia de bolsa personalizada y escala por cantidad | El tamaño y la construcción pueden diferir; verificar fuelle, manijas y soporte. https://ecoingenio.com.ar/producto/bolsas-kraft-personalizadas/ |
| Caja rígida blanca, tapa y base, 18×12×7,5 cm — Indubox | $224.512 + IVA / 100 unidades para full color en tapa | Referencia para caja personalizada de estructura concreta | No equivale a caja de envío, microcorrugado ni packaging impreso integral. La cotización consultada indicaba validez por 5 días desde 17/09/2026; pedir actualización. https://www.indubox.com.ar/estructura/secciones/s_producto.php?mIdProducto=2185&presup=1 |
| Remera personalizada, DTF frente y espalda, algodón peinado 24/1 — Imprenet | Desde $20.696 por unidad; $18.626 por unidad llevando más de 10, según ficha | Referencia para prenda terminada con dos ubicaciones impresas | Verificar talles, gramaje, colores, cantidad mínima, envío e IVA en la cotización. https://www.imprenet.ar/productos/ |
| Remera estampada, 30 unidades, algodón peinado 24/1, una estampa DTF — Remanija | Desde $19.500 por unidad | Referencia para tirada mayorista de 30 unidades | Una estampa, no frente+dorso; pedir cotización con misma prenda y ubicaciones. https://remanija.com.ar/blog/cuanto-cuesta-estampar-remeras-buzos.html |
| Menú A4, ilustración mate 300 g, 4/4, laminado OPP mate — Agite | $32.100 con efectivo, según ficha | Referencia de carta terminada para gastronomía | La ficha consultada no deja clara la cantidad asociada al precio observado; no usar como precio unitario confirmado sin abrir la selección. https://www.agite.com.ar/productos/carta_a4_laminada/ |
| Stickers: rangos publicados por material/corte — Imprimime | Papel autoadhesivo corte recto desde $9.778 + IVA / 100; vinilo desde $17.551 + IVA / 100; holográfico desde $33.034 + IVA / 100 | Ayuda a separar familias por material y proceso | No comparar directamente con sticker circular 5 cm con UV/troquel. https://imprimime.com.ar/ |

### Conclusión de esta ampliación

- **Gran formato:** hay precios de venta de producto terminado para banner tensor y roll-up, pero el costo fuente de gran formato está descompuesto por materiales y procesos. El siguiente cálculo debe construir cada combinación sin sumar dos veces líneas que ya incluyen material+proceso, agregar mano de obra/terminación/estructura y comparar contra el producto terminado equivalente.
- **Bolsas y cajas:** ya existen referencias concretas para algunos formatos, pero no se encontró una matriz de costo proveedor terminada equivalente en el seed. Quedan en SIN COSTO/BLOQUEADO hasta cotización.
- **Textil:** existen referencias mayoristas con especificación parcial. El configurador actual sigue DRAFT y sin matriz de precios; no activar hasta obtener costos por prenda, técnica, ubicaciones, talles y mínimos.
- **Imanes y calendarios:** hay referencias de mercado, pero no son comparables a todas las variantes del catálogo. Identificar el SKU y especificación antes de calcular.
- **Menús:** no comparar una ficha sin cantidad confirmada con una tirada de imprenta. Mantener el precio sin aprobar hasta cerrar unidad, formato, protección y cantidad.

Los valores publicados son observaciones web del 16/10/2026 o de fichas recientes consultadas en esa fecha. Promociones, medios de pago, IVA, entrega y disponibilidad pueden modificar el total final; deben confirmarse al pedir cotización.

## 12. Estrategia de cierre: activar un primer núcleo vendible sin esperar a todo el universo (16/10/2026)

### 12.1 Regla comercial refinada

El objetivo no es completar artificialmente los 31 productos: es llegar a la próxima pasada con un núcleo pequeño, confiable y realmente ofrecible, mientras el resto continúa en consulta/DRAFT.

Para cada combinación se comparan, en este orden:

1. **Equivalente directo:** mismo tamaño, material/gramaje, impresión, cantidad, terminación y alcance.
2. **Equivalente funcional cercano:** cumple el mismo uso, pero se registran explícitamente las diferencias (por ejemplo, tensor simple frente a roll-up; bolsa kraft con otra medida o manija).
3. **Alternativa de calidad superior:** si la alternativa mejora de manera comprobable el material, gramaje, terminación, estructura, protección o presentación, se puede ofrecer **al mismo precio de venta que el comparable de mercado**, sin sumar automáticamente la prima del 5%, siempre que el costo completo conserve al menos 35% de margen bruto y, de ser posible, el objetivo del 40%. La mejora debe describirse con precisión y no presentarse como superior si no hay evidencia.
4. Si ninguna alternativa cumple margen y calidad, no se fuerza el precio: se negocia costo, se cambia la especificación o queda bloqueada.

La prima de mercado de +5% pasa a ser una referencia inicial, no una obligación. Cuando una especificación superior puede sostenerse al precio mediano del mercado, priorizar valor percibido y conversión antes que cobrar una prima sin fundamento.

### 12.2 Núcleo candidato para la primera activación

Estos productos tienen datos suficientes para ser los primeros en cerrar, pero **todavía no están autorizados para activarse** hasta superar los controles indicados.

| Prioridad | Producto/configuración | Precio público de trabajo | Evidencia actual | Qué falta para activar |
|---|---|---:|---|---|
| A | Stickers circulares 5 cm, papel autoadhesivo, 1.000 u | $108.000 | Costo de referencia $36.859; dos referencias de mercado ($95.000 y $110.000); margen teórico documentado cercano al 58,7% si el precio es final con IVA | Confirmar proveedor/costo vigente, soporte, corte/troquel, laca y cantidad; incluir embalaje/flete/comisiones absorbidos; verificar que la cotización real arroje ese precio y que la interfaz/checkout use la misma convención de IVA |
| A | Tarjetas 9×5 cm, 350 g, 4/0, 1.000 u | $52.500 | Costo de referencia $24.000; margen teórico cercano al 44,7% sobre precio final con IVA | Confirmar costo terminado vigente y laminado exacto; verificar que el cotizador actual no sustituya este costo por otra matriz ni produzca un precio distinto |
| A | Tarjetas 9×5 cm, 350 g, 4/4, 1.000 u | $67.000 | Costo de referencia $30.000; margen teórico cercano al 45,8% | Confirmar especificación, terminación y proveedor; probar cotización end-to-end |
| B | Flyers 10×15 cm, 150 g, 4/4, 1.000 u | $72.000 | Costo vigente confirmado por ZAP: $32.000; margen bruto estimado 46,2% si el precio final incluye IVA | Verificar la nueva resolución contra costo terminado y probar API/carrito; no recotizar |
| B | Flyers 10×15 cm, 150 g, 4/4, 5.000 u | $166.500 | Costo vigente confirmado por ZAP: $85.000; margen bruto estimado 38,2% si el precio final incluye IVA | Verificar la nueva resolución contra costo terminado y probar API/carrito; no recotizar |
| C | Banner tensor simple 190×90 cm, full color y estructura | Objetivo inicial: precio de mercado comparable, sin fijar importe ZAP todavía | Imprimime publica $54.601 + IVA; B377 publica $60.000 para banner + tensor 90×190 cm; las diferencias de especificación deben verificarse | Obtener costo ZAP terminado o reconstruir materiales + impresión + confección/terminación + estructura + mano de obra + logística; comparar el costo completo contra vender a precio final de mercado. Si el margen no alcanza, cotizar otra estructura/proveedor o ofrecer una mejora real de calidad al precio mediano |
| C | Roll-up 200×85 cm, full color, estructura y bolso | Objetivo inicial: precio de mercado comparable, sin fijar importe ZAP todavía | Imprimime publica $97.248 + IVA, incluye portabanner metálico y bolso | Confirmar costo terminado o componentes completos; no usar costos de lona sola como si fueran el roll-up completo |

**Importante:** los márgenes de A/B son proyecciones hechas con los costos históricos documentados y suponiendo que el precio de trabajo es precio final con IVA del 21%. No demuestran todavía el margen completo real. La autorización exige los controles de la última columna; no se debe cambiar el precio real del cotizador para que coincida con la tabla sin verificar primero el costo que usa.

### 12.3 Familias que no deben retrasar la primera activación

- **Tags:** siguen bloqueados por discrepancia de perforación y costo terminado.
- **Carpetas:** costo fuente y unidad/tirada sin resolver frente al mercado.
- **Bolsas, fajas, cajas, menús e individuales:** buscar primero una cotización de producto terminado exactamente comparable; usar referencias de mercado para decidir especificación, no para inventar costo.
- **Textil:** comenzar con una única ficha acotada (por ejemplo, remera de algodón peinado 24/1 con una ubicación DTF y mínimo definido), pero solo después de confirmar prenda, talles, impresión, cantidad, IVA y envío con proveedor. No activar un configurador genérico sin esos datos.
- **Gran formato:** priorizar un único banner tensor y un único roll-up como productos de catálogo separados. La estructura, la impresión, el armado y el bolso deben estar dentro del costo; no mezclar ambas tipologías ni sumar componentes que ya incluyan material + proceso.
- **Servicios de diseño:** pueden ofrecerse por consulta fuera del cotizador mientras se completa el costeo por horas, alcance y revisiones; no inventar un precio fijo ni presentar una estimación como tarifa aprobada.

### 12.4 Gate mínimo para la próxima pasada

La próxima pasada debe terminar con un estado explícito por producto: **ACTIVAR**, **OFRECER POR CONSULTA** o **BLOQUEAR**. Para declarar ACTIVAR, comprobar:

- [ ] Costo vigente confirmado con fecha, proveedor, cantidad, especificación e impuestos.
- [ ] Costo completo, incluyendo gastos directos que absorbe ZAP.
- [ ] Precio público comparable y margen bruto calculado sobre venta neta de IVA; mínimo 35%.
- [ ] Configurador, página, carrito y checkout muestran/conservan el mismo precio y tratamiento de IVA.
- [ ] Prueba de una configuración real, sin depender de un seed de producción no verificado.
- [ ] Texto comercial comunica la especificación y la mejora de calidad sin promesas no demostradas.

No hace falta que el universo completo esté terminado para lanzar. La decisión es cerrar primero el núcleo A y, en paralelo, obtener costos para un banner y un roll-up. Los demás productos permanecen fuera del lanzamiento inicial hasta contar con evidencia suficiente.

## 13. Auditoría del motor real de flyers 10×15 — hallazgo bloqueante y siguiente corrección (16/10/2026)

### 13.1 El costo vigente no es el problema

Se confirma por instrucción del negocio que los costos de proveedor de $32.000 / 1.000 y $85.000 / 5.000 siguen vigentes. No se solicita nueva cotización. La brecha encontrada es técnica: el dato de costo terminado existe en `pricing.providerFinishedCostMatrix.matrix` de `06-configurators/impresos-packaging.ts`, pero el configurador declara `pricing.engine: 'PRODUCT_QUOTER'` y el recorrido de `quoteConfiguratorSelection` termina usando `ProductQuoterConfig` y `calculateProductQuote`. Por eso no consume esa matriz de costo terminado para estas selecciones.

### 13.2 Precio que arroja el código actual de la rama

Para un flyer plano de 10×15 cm, ilustración 150 g, 4/4, sin terminaciones y con los datos del seed:

| Cantidad | Costo terminado proveedor registrado | Cálculo del motor actual | Precio que devolvería el motor |
|---:|---:|---|---:|
| 1.000 | $32.000 | Anidado en pliego 32×47; 9 piezas/pliego; 112 pliegos × $195 = $21.840 de costo de papel; aplica recargo de 150% | $54.690 |
| 5.000 | $85.000 | 556 pliegos × $175 = $97.300 de costo de papel; aplica recargo de 150% | $243.290 |

Los resultados se derivan del código fuente y los tiers versionados; no son una llamada a producción ni una prueba contra la base de datos actual. El script `scripts/test-flyers-configurator-e2e.ts` requiere `DATABASE_URL` y una base con los registros correspondientes para confirmar el resultado en ejecución.

La comparación revela dos problemas:
- El motor calcula papel + terminaciones de la matriz de pliegos, aunque el costo terminado de proveedor ya contempla impresión, terminación, empaquetado y caja. Para 5.000 unidades, además, el costo teórico de papel ($97.300) supera el costo terminado registrado ($85.000), señal clara de que no se deben mezclar estas dos fuentes.
- `profitMargin: 150` significa recargo sobre costo (×2,5), no margen bruto de 40% ni margen mínimo de 35%. El campo `marginPercent` que devuelve el motor representa ese recargo y no debe interpretarse como margen bruto comercial.

### 13.3 Precio objetivo vs. costo vigente

Se mantienen como objetivos comerciales sujetos a aprobación técnica:
- 1.000 unidades: $72.000 final, suponiendo IVA incluido; costo $32.000 → margen bruto estimado 46,2% sobre venta neta de IVA.
- 5.000 unidades: $166.500 final, suponiendo IVA incluido; costo $85.000 → margen bruto estimado 38,2% sobre venta neta de IVA.

El segundo precio queda por debajo del objetivo del 40%, pero supera el piso comercial acordado del 35%, siempre que no falten costos directos absorbidos por ZAP.

### 13.4 Corrección implementada en la rama; validación pendiente

Se implementó una resolución acotada para estas dos configuraciones: `commercialPriceOverrides` consulta el costo terminado de `providerFinishedCostMatrix.matrix`, conserva los precios públicos explícitos de $72.000 y $166.500, calcula margen bruto sobre venta neta de IVA y bloquea si queda por debajo del 35%. Las demás configuraciones no coincidentes continúan por el flujo anterior.

No se cambió el costo del proveedor ni el `profitMargin` global. Se añadieron pruebas contractuales para ambas cantidades y para el bloqueo por margen insuficiente. Falta ejecutar `npm test` y la prueba de integración con `DATABASE_URL` antes de considerar validada la corrección. La implementación debe:

1. Resolver explícitamente estas configuraciones de flyers offset contra la matriz de **producto terminado** vigente ($32.000 / $85.000), no contra el costo de papel por pliego.
2. Permitir precios comerciales de venta definidos por configuración/cantidad —$72.000 y $166.500 para estas dos combinaciones— sin convertirlos en un multiplicador genérico del costo.
3. Validar automáticamente el margen bruto real a partir del costo de proveedor sin IVA y del precio público final con IVA; bloquear si cae por debajo del 35%.
4. Mantener separadas las demás modalidades (otros papeles, impresión digital bajo demanda, dípticos y trípticos) hasta tener su propia equivalencia de costo y precio. No redirigir todo el configurador a un único proveedor si la selección no está cubierta.
5. Añadir pruebas unitarias del cálculo y un caso de integración que compruebe el recorrido API → cotizador → carrito con los mismos importes y tratamiento de IVA.

**Estado actual de esta combinación: CORRECCIÓN IMPLEMENTADA EN LA RAMA, PENDIENTE DE PRUEBAS.** No activar en producción hasta ejecutar las pruebas de contrato, verificar el recorrido real API → cotizador → carrito y confirmar que el tratamiento de IVA sea consistente en pantalla y checkout. El bloqueo nunca fue por vigencia del costo.
