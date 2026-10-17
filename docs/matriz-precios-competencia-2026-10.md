# Matriz de costos, precios tentativos y competencia — Tienda ZAP

**Corte de análisis:** 17/10/2026  
**Estado:** revisión competitiva y ampliación de matrices en `main` el 17/10/2026. Tarjetas y flyers: recargos recalibrados; offset con costos no monotónicos bloqueado. Tags: activado el alcance de 500 u. 9×5 cm con papel, impresión digital y perforación costados. Expositores & Stands: activado un alcance acotado para portabanner doble tensor y roll up con costo terminado. Los cambios están en código/seed, no desplegados ni verificados en producción.
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
| Tarjetas: 350 g, 9×5 cm, costos digitales cargados | 100 u. 4/4 sin laminar: $8.213; 200 u.: $12.361; 300 u.: $17.029; 500 u. 4/0 sin laminar: $19.219 (netos) | Tecnoplotter: 500, 350 g, 4/4, laminado brillo frontal, diseño incluido, $61.250 final; Gráfica Lugano: 1.000 u. 350 g, 4/4, laminado brillo, $70.000. | **Activación revisada**: digital $12.490 (100 u. 4/4 sin laminar) y $29.090 (500 u. 4/0 sin laminar); offset $63.290 (1.000 u. 4/4 sin laminar). La combinación digital 500 u. 4/4 queda en consulta: costo $39.930 neto y precio teórico $60.490, por encima de la referencia comparable. | 1,25× digital / 1,15× offset | ≈20% digital / ≈13% offset | Habilitar combinaciones con costo explícito y recargo comercial. Las celdas offset de 3.000/5.000 unidades cuyo costo es menor al de 1.000 quedan bloqueadas hasta confirmar la lista del proveedor. |
| Stickers circulares: 500 u., papel autoadhesivo 90 g, 5×5 cm, laca UV incluida | $19.231 | Dokan: $55.000 / 500 u. de 5 cm; Gráfica B377: $60.000 / 500 stickers circulares de 5 cm. | **$48.890 final, IVA incluido** | 2,10× | ≈52,4% | Habilitado solo para esta combinación; queda ≈15% por debajo de la mediana de las dos referencias ($57.500). Otras cantidades/medidas siguen en consulta. |
| Carpetas: 50 u., ilustración 300 g, A4, 4/0, sin laminar, solapa blanca | $82.350 (50 × $1.647 netos) | Imprenta Más: carpetas A4, ilustración 300 g, 4/0 sin laminar, 50 u. $144.901 final; Mercado Libre: 50 carpetas A4 300 g con solapa, $176.284,50. | **$129.590 final, IVA incluido** | 1,30× | ≈23,1% | Habilitable: queda ≈10,6% por debajo de la referencia de Imprenta Más. La matriz de proveedor incluye solapa blanca; confirmar que el alcance público coincida con esa descripción. |
| Flyers planos: 1.000 u., 10×15 cm, 4/4, costo offset terminado | Obra 80 g: $23.000; ilustración 115 g: $25.000; ilustración 150 g: $32.000 netos | Mercado Libre: $40.000 / 1.000, 10×15, 115 g, 4/4; Gráfica Expresiones: $49.900; Gráfica Lugano: $65.000. | **$43.190 / $46.890 / $50.390 final**, según gramaje | 1,55× / 1,55× / 1,30× | ≈35,5% / 35,5% / 23,1% | Offset habilitado en 1.000/2.500/5.000 u. para 10×15 cm, plano, 4/4. El resto de formatos, cantidades y plegados se cotiza automáticamente solo cuando la matriz digital contiene la celda exacta; las combinaciones sin costo siguen en consulta. |
| Tags: 500 u., ilustración 350 g, 9×5 cm, perforación | Costeo estimado conservador: papel + impresión digital por pliego + perforación; 24 tags/pliego como reserva de corte/merma. | Oink: 500 u. 4/4 sin laminar $44.000 + IVA ($53.250 final); con laminado mate $58.000 + IVA ($70.200 final). | **$57.190 final 4/4 sin laminar; $66.390 con OPP brillo frontal** | 1,20× sobre costo neto | ≈16,7% | Activado solo en 500 u. 9×5 cm, con costos desglosados y perforación incluida. 1.000 u. sigue en consulta porque el costo digital no compite con la alternativa offset publicada. |
| Adhesivos & Stickers fuera del formato circular 5×5 | **No disponible para toda la familia** | Sin referencia equivalente verificada por formato, soporte, corte y cantidad. | **Consulta / no automatizar** | — | — | La matriz actual solo cubre configuraciones circulares determinadas. No extrapolar a vinilo, plancha o corte individual. |

