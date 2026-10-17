# Matriz de costos, precios tentativos y competencia — Tienda ZAP

**Corte de análisis:** 17/10/2026  
**Estado:** revisión competitiva y ampliación de matrices en `main` el 17/10/2026. Tarjetas: digital y offset separados; flyers: se retira allowlist restrictiva y se resuelven costos digitales/offset; stickers y carpetas ajustan recargo. Los cambios están en código/seed, no desplegados ni verificados en producción.
**Moneda:** ARS. Salvo indicación, los costos del seed se consideran netos de IVA según sus comentarios; confirmar tratamiento fiscal y vigencia antes de aprobar.

## 1. Criterio de cálculo

No confundir recargo con margen:

- **Multiplicador sobre costo:** precio neto / costo completo.
- **Margen bruto:** (precio neto − costo completo) / precio neto.
- **Precio neto objetivo:** costo completo / (1 − margen objetivo).
- **Precio final:** precio neto + impuestos aplicables.
- **Precio de Mercado Libre:** además debe cubrir comisión efectiva, financiación, envío subsidiado, impuestos/percepciones y otros cargos de la operación. No usar automáticamente el mismo precio de la tienda directa.

Equivalencias orientativas si el costo está completo y no hay cargos variables omitidos:

| Margen bruto objetivo | Multiplicador equivalente |
|---:|---:|
| 25% | 1,33× |
| 30% | 1,43× |
| 35% | 1,54× |
| 40% | 1,67× |
| 45% | 1,82× |
| 50% | 2,00× |
| 60% | 2,50× |

El multiplicador histórico **×2,5** produce 60% de margen bruto teórico sobre el precio neto, pero solo si se aplica sobre el costo completo y antes de comisiones/gastos que no estén incorporados. Para Mercado Libre, calcular el precio requerido a partir de los cargos reales del canal; no sumar una comisión “promedio” sin consultar la categoría y modalidad vigentes.

## 2. Precios tentativos que se pueden estimar con cautela

Los precios finales de esta tabla son **hipótesis comerciales**, no aprobación de publicación. Se toma IVA 21% únicamente como supuesto de cálculo para estos impresos; confirmar con administración/contador.

| Producto / configuración de referencia | Costo seed neto | Competencia pública comparable o más cercana | Precio ZAP tentativo final | Multiplicador neto | Margen bruto estimado | Decisión |
|---|---:|---|---:|---:|---:|---|
| Tarjetas: 350 g, 9×5 cm, costos digitales cargados | 100 u. 4/4 sin laminar: $8.213; 200 u.: $12.361; 300 u.: $17.029; 500 u. 4/0 sin laminar: $19.219 (netos) | Tecnoplotter: 500, 350 g, 4/4, laminado brillo frontal, diseño incluido, $61.250 final. | **Activación revisada**: digital $12.490 (100 u. 4/4 sin laminar) y $60.490 (500 u. 4/4 sin laminar); offset $68.790 (1.000 u. 4/4 sin laminar) | 1,25× | ≈20% antes de cargos omitidos | Habilitar combinaciones con costo explícito y recargo comercial. Las celdas offset de 3.000/5.000 unidades cuyo costo es menor al de 1.000 quedan bloqueadas hasta confirmar la lista del proveedor. |
| Stickers circulares: 500 u., papel autoadhesivo 90 g, 5×5 cm, laca UV incluida | $19.231 | Cien por Ciento de Folletos: $47.250 / 500 u. de 5 cm; Dokan: $55.000 / 500 u. de 5 cm. | **$48.890 final, IVA incluido** | 2,79× | ≈56,6% | Habilitado solo para esta combinación; queda prácticamente 5% sobre la mediana de las dos referencias ($51.125). Otras cantidades/medidas siguen en consulta.
| Carpetas: 50 u., ilustración 300 g, A4, 4/0, sin laminar, solapa blanca | $82.350 (50 × $1.647 netos) | Imprimime: carpetas 300 g, full color, 1 solapa, 50 u. $107.793 + IVA (≈ $130.430 final con IVA 21%). | **$129.590 final, IVA incluido** | 1,40× | ≈28,6% | Habilitable: queda ≈7,0% sobre la referencia final. La matriz de proveedor incluye solapa blanca; confirmar que el alcance público coincida con esa descripción. |
| Flyers planos: 1.000 u., 10×15 cm, 4/4, costo offset terminado | Obra 80 g: $23.000; ilustración 115 g: $25.000; ilustración 150 g: $32.000 netos | Gráfica Expresiones: $49.900 / 1.000, 10×15, 115 g, 4/4; Gráfica Lugano: $65.000. | **$43.190 / $46.890 / $50.390 final**, según gramaje | 1,55× / 1,55× / 1,30× | ≈35,5% / 35,5% / 23,1% | Offset habilitado en 1.000/2.500/5.000 u. para 10×15 cm, plano, 4/4. El resto de formatos, cantidades y plegados se cotiza automáticamente solo cuando la matriz digital contiene la celda exacta; las combinaciones sin costo siguen en consulta.
| Tags: 500 u., ilustración 350 g, impresión frontal, perforación | **No validado como costo de producto terminado** | Imprenta DUBIÉ: 500 tags 6×6 cm, ilustración 350 g, impresión frontal y troquelado, $58.000. Mercado Libre: 500 tags Kraft 220 g, negro 1 cara y perforación incluida, $99.750; especificación distinta. | **No fijar todavía** | — | — | Bloqueado: comparables públicos existen pero no son equivalentes entre sí; el motor no incorpora impresión de proveedor y la perforación requiere costo completo. Obtener costo terminado de 500 unidades por formato/gramaje/caras. |
| Adhesivos & Stickers fuera del formato circular 5×5 | **No disponible para toda la familia** | Sin referencia equivalente verificada por formato, soporte, corte y cantidad. | **Consulta / no automatizar** | — | — | La matriz actual solo cubre configuraciones circulares determinadas. No extrapolar a vinilo, plancha o corte individual. |

