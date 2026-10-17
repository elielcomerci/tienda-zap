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



### P0 — Hallazgo inicial: Stickers y Carpetas sin margen maestro

En la revisión inicial, `initialQuoterConfigs` no declaraba margen para `adhesivos-stickers` ni `carpetas-folders`, aunque ambos usaban `PROVIDER_FINISHED_COST`. La decisión posterior no fue aplicar el mismo recargo a ambos: se contrastó la matriz con referencias de mercado y se documentó el resultado en la sección 9. Carpetas recibió una política comercial explícita; Stickers quedó en consulta porque el costo disponible no permite asegurar un precio rentable y 5–10% por encima de referencias públicas.

La sección 9 reemplaza la recomendación inicial de agregar un margen maestro genérico a ambos productos.

## 9. Primera ejecución de la auditoría — 17/10/2026

Se implementaron controles comerciales explícitos en la rama `feat/precios-publicables-impresos-20261017`. Esta fase distingue entre tener una cifra de costo y tener una combinación vendible a un precio competitivo.

### Decisiones aplicadas

- **Carpetas & Folders:** precio automático para la matriz digital de 300 g con una política explícita de recargo del 72,5% sobre costo neto e IVA del 21%. Para la selección predeterminada de 50 unidades, 4/0, sin laminar, el costo de proveedor es $82.350 y el precio final calculado es **$171.890**. Como referencias, Oink publica $160.000 finales por 50 carpetas A4 en ilustración 300 g antes de laminado/interior, y una publicación de MercadoLibre lista 50 carpetas A4 con solapa y diseño por $176.284,50; las especificaciones no son idénticas y deben mantenerse como referencias, no como cotizaciones equivalentes. Fuentes: https://www.holaoink.com.ar/oink_lista_precios_2026_iva.html y https://www.mercadolibre.com.ar/50-carpetas-institucionales-a4-300g--solapa--diseno-gratis/up/MLAU190281256
- **Adhesivos & Stickers:** se mantiene en consulta comercial. La matriz tiene, por ejemplo, $19.231 de costo para 500 stickers circulares de 5 cm. Una lista pública de Bayres al Sur muestra precios finales de $15.000/$22.200 para 500 stickers circulares de 5 cm en dos columnas de terminación; la especificación exacta y vigencia no son suficientes para una equivalencia cerrada, pero el costo actual no deja margen operativo seguro para fijar un precio 5–10% por encima del mercado. No se agrega un recargo arbitrario: se necesita una tarifa de proveedor mejor o una confirmación de que las celdas y unidades de costo son correctas. Fuente: https://sistema.bayresalsur.com.ar/lista/Lista_de_precios.pdf
- **Tarjetas & Vouchers:** la matriz aplica recargo del 90% más IVA del 21% solo a las cantidades 100 y 200. Las cantidades 300, 500 y 1.000 pasan a consulta hasta confirmar el costo, porque varias celdas se acercan o superan precios minoristas comparables antes de margen. No se corrige el costo fuente sin una cotización de proveedor verificable.
- **Flyers & Desplegables:** pasa a consulta comercial. La matriz offset indica vigencia junio-julio de 2026, ya vencida, y el cálculo anterior podía omitir el costo de impresión al usar el motor físico. No se ofrece precio automático hasta actualizar la fuente y resolver la integración del costo terminado.
- **Tags & Etiquetas:** pasa a consulta comercial mientras no haya costo de impresión terminado conectado. El motor anterior podía sumar papel y terminaciones sin incluir impresión.
- **Perforación de Tags:** se corrigen los tiers para representar costos fijos por lote documentados: $3.225 para 500 unidades y $4.500 para 1.000. No se extrapolan cantidades que no tengan precio de proveedor cargado.

### Resultado comercial

Por ahora, quedan habilitados para precio automático la matriz digital de Carpetas y las tiradas de 100/200 tarjetas; las tiradas mayores de tarjetas y los configuradores de Stickers, Flyers y Tags devuelven consulta en vez de una cifra potencialmente engañosa. Esto es intencional: **no se considera activado comercialmente un producto si el precio automático puede ocultar un costo vencido, incompleto o fuera de mercado**.

### Verificación técnica pendiente antes de desplegar

- Ejecutar `npm test` y comprobar el precio calculado de cada caso de prueba en el entorno del repositorio.
- Confirmar con contador la aplicación de IVA del 21% a las ventas de estos productos.
- Obtener cotización vigente para tarjetas en tiradas de 300 o más, stickers circulares, flyers offset/digital y tags impresos.
- Revisar que la interfaz y el carrito presenten como precio final el total con IVA para las configuraciones que sí están habilitadas.

## 10. Revisión comercial con listas de proveedor confirmadas — 17/10/2026

El usuario confirmó que las listas de proveedor ya cargadas en el seed siguen vigentes. Esta confirmación reemplaza las advertencias anteriores que condicionaban la decisión únicamente a la antigüedad declarada de la lista. Se evalúa con los importes y especificaciones existentes, sin inventar costos nuevos.

Cambios implementados en `main`:

- **Tarjetas:** política de recargo del 90% + IVA 21%. Se habilitan combinaciones de 100, 200 y 300 unidades cubiertas por la matriz de costo; para 500 unidades solo se habilita 4/0 sin laminar. Las restantes combinaciones de 500 y todas las de 1.000 siguen en consulta por brechas de costo/precio frente a referencias minoristas. Ejemplos finales con IVA incluido: 100 u. 4/4 sin laminar $18.890; 200 u. $28.490; 300 u. $39.190; 500 u. 4/0 sin laminar $44.190.
- **Flyers:** se conecta el resolver con la matriz de costo offset terminado. Se habilitan las cantidades 1.000, 2.500 y 5.000 u. para 10×15 cm, plano, 4/4 y los tres papeles con costo explícito. Precios finales con IVA incluido y recargo del 100%: 1.000 u. obra 80 g $48.790; ilustración 115 g $60.490; ilustración 150 g $67.790. Las demás combinaciones siguen en consulta.
- **Carpetas:** la política cambia de 72,5% a 40% de recargo + IVA 21%. Para 50 u., A4, 300 g, 4/0 sin laminar, solapa blanca, el costo neto es $82.350 y el motor calcula $139.590 final, con margen bruto aproximado de 28,6% sobre la venta neta. La referencia pública de Imprimime equivale a unos $130.430 finales para 50 u.; el precio ZAP queda cerca de 7% por encima.
- **Stickers:** se habilitan todas las combinaciones circulares con costo explícito en la matriz (8 medidas × 5 cantidades), solo en papel autoadhesivo 90 g y laca UV incluida, con recargo del 130% + IVA 21%. La referencia 500 u. de 5×5 cm queda a $53.590 final.
- **Tags:** continúa en consulta. Aunque hay costos de papel y terminaciones, el motor todavía no suma un costo de impresión terminado; no corresponde habilitarlo solo con esos componentes.

La matriz detallada y las referencias competitivas se registran en `docs/matriz-precios-competencia-2026-10.md`.

**Límite de verificación:** los cambios de código y pruebas se guardaron en `main`, pero las pruebas no se ejecutaron en este flujo y no se confirmó el despliegue ni la actualización de la base de datos de producción. El commit en `main` no equivale a precio publicado en tienda. La habilitación efectiva sigue sujeta a las compuertas de auditoría/publicación existentes.