### Cómo leer los tentativos

- **Flyers:** se prioriza el costo offset de producto terminado cuando la selección coincide exactamente con la matriz del proveedor. Se habilitan 1.000, 2.500 y 5.000 u. planas, 10×15 cm, 4/4 en los tres papeles con costo cargado. A 1.000 u.: obra 80 g $43.190; ilustración 115 g $46.890; ilustración 150 g $50.390, todos finales con IVA incluido. La matriz digital queda habilitada en las celdas con costo exacto, con recargo del 25% sobre costo neto + IVA; se bloquea digital 500 u. 4/4 porque el costo de proveedor no permite una posición competitiva. La referencia de 100 u. 10×15 cm 4/4 queda a $22.690 final.
- **Tarjetas:** se separan digital y offset. Digital usa recargo del 25% y offset del 15% sobre costo neto, más IVA 21%. Ejemplos finales: digital 100 u. 4/4 sin laminar $12.490; digital 500 u. 4/0 sin laminar $29.090; offset 1.000 u. 4/4 sin laminar $63.290; offset 1.000 u. OPP mate $73.790. Digital 500 u. 4/4 permanece en consulta: el costo actual es $39.930 neto, superior al neto implícito de la referencia minorista de 500 u. con laminado UV. La tarifa UV sectorizada de 1.000 u. queda en consulta porque el costo cargado es menor que el de la versión clásica sin laminar. El precio de 500 u. 4/4 queda alineado con la referencia minorista de Tecnoplotter ($61.250) para 500 u. 350 g 4/4 laminadas al frente; el precio offset de 1.000 u. queda cerca de Gráfica Lugano ($70.000) para 1.000 u. 350 g 4/4 con laminado brillo.
- **Stickers:** se habilitan todas las medidas y cantidades que figuran con costo explícito en la matriz, únicamente para forma circular, papel autoadhesivo 90 g y laca UV brillo incluida. El recargo queda en 110% sobre costo neto + IVA 21%. El caso comparable 500 u. de 5×5 cm queda a $48.890 final, aproximadamente 15% por debajo de la mediana de las referencias públicas actuales ($55.000 y $60.000).
- **Carpetas:** con recargo del 30%
- Los márgenes se estiman contra el costo seed y no incluyen cargos no modelados. No publicar hasta completar la validación.

## 3. Inventario de los 31 productos del seed

**Regla:** “sin costo validado” no significa costo cero. No inventar precio para completar el catálogo. En productos de servicios, costear horas de producción, revisión, coordinación, herramientas, capacidad no facturable y alcance; no usar el multiplicador de imprenta.