### Cómo leer los tentativos

- **Flyers:** se prioriza el costo offset de producto terminado cuando la selección coincide exactamente con la matriz del proveedor. Se habilitan 1.000, 2.500 y 5.000 u. planas, 10×15 cm, 4/4 en los tres papeles con costo cargado. A 1.000 u.: obra 80 g $43.190; ilustración 115 g $46.890; ilustración 150 g $50.390, todos finales con IVA incluido. La matriz digital queda habilitada en todas las celdas que resuelve.
- **Tarjetas:** se separan digital y offset. Ambas usan recargo del 25% sobre costo neto, más IVA 21%. Ejemplos finales: digital 100 u. 4/4 sin laminar $12.490; digital 500 u. 4/4 sin laminar $60.490; offset 1.000 u. 4/4 sin laminar $68.790; offset 1.000 u. OPP mate $80.190. El precio de 500 u. 4/4 queda alineado con la referencia minorista de Tecnoplotter ($61.250) para 500 u. 350 g 4/4 laminadas al frente; el precio offset de 1.000 u. queda cerca de Gráfica Lugano ($70.000) para 1.000 u. 350 g 4/4 con laminado brillo.
- **Stickers:** se habilitan todas las medidas y cantidades que figuran con costo explícito en la matriz, únicamente para forma circular, papel autoadhesivo 90 g y laca UV brillo incluida. El recargo baja al 110% sobre costo neto + IVA 21%. El caso comparable 500 u. de 5×5 cm queda a $48.890 final, aproximadamente 5% sobre la mediana de las referencias públicas ($47.250 y $55.000).
- **Carpetas:** con recargo del 30%, la referencia de 50 u. queda en $129.590 final, aproximadamente alineada con Imprimime (~$130.430 final). El margen bruto estimado es ≈23,1%; no incluye gastos operativos no modelados.
- Los márgenes se estiman contra el costo seed y no incluyen cargos no modelados. No publicar hasta completar la validación.

## 3. Inventario de los 31 productos del seed

**Regla:** “sin costo validado” no significa costo cero. No inventar precio para completar el catálogo. En productos de servicios, costear horas de producción, revisión, coordinación, herramientas, capacidad no facturable y alcance; no usar el multiplicador de imprenta.

