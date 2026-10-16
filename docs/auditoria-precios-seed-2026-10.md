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