| # | Producto | Estado de costo / precio para esta auditoría | Competencia / próximo paso |
|---:|---|---|---|
| 1 | Tarjetas & Vouchers | Matriz disponible; costo 500 u. 350 g 4/4 sin laminar $39.930 neto, vigencia por confirmar. Recargo 25% + IVA. Se bloquean las celdas offset de 3.000/5.000 u. con costo inferior al de 1.000 hasta reconfirmar la lista. | Contrastar misma cantidad, gramaje, impresión y terminación. |
| 2 | Flyers & Desplegables | Offset para 10×15 cm, plano, 4/4 en 1.000/2.500/5.000 u.; digital en celdas con costo explícito, con recargo del 25%. A 1.000 u. los precios finales son $43.190 (obra 80 g), $46.890 (ilustración 115 g) y $50.390 (ilustración 150 g); 100 u. digital 4/4 115 g: $22.690. | Formatos/plegados sin celda de costo permanecen en consulta. |
| 3 | Tags & Etiquetas | Activado en alcance acotado: tags 9×5 cm, ilustración 350 g, 500 u.; cálculo de papel, impresión digital por pliego, perforación y laminado frontal. 1.000 u. queda en consulta. | Oink publica 500 u. 4/4 a ≈$53.250 final y con OPP mate a $70.200; ZAP queda en $57.190 sin laminar y $66.390 con OPP brillo frontal. El laminado no es idéntico, así que esa comparación es orientativa. |
| 4 | Adhesivos & Stickers | Habilitadas todas las combinaciones circulares con costo cargado; 5×5 cm, 500 u. $48.890 final con IVA incluido. Costo seed $19.231 neto. | Comparar equivalentes; no extrapolar. |
| 5 | Fajas & Envoltorios | No hay matriz de producto terminado activa identificada. | Solicitar costo por medida, papel, impresión, adhesivo y cantidad. |
| 6 | Bolsas & Contenedores | No hay matriz de producto terminado activa identificada. | Comparar material, tamaño, manija, impresión por cara y cantidad. |
| 7 | Cajas Personalizadas | Consulta; costo depende de estructura y troquel. | Cotización por medidas, material, impresión, cantidad y armado. |
| 8 | Carpetas & Folders | Matriz digital 300 g activa con 30% de recargo + IVA; la matriz offset 350 g está cargada pero no se publica hasta confirmar unidad/escala de costos, que supera ampliamente al tramo digital. Ejemplo activo: 50 u. 300 g 4/0 sin laminar, costo $82.350 neto, precio final $129.590. | Imprenta Más: 50 u. A4 300 g 4/0 sin laminar $144.901 final; revisar equivalencia exacta de solapa y medidas. |
| 9 | Menús & Cartas | Sin matriz activa identificada. | Costear hojas/plegado/encuadernado, protección, cantidad y reposición. |
| 10 | Individuales & Posavasos | Sin matriz activa identificada. | Cotizar material, contacto con alimentos, impresión y tirada. |
| 11 | Cartelería & Ploteo | Configurador DRAFT; costos de gran formato parciales por componentes. | No fijar precio general sin material, impresión, corte, instalación y traslado. |
| 12 | Corpóreos & Marquesinas | Configurador DRAFT; costo final requiere fabricación e instalación. | Cotizar por material, espesor, iluminación, estructura, montaje y traslado. |
| 13 | Señalética & Placas | Configurador DRAFT. | Cotizar soporte, tamaño, grabado/impresión, fijación e instalación. |
| 14 | Expositores & Stands | Activado en alcance acotado: portabanner doble tensor 90×190 cm y roll up 85×200 cm, con impresión látex o UV y costo terminado explícito. Recargo 35% + IVA 21%; sin descuentos por volumen porque la matriz no los informa. | B377: doble tensor 90×190 cm $71.000 y roll up 85×200 cm $105.000; Oink: doble tensor $96.800 y roll up $112.550 finales. Los precios ZAP calculados quedan $73.190 (doble tensor látex), $89.390 (doble tensor UV), $92.190 (roll up látex con armado) y $75.990 (roll up UV con armado). |
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
9. **Oink — lista de precios 2026 para tags:** 500 u. 4/4 estándar $44.000 + IVA; con OPP mate $58.000 + IVA; perforación incluida.  
   https://www.holaoink.com.ar/oink_lista_precios_2026.html
10. **Gráfica B377 — portabanners y roll up:** doble tensor 90×190 cm $71.000; roll up 85×200 cm $105.000, estructura e impresión.  
   https://www.graficab377.com/servicios/gigantografias
11. **Oink — portabanners y roll up:** doble tensor 90×190 cm $96.800 final; roll up 85×200 cm $112.550 final.  
   https://www.holaoink.com.ar/oink_lista_precios_2026_iva.html
12. **Imprenta Cubo Digital — tarjetas:** 1.000 u. 350 g laminado mate, frente y dorso, $72.000 final.  
   https://imprentacubodigital.com.ar/
13. **CCprint:** catálogo público de papelería comercial con tags, flyers y carpetas, pero algunas fichas consultadas no permiten comprobar cantidad/especificación a partir del resultado indexado. Usar para descubrir productos, no para comparar sin abrir ficha y validar.  
   https://www.ccprint.com.ar/impresion-digital
14. **E-tiquetas:** referencia de 1.000 etiquetas 80×50 mm $26.000; no comparable directamente con stickers circulares de papel 5×5 cm.  
   Referencia de búsqueda de producto; requiere abrir ficha y confirmar especificación/IVA/entrega antes de tomar decisión.

## 6. Próxima secuencia de trabajo