| # | Producto | Estado de costo / precio para esta auditoría | Competencia / próximo paso |
|---:|---|---|---|
| 1 | Tarjetas & Vouchers | Matriz disponible; costo 500 u. 350 g 4/4 sin laminar $39.930 neto, vigencia por confirmar. Se habilitan celdas digitales y offset con costo explícito; confirmar los costos clásicos offset de 3.000/5.000 por valores no monotónicos. | Contrastar misma cantidad, gramaje, impresión y terminación. |
| 2 | Flyers & Desplegables | Se amplía en `main`: offset para 10×15 cm, plano, 4/4 en 1.000/2.500/5.000 u.; digital en todas las celdas con costo explícito. A 1.000 u. los precios finales son $43.190 (obra 80 g), $46.890 (ilustración 115 g) y $50.390 (ilustración 150 g). | Formatos/plegados sin celda de costo permanecen en consulta. |
| 3 | Tags & Etiquetas | Cotizador con impresión no incorporada y perforación subcosteada. | Rehacer costo completo y comparar con cantidad explícita. |
| 4 | Adhesivos & Stickers | Habilitadas todas las combinaciones circulares con costo cargado; 5×5 cm, 500 u. $48.890 final con IVA incluido. Costo seed $19.231 neto. | Comparar equivalentes; no extrapolar. |
| 5 | Fajas & Envoltorios | No hay matriz de producto terminado activa identificada. | Solicitar costo por medida, papel, impresión, adhesivo y cantidad. |
| 6 | Bolsas & Contenedores | No hay matriz de producto terminado activa identificada. | Comparar material, tamaño, manija, impresión por cara y cantidad. |
| 7 | Cajas Personalizadas | Consulta; costo depende de estructura y troquel. | Cotización por medidas, material, impresión, cantidad y armado. |
| 8 | Carpetas & Folders | Matriz 300 g y matriz offset 350 g; margen maestro ausente en seed. Ejemplo 50 u. 300 g 4/0 sin laminar: costo base $82.350 neto. | Comparar cantidad, solapa, caras, gramaje, laminado, diseño y envío. |
| 9 | Menús & Cartas | Sin matriz activa identificada. | Costear hojas/plegado/encuadernado, protección, cantidad y reposición. |
| 10 | Individuales & Posavasos | Sin matriz activa identificada. | Cotizar material, contacto con alimentos, impresión y tirada. |
| 11 | Cartelería & Ploteo | Configurador DRAFT; costos de gran formato parciales por componentes. | No fijar precio general sin material, impresión, corte, instalación y traslado. |
| 12 | Corpóreos & Marquesinas | Configurador DRAFT; costo final requiere fabricación e instalación. | Cotizar por material, espesor, iluminación, estructura, montaje y traslado. |
| 13 | Señalética & Placas | Configurador DRAFT. | Cotizar soporte, tamaño, grabado/impresión, fijación e instalación. |
| 14 | Expositores & Stands | Configurador DRAFT. | Cotizar estructura, gráfica, armado, embalaje, envío y reutilización. |
| 15 | Indumentaria & Textil | Configurador DRAFT. | Cotizar prenda, técnica, ubicación, cantidad, talles y merma. |
| 16 | Objetos & Regalería | Producto directo sin precio/costo validado en el seed de producto. | Costear producto base, personalización, mínimo de compra y logística. |
| 17 | Activos Web & Sitios | Servicio configurable sin costo de producción asociado en seed. | Definir paquetes por alcance y costear horas, integraciones, QA y mantenimiento. |
| 18 | Asistentes & Bots | Servicio configurable sin costo asociado en seed. | Costear descubrimiento, flujo, integraciones, pruebas, uso de APIs y soporte. |
| 19 | Anuncios & Campañas | Servicio configurable sin costo asociado en seed. | Separar honorarios de inversión publicitaria y definir entregables/periodicidad. |
| 20 | Producción Audiovisual | Consulta; no hay costo fijo. | Cotizar preproducción, equipo, jornadas, locación, edición, traslados y derechos. |
| 21 | Sistema de Identidad | Consulta; no hay costo fijo. | Costear fases, aplicaciones, rondas de revisión y manual/entregables. |
| 22 | Operaciones & Consultoría | Consulta; no hay costo fijo. | Definir alcance, horas de diagnóstico, entregable y seguimiento. |
| 23 | Sistema de Captación para Eventos | Consulta; no hay costo fijo. | Costear diseño del mecanismo, herramientas, operación, integraciones y medición. |
| 24 | Diseño de Flyer / Volante | Seed contiene precio $128.792, sin costo/hora visible. | Comparar alcance exacto y separar diseño de impresión. |
| 25 | Diseño de Cartel / Afiche | Seed contiene precio $225.386, sin costo/hora visible. | Comparar formato, complejidad, adaptaciones y revisiones. |
| 26 | Diseño Pack de piezas para redes (10) | Seed contiene precio $225.386, sin costo/hora visible. | Comparar 10 piezas originales vs adaptaciones y rondas de cambios. |
| 27 | Diseño de Cartelería / Rótulos | Seed contiene precio $289.782, sin costo/hora visible. | Comparar cantidad de formatos, adaptaciones y preparación de originales. |
| 28 | Diseño de Menú Gastronómico | Seed contiene precio $321.980, sin costo/hora visible. | Comparar páginas, cantidad de productos, carga/orden de contenidos y revisiones. |
| 29 | Diseño de Vidriera | Seed contiene precio $402.475, sin costo/hora visible. | Comparar concepto, fotomontaje, medidas, adaptaciones y archivo de producción. |
| 30 | Diseño de Etiquetas | Seed contiene precio $241.485, sin costo/hora visible. | Comparar cantidad de variantes/SKU, información legal y preparación de impresión. |
| 31 | Diseño de Papelería Corporativa | Seed contiene precio $536.097, sin costo/hora visible. | Definir piezas incluidas, sistema visual, variantes y manual/archivos. |

