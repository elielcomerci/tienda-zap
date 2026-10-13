# Matriz de costos, precios tentativos y competencia — Tienda ZAP

**Corte de análisis:** 13/10/2026  
**Estado:** documento de trabajo; no modifica seed, configuradores ni precios publicados.  
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
| Tarjetas: 500 u., ilustración 350 g, 4/4, sin laminar | $39.930 | Tecnoplotter: 500, 350 g, 4/4, laminado brillo frontal, incluye diseño, $61.250 publicado. Imprenta Lugones: 500 doble faz $47.800 final pero es láser 250 g sin laminar; no es equivalente. Imprimime: 500, 300 g, 4/4, laca UV frontal, $34.290 + IVA. | **No aprobar todavía** | — | — | El precio de $74.900 que daría 35,5% de margen supera al competidor de 350 g laminado y con diseño. El costo seed parece no competitivo o necesita explicación; validar proveedor/celda antes de fijar precio. |
| Stickers circulares: 500 u., papel autoadhesivo 90 g, 5×5 cm | $19.231 | E-tiquetas publica 1.000 etiquetas 80×50 mm a $26.000, pero es otro formato/material/proceso: solo referencia de mercado, no comparación equivalente. | **$35.900** | **1,54×** | **35,2%** | Provisional matemático; no aprobar hasta conseguir al menos 2 precios comparables para stickers personalizados 5×5, 500 u., papel y corte equivalentes. |
| Carpetas: 50 u., ilustración 300 g, A4, 4/0, sin laminar, solapa blanca | $82.350 (50 × $1.647) | Imprimime: carpetas 300 g, full color, 1 solapa, 50 u. $107.793 + IVA (≈ $130.430 con IVA 21%). Confirmar si incluye la misma solapa, formato, terminación, diseño y entrega. | **$139.900** | **1,40×** | **28,8%** | Provisional; está ~7,3% sobre la referencia final calculada. Validar especificación y costos adicionales. |
| Flyers: 1.000 u., 10×15 cm, obra 80 g, offset | $23.000 en matriz | Gráfica Lugano publica 10×15 cm, 1.000 u. a $65.000; el resultado público no deja totalmente comparables papel, caras, IVA y entrega. | **No fijar todavía** | — | — | Bloqueado: la fuente del seed declara vigencia junio-julio 2026 y el motor activo no incorpora el costo de impresión de la matriz de proveedor. Actualizar costo y corregir el cálculo antes de cotizar. |
| Tags: combinación base de 500 u. | **No validado** | CCprint muestra tags 9×4 cm, frente/dorso, $15.000, pero el resultado consultado no informa cantidad; no es una comparación usable para precio unitario. | **No fijar todavía** | — | — | Bloqueado: la perforación está subcosteada y el motor no suma la impresión de proveedor. |
| Adhesivos & Stickers fuera del formato circular 5×5 | **No disponible para toda la familia** | Sin referencia equivalente verificada por formato, soporte, corte y cantidad. | **Consulta / no automatizar** | — | — | La matriz actual solo cubre configuraciones circulares determinadas. No extrapolar a vinilo, plancha o corte individual. |

### Cómo leer los tentativos

- **Tarjetas:** el cálculo matemático para lograr 35% de margen sería aproximadamente $74.900 final, pero no lo recomiendo como precio competitivo sin validar el costo. Tecnoplotter publica 500 tarjetas 350 g 4/4 con laminado brillo frontal e incluye diseño por $61.250; cobrar más por la variante sin laminar requiere una justificación comercial. Si se vendiera a $61.250 final y el costo de $39.930 fuera neto correcto, el margen bruto sería solo ≈21,1% antes de otros gastos. Es una señal de que hay que validar costo/proveedor o asumir explícitamente una posición premium, no bajar el margen a ciegas.
- **Stickers:** el precio se calcula con un multiplicador objetivo cercano a 1,54; aún no se demuestra que sea competitivo.
- **Carpetas:** el precio propuesto sacrifica margen respecto del objetivo general de 35% para acercarse al mercado. Si hay que sumar flete, diseño, preparación o comisión de cobro, debe recalcularse.
- Los márgenes se estiman contra el costo seed y no incluyen cargos no modelados. No publicar hasta completar la validación.

## 3. Inventario de los 31 productos del seed

**Regla:** “sin costo validado” no significa costo cero. No inventar precio para completar el catálogo. En productos de servicios, costear horas de producción, revisión, coordinación, herramientas, capacidad no facturable y alcance; no usar el multiplicador de imprenta.

| # | Producto | Estado de costo / precio para esta auditoría | Competencia / próximo paso |
|---:|---|---|---|
| 1 | Tarjetas & Vouchers | Matriz disponible; costo 500 u. 350 g 4/4 sin laminar $39.930 neto, vigencia por confirmar. Precio tentativo $74.900 final para esa combinación. | Contrastar misma cantidad, gramaje, impresión y terminación. |
| 2 | Flyers & Desplegables | Matrices offset/digital; offset vencida y motor incompleto. Sin precio automático aprobado. | Comparar tamaño, papel, una/dos caras, cantidad, plegado y entrega. |
| 3 | Tags & Etiquetas | Cotizador con impresión no incorporada y perforación subcosteada. | Rehacer costo completo y comparar con cantidad explícita. |
| 4 | Adhesivos & Stickers | Matriz parcial para stickers circulares; ejemplo 500 × 5 cm $19.231 neto. | Buscar comparables exactos por soporte, forma, corte, cantidad y laminado. |
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

## 5. Referencias de competencia revisadas el 13/10/2026

1. **Tecnoplotter — tarjetas 500 u. 350 g, 4/4, laminado brillo frontal, diseño incluido: $61.250 publicado.**  
   https://tecnoplotter.com.ar/productos/500-tarjetas-doble-faz-brillo-350g/
2. **Imprimime — tarjetas brillantes 500 u., 300 g, 4/4, laca UV frontal: $34.290 + IVA** (lista vigente al 10/10/2026). Es menor gramaje y otra terminación.  
   https://www.imprimime.com.ar/tarjetas-personales/tarjetas-personales-brillantes
3. **Imprimime — lista vigente al 10/10/2026, precios sin IVA:** carpetas impresas 1 solapa, 300 g, full color: 10 u. $32.338; 50 u. $107.793; 100 u. $191.632. También publica tarjetas 300 g y otras familias.  
   https://imprimime.com.ar/lista-de-precios
4. **Gráfica Lugano:** referencia pública de volantes 10×15 cm, 1.000 u. $65.000; especificaciones e IVA deben confirmarse.  
   https://www.graficalugano.com.ar/
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