1. Confirmar con proveedores los costos prioritarios (tarjetas, flyers, tags, stickers y carpetas), con fecha, IVA, cantidad, terminación, entrega y pago.
2. Completar los motores de costeo de las familias con matrices parciales: tags 1.000 u., carpetas offset 350 g, gran formato por componentes y textil sin prenda base.
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
- [Imprenta Lugones — tarjetas](https://www.imprentalugones.com.ar/productos/tarjetas/): precios finales publicados: offset 350 g 4/4 brillante 1.000 u. $62.000; OPP mate $70.500; sectorizadas $73.300. Es una referencia de Córdoba y se mantiene como referencia secundaria de bajo costo, no como base del precio para Buenos Aires.
- [Dokan — tarjetas sectorizadas](https://dokan.com.ar/product/tarjetas-con-laca-sectorizada/): 350 g, 4/4, OPP mate + UV sectorizada; 1.000 u. $125.000 frente / $135.000 frente y dorso.

Los precios publicados de MEGA no indican claramente en la página el tratamiento del IVA; no se deben comparar como si fueran netos o finales sin confirmarlo. Las referencias tampoco tienen idéntico gramaje, entrega y terminación.

| Variante ZAP | Costo de proveedor cargado (neto) | Precio ZAP final calculado | Lectura competitiva |
|---|---:|---:|---|
| Digital 350 g, 100 u., 4/4 sin laminar | $8.213 | $12.490 | Prima de gramaje frente a ofertas económicas de 300 g; validar conversión antes de publicarlo como opción destacada. |
| Digital 350 g, 500 u., 4/0 sin laminar | $19.219 | $29.090 | Activado: costo exacto y recargo del 25% + IVA. No se compara como equivalente con referencias 4/4. |
| Digital 350 g, 500 u., 4/4 sin laminar | $39.930 | **En consulta** | Precio teórico $60.490: no competitivo frente a referencias de 500 u. 4/4 con laminado que se publican desde $41.491 final. No ofrecer hasta renegociar el costo o conseguir una fuente equivalente. |
| Offset 350 g, 1.000 u., 4/4 sin laminar | $45.477 | $63.290 | ≈15% sobre Gráfica B377 ($55.000 para 1.000 u. 300 g 4/4 estándar), pero con gramaje 350 g; por debajo de Gráfica Lugano ($70.000 con laminado brillo). Confirmar vigencia del costo fuente. |
| Offset 350 g, 1.000 u., 4/4 OPP mate | $53.000 | $73.790 | Cerca de Imprenta Cubo Digital ($72.000 para 1.000 u. 350 g mate) y de la referencia de Gráfica Lugano ($70.000 con brillo); mantener como terminación premium y reconfirmar costo fuente. |
| Offset 350 g, 1.000 u., 4/4 OPP mate + UV sectorizada | $39.000 | **En consulta** | Costo cargado inferior al de la impresión clásica 4/4 sin laminar ($45.477), pese a incluir una terminación premium. No se ofrece precio automático hasta reconfirmar la fuente. |

**Activación en código:** se agregó selector digital/offset, mínimo de 1.000 unidades para offset, 300 g/350 g en digital y las cantidades offset cargadas. Las políticas de tarjetas usan recargo del 25% digital y 15% offset sobre costo neto + IVA; los ejemplos comerciales revisados son $12.490 para 100 u. 4/4 digital, $29.090 para 500 u. 4/0 digital y $63.290 para 1.000 u. 4/4 offset. Digital 500 u. 4/4 está bloqueado hasta renegociar el costo o conseguir una fuente competitiva. Las celdas de 3.000/5.000 offset cuyo costo cae por debajo del de 1.000 se bloquean y requieren reconfirmación de proveedor.

**Alerta de datos:** las celdas clásicas de offset para 3.000/5.000 u. contienen importes no monotónicos frente a 1.000 u. ($35.000 y $34.000 frente a $45.477). Se bloquean para cotización automática aunque existan como valores explícitos en la matriz. No asumir que son vigentes o correctas sin reconfirmar con el proveedor.

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

Se eliminó la allowlist que bloqueaba el resto de las celdas y se conectó la clave de materiales de la matriz digital (obra 80 g e ilustración 115 g comparten la tarifa de origen). Para offset se aplica recargo del 25% sobre costo neto + IVA; la matriz declara vigencia junio-julio 2026, por lo que el costo debe reconfirmarse antes de producción.

### Stickers circulares: ajustar a referencias por tamaño y cantidad

Referencias actuales:

- [Gráfica B377](https://graficab377.com/servicios/stickers): circular de 5 cm, 500 u. $60.000; 1.000 u. $110.000. Circular de 8 cm, 500 u. $150.000.
- [Dokan](https://dokan.com.ar/product/stickers-redondos/): circular de 5 cm, 500 u. $55.000; 1.000 u. $95.000.

Se redujo el recargo del 130% al 110% sobre el costo neto. Ejemplo 5×5 cm: 500 u. pasa de $53.590 a **$48.890 final**; 1.000 u. queda en **$93.690 final**. Ambos valores quedan dentro de la banda de las referencias públicas para 5 cm ($55.000–$60.000 por 500 u.; $95.000–$110.000 por 1.000 u.). Se mantienen activas todas las combinaciones circulares con costo explícito de la matriz y laca UV incluida; no se extrapola a vinilo ni a cortes no circulares.

### Carpetas: acercar el precio al mercado sin cambiar el costo cargado

Referencias actuales:

- [Imprenta Más](https://www.imprentamas.com.ar/productos/carpetas-institucionales-sin-laminar-dde-50-un/): 50 carpetas A4, ilustración 300 g, 4/0 sin laminar: $144.901 final.
- [Mercado Libre — 50 carpetas](https://www.mercadolibre.com.ar/50-carpetas-institucionales-a4-300g--solapa--diseno-gratis/up/MLAU190281256): publicación de 50 carpetas A4, ilustración 350 g, con solapa y diseño, $176.284,50 final.
- Imprenta Lugones se conserva como referencia secundaria de Córdoba, no como precio base de Buenos Aires.

Se redujo el recargo del 40% al 30%. Para 50 unidades, 4/0 sin laminar, el precio calculado pasa de $139.590 a **$129.590 final**, alrededor de 10,6% por debajo de Imprenta Más ($144.901). La comparación sigue sujeta a confirmar que estructura, solapa y terminación coincidan.

### Qué queda sin activación automática

- **Tags & Etiquetas:** activado en alcance acotado para 500 u. de 9×5 cm. El costo suma papel, impresión digital por pliego, perforación y laminado frontal cuando corresponde; se usa una imposición conservadora de 24 unidades por pliego. 1.000 u. permanece en consulta hasta obtener un costo offset terminado competitivo.
- **Formatos, papeles, cantidades o terminaciones fuera de las celdas existentes:** permanecen en consulta. Una opción visible no implica que toda combinación tenga costo.
- **Fajas, bolsas, menús e individuales:** sus configuradores siguen en DRAFT sin matriz de costo terminado activa.
- **Carpetas offset 350 g:** hay una matriz cargada, pero sus importes y escala deben reconfirmarse antes de exponerla; el precio automático no debe superar al mercado por una unidad de costo mal interpretada.
- **Gran formato, corpóreos, señalética y textil:** hay costos de materiales/procesos, pero faltan combinaciones de producto terminado, fabricación, instalación, traslado o prenda base. No sumar componentes sin validar si una línea ya incluye material + impresión + corte.
- **DTF textil:** la unidad de precio del proveedor sigue sin resolver; no publicar un precio automático.
- **Cuadernos:** la matriz de costos está cargada, pero no existe un producto dedicado en el catálogo actual; crear una ficha de producto y validar las unidades antes de publicarla.
- **Imanes:** la matriz disponible corresponde a plancha sin montar o material troquelado; falta validar montaje/terminación del producto final.
- **Membretes y sobres:** la matriz on-demand no tiene unidad de precio suficientemente clara para compararla con precios minoristas; no interpretar sus importes como total por lote sin confirmación.

### Estado de entrega

Los cambios de código están guardados en `main`: tarjetas v1.4, flyers v1.2, tags v1.1, carpetas v1.2 y Expositores & Stands v1.1. **No se pudo verificar la suite**: las ejecuciones de GitHub Actions fallan antes de exponer pasos o registros. Vercel informa límite de despliegues por 24 horas, por lo que los cambios aún no están confirmados en producción. Antes de publicar hay que ejecutar pruebas, revisar las variantes en la interfaz y comprobar cotización, carrito e impuestos de extremo a extremo.