## 4. Política de margen recomendada para la primera pasada

| Familia | Margen bruto objetivo inicial | Multiplicador neto equivalente | Condición |
|---|---:|---:|---|
| Impresos tercerizados de catálogo | 30–35% | 1,43–1,54× | Solo con costo vigente y especificación cerrada. |
| Impresos con control, preparación o gestión adicional | 35–40% | 1,54–1,67× | Incorporar esas tareas al costo completo. |
| Productos donde ZAP absorbe complejidad, riesgo o coordinación | 40–45% | 1,67–1,82× | Debe justificarse por trabajo/riesgo real y mercado. |
| Gran formato, fabricación e instalación | No fijar globalmente | — | Costeo por componentes, mano de obra, desperdicio, traslado e instalación. |
| Diseño y servicios propios | Costeo por capacidad/horas | — | Definir tarifa efectiva y capacidad facturable; no copiar margen de reventa. |
| Mercado Libre | Margen objetivo + cargos reales de canal | Variable | Simular comisión, cuotas, envío, impuestos/percepciones y promoción por publicación. |

No se recomienda fijar un precio para todos los productos mediante ×2,5. Ese multiplicador puede servir para una primera estimación histórica, pero en el costo completo hay que incorporar costos omitidos y después resolver el canal. El precio se redondea comercialmente solo después de validar margen y competencia.

## 5. Referencias de competencia revisadas el 17/10/2026

1. **Tecnoplotter — tarjetas 500 u. 350 g, 4/4, laminado brillo frontal, diseño incluido: $61.250 publicado.**  
   https://tecnoplotter.com.ar/productos/500-tarjetas-doble-faz-brillo-350g/
2. **Imprimime — tarjetas brillantes 500 u., 300 g, 4/4, laca UV frontal: $34.290 + IVA** (lista vigente al 10/10/2026). Es menor gramaje y otra terminación.  
   https://www.imprimime.com.ar/tarjetas-personales/tarjetas-personales-brillantes
3. **Imprimime — lista vigente al 10/10/2026, precios sin IVA:** carpetas impresas 1 solapa, 300 g, full color: 10 u. $32.338; 50 u. $107.793; 100 u. $191.632. También publica tarjetas 300 g y otras familias.  
   https://imprimime.com.ar/lista-de-precios
4. **Gráfica Lugano:** referencia pública de volantes 10×15 cm, 1.000 u. 115 g, doble faz, $65.000; sin diseño.  
   https://www.graficalugano.com.ar/folleteria-flyers-y-volantes/
5. **Gráfica Expresiones:** 1.000 flyers 10×15 cm, 115 g, 4/4, sin diseño, $49.900 publicado; entrega declarada de 10–15 días.  
   https://www.graficaexpresiones.com.ar/general/1000-folletos-volantes-10x15-full-color-doble-faz-115-g
6. **Mercado Libre:** 1.000 folletos 10×15 cm, doble faz, $40.000 publicado; confirmar gramaje y condiciones de envío/canal.  
   https://www.mercadolibre.com.ar/1000-folletos-volantes--10x15-cm-full-color-doble-faz-115g/up/MLAU3349007588
7. **Imprenta DUBIÉ:** 500 tags 6×6 cm, ilustración 350 g, impresión frontal con troquelado, $58.000.  
   https://imprentadubie.com.ar/web/producto/tags-bijou-aros-x500/
8. **Mercado Libre:** 500 tags personalizados Kraft 220 g, impresión negra simple faz y perforación, $99.750 publicado; no equivalente al tag de ilustración 350 g.  
   https://www.mercadolibre.com.ar/500-tags-etiquetas-personalizadas-papel-madera-kraft-220gr/up/MLAU152699092
5. **CCprint:** catálogo público de papelería comercial con tags, flyers y carpetas, pero algunas fichas consultadas no permiten comprobar cantidad/especificación a partir del resultado indexado. Usar para descubrir productos, no para comparar sin abrir ficha y validar.  
   https://www.ccprint.com.ar/impresion-digital
6. **E-tiquetas:** referencia de 1.000 etiquetas 80×50 mm $26.000; no comparable directamente con stickers circulares de papel 5×5 cm.  
   Referencia de búsqueda de producto; requiere abrir ficha y confirmar especificación/IVA/entrega antes de tomar decisión.

## 6. Próxima secuencia de trabajo

1. Confirmar con proveedores los costos prioritarios (tarjetas, flyers, tags, stickers y carpetas), con fecha, IVA, cantidad, terminación, entrega y pago.
2. Corregir el motor de Flyers y Tags para incluir impresión y procesos obligatorios; agregar margen maestro para Stickers y Carpetas.
3. Construir casos de prueba reproducibles para cada cantidad/variante realmente vendible; comparar cotizador, carrito y checkout.
4. Obtener comparables equivalentes para cada combinación principal y guardar URL, fecha de consulta y especificación.
5. Incorporar costos de compra/logística, arte, preparación, mermas, cobro y canal cuando correspondan.
6. Calcular precio neto objetivo, IVA, precio final redondeado, multiplicador y margen efectivo.
7. Revisar los ocho precios directos de diseño del seed contra horas/capacidad y competencia antes de aprobarlos.
8. Recién con esta matriz aprobada, cambiar seed/configuradores. Hasta entonces, este documento es una base de decisión y no una orden de publicación.

## 7. Criterio de estado

- **PROVISIONAL:** costo disponible, pero falta validar vigencia, especificación o cargos omitidos.
- **BLOQUEADO:** motor o costo base incorrecto/incompleto; no generar precio automático.
- **SIN COSTO:** requiere cotización o costeo interno.
- **LISTO PARA APROBAR:** costo vigente, especificación comparable, precio y margen recalculados, canal e impuestos probados. Actualmente ningún producto queda en este último estado con la evidencia disponible.


## 8. Revisión competitiva y cambios de activación — 17/10/2026

Esta sección reemplaza los precios tentativos anteriores cuando entren en conflicto con los nuevos valores calculados. Precios de venta finales indicados con el supuesto de IVA del 21% configurado en el cotizador; confirmar tratamiento fiscal antes de publicar.

### Tarjetas: separar método y costo

Fuentes públicas consultadas el 17/10/2026:

- [MEGA IMPRENTA — offset y digital](https://megaimprenta.com.ar/tarjetas-offset-digital/): digital 300 g, 500 u. $17.500 simple faz / $23.500 doble faz; offset con UV, 1.000 u. $29.200 simple faz / $35.400 doble faz; 3.000 u. $78.000 / $96.000; 5.000 u. $127.000 / $149.500.
- [Imprimime — lista de precios](https://imprimime.com.ar/lista-de-precios): precios vigentes al 10/10/2026, sin IVA. Tarjetas offset brillantes 300 g 4/4 + UV frontal: 500 u. $34.290 + IVA; 1.000 u. $45.720 + IVA. Mate: 500 u. $39.320 + IVA; 1.000 u. $52.425 + IVA.
- [Imprenta Lugones — tarjetas](https://www.imprentalugones.com.ar/productos/tarjetas/): precios finales publicados: offset 350 g 4/4 brillante 1.000 u. $62.000; OPP mate $70.500; sectorizadas $73.300.
- [Dokan — tarjetas sectorizadas](https://dokan.com.ar/product/tarjetas-con-laca-sectorizada/): 350 g, 4/4, OPP mate + UV sectorizada; 1.000 u. $125.000 frente / $135.000 frente y dorso.

Los precios publicados de MEGA no indican claramente en la página el tratamiento del IVA; no se deben comparar como si fueran netos o finales sin confirmarlo. Las referencias tampoco tienen idéntico gramaje, entrega y terminación.

| Variante ZAP | Costo de proveedor cargado (neto) | Precio ZAP final calculado | Lectura competitiva |
|---|---:|---:|---|
| Digital 350 g, 100 u., 4/4 sin laminar | $8.213 | $12.490 | Prima de gramaje frente a ofertas económicas de 300 g; validar conversión antes de publicarlo como opción destacada. |
| Digital 350 g, 500 u., 4/4 sin laminar | $39.930 | $60.490 | Cerca de Tecnoplotter ($61.250) para 500 u. 350 g 4/4 con laminado brillo frontal; ZAP queda apenas por debajo y sin laminar. |
| Offset 350 g, 1.000 u., 4/4 sin laminar | $45.477 | $68.790 | Cerca de Gráfica Lugano ($70.000) para 1.000 u. 350 g 4/4 con laminado brillo; el costo fuente sigue requiriendo confirmación de vigencia. |
| Offset 350 g, 1.000 u., 4/4 OPP mate | $53.000 | $80.190 | Aproximadamente 14,5% sobre la referencia de Gráfica Lugano ($70.000) con laminado brillo; mantener como terminación premium y reconfirmar costo fuente. |
| Offset 350 g, 1.000 u., 4/4 OPP mate + UV sectorizada | $39.000 | $47.190 | Muy por debajo de las referencias públicas sectorizadas. Confirmar que el costo de la matriz corresponda realmente a esa terminación antes de tomar pedidos. |

**Activación en código:** se agregó selector digital/offset, mínimo de 1.000 unidades para offset, 300 g/350 g en digital y las cantidades offset cargadas. Las políticas de tarjetas se bajaron a recargo 0% para evitar añadir margen a costos que ya están fuera de mercado. Esto no resuelve la brecha de costo: digital 500 4/4 y algunas celdas offset requieren verificación de lista antes de aceptar una orden.

**Alerta de datos:** las celdas clásicas de offset para 3.000/5.000 u. contienen importes no monotónicos frente a 1.000 u. ($35.000 y $34.000 frente a $45.477). Se habilitaron porque existen como valores explícitos en la matriz, pero quedaron señaladas para la pasada manual. No asumir que son vigentes o correctas sin reconfirmar con el proveedor.

### Flyers: activar todas las celdas digitales y offset que resuelven costo

Referencias actuales:

- [Gráfica Expresiones](https://graficaexpresiones.com.ar/productos/1000-folletos-volantes-10x15-full-color-doble-faz-115-g): 1.000 u., 10×15 cm, 115 g, 4/4, $49.900 publicado.
- [Mercado Libre — 1.000 flyers](https://www.mercadolibre.com.ar/1000-folletos-volantes--10x15-cm-full-color-doble-faz-115g/up/MLAU3349007588): $40.000 publicado; confirmar vendedor, impuestos y vigencia.
- [Imprimime — folletos](https://imprimime.com.ar/folletos/folletos-flyers): offset 4/4, 1.000 u. $64.050 + IVA; 2.500 u. $93.750 + IVA; 5.000 u. $134.250 + IVA.
- [Gráfica Lugano](https://www.graficalugano.com.ar/): 10×15 cm, 1.000 u. $65.000 y 5.000 u. $150.000; no incluye diseño.

| Variante offset 10×15 cm, 4/4 | Costo cargado neto | Precio ZAP final |
|---|---:|---:|
| 1.000 u., obra 80 g | $23.000 | $43.190 |
| 1.000 u., ilustración 115 g | $25.000 | $46.890 |
| 1.000 u., ilustración 150 g | $32.000 | $50.390 |

Se eliminó la allowlist que bloqueaba el resto de las celdas y se conectó la clave de materiales de la matriz digital (obra 80 g e ilustración 115 g comparten la tarifa de origen). Para offset se aplican recargos moderados por gramaje; para digital, recargo 0% cuando la matriz digital cargada supera el mercado. La matriz offset dice vigencia junio-julio 2026: las combinaciones se habilitan en código, pero la fuente está vencida y debe reconfirmarse antes de producción.

### Stickers circulares: ajustar a referencias por tamaño y cantidad

Referencias actuales:

- [Gráfica B377](https://graficab377.com/servicios/stickers): circular de 5 cm, 500 u. $60.000; 1.000 u. $110.000. Circular de 8 cm, 500 u. $150.000.
- [Dokan](https://dokan.com.ar/product/stickers-redondos/): circular de 5 cm, 500 u. $55.000; 1.000 u. $95.000.

Se redujo el recargo del 130% al 110% sobre el costo neto. Ejemplo 5×5 cm: 500 u. pasa de $53.590 a **$48.890 final**; 1.000 u. queda en **$93.690 final**. Ambos valores quedan ligeramente por debajo de las referencias públicas para 5 cm. Se mantienen activas las combinaciones de la matriz circular con laca UV incluida; no se extrapola a vinilo ni a cortes no circulares.

### Carpetas: acercar el precio al mercado sin cambiar el costo cargado

Referencias actuales:

- [Imprimime — lista vigente al 10/10/2026](https://imprimime.com.ar/lista-de-precios): 50 carpetas 300 g, una solapa, full color: $107.793 + IVA (~$130.430 final con IVA 21%).
- [Imprenta Lugones](https://www.imprentalugones.com.ar/productos/carpetas/): papel 300 g, 50 carpetas $97.400 final.
- [Mercado Libre — 50 carpetas](https://www.mercadolibre.com.ar/50-carpetas-institucionales-a4-300g--solapa--diseno-gratis/up/MLAU190281256): 50 carpetas de 350 g con solapa y diseño, $176.284,50 final.

Se redujo el recargo del 40% al 30%. Para 50 unidades, 4/0 sin laminar, el precio calculado pasa de $139.590 a **$129.590 final**, prácticamente alineado con la referencia final de Imprimime. El comparador de Lugones es más económico, pero la descripción no permite asegurar equivalencia exacta de diseño y terminación.

### Qué queda sin activación automática

- **Tags & Etiquetas:** sigue en consulta. Tiene papel y terminaciones cargados, pero el costo terminado aún no incorpora de forma verificable la impresión del producto completo; la perforación también tiene una deuda de costeo documentada. No presentar un costo parcial como si fuera costo de producto terminado.
- **Formatos, papeles, cantidades o terminaciones fuera de las celdas existentes:** permanecen en consulta. Una opción visible no implica que toda combinación tenga costo.
- **Fajas, bolsas, menús e individuales:** sus configuradores siguen en DRAFT sin matriz de costo terminado activa.

### Estado de entrega

Los cambios están guardados en `main` con nuevas versiones de configuración para tarjetas, flyers, stickers y carpetas. **No se ejecutaron las pruebas en un entorno local ni se sincronizó producción**; antes de publicar hay que correr la suite, revisar la selección de variantes en la interfaz y comprobar cotización, carrito e impuestos de extremo a extremo.
