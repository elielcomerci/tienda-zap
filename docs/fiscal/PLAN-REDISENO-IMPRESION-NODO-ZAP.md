# NODO ZAP — Plan de rediseño de comprobantes e impresión

**Estado:** decisiones de producto confirmadas; auditoría técnica en curso. No autoriza cambios en emisión fiscal ni en `zap-fiscal-core`.  
**Repositorio:** `elielcomerci/tienda-zap`  
**Referencia visual/técnica:** impresión de órdenes de trabajo de REVEX (`RPM.ar`).

## 1. Decisión de producto

NODO debe generar comprobantes profesionales sin convertir al usuario en diseñador. La personalización tiene que ser acotada, intuitiva y consistente con ZAP Style: claridad, jerarquía, precisión, sobriedad y ausencia de controles que no aporten.

No damos por definitivos los nombres ni la cantidad de plantillas sugeridas anteriormente. Primero definimos las necesidades que deben cubrir y luego validamos visualmente las alternativas con comprobantes reales anonimizados.

### Principios de ZAP Style aplicados al documento

- La información fiscal y el total se encuentran rápido.
- El logo suma identidad sin competir con los datos legales ni con el comprobante.
- Tipografía, espacios, alineación y jerarquía hacen el trabajo; no se agregan adornos por decorar.
- Debe verse profesional tanto en pantalla como en PDF y en impresión monocromática.
- El diseño se adapta a contenido real: nombres largos, varios ítems, importes, leyendas y más de una página.
- El usuario selecciona una presentación; no mueve elementos libremente ni escribe CSS.
- No ocultar información obligatoria para lograr una composición más atractiva.

## 1.1 Decisiones confirmadas por producto (2026-10-25)

Estas decisiones reemplazan cualquier alternativa abierta que figure más abajo:

- **Salida:** impresión nativa del navegador; la persona puede imprimir o elegir Guardar como PDF. No se incorpora un generador PDF de servidor como camino principal.
- **Paginación:** estructura de página controlada, con espacios reservados para identidad, cabecera y cierre fiscal; el detalle puede crecer y continuar en páginas adicionales. No recortar filas ni forzar que una factura larga quepa en una página.
- **Lotes:** poder recuperar y reimprimir un lote completo como grupo persistente, manteniendo el orden original. El identificador, orden, pertenencia y recuperación del lote forman parte del diseño inicial.
- **Propuestas visuales:** explorar tres alternativas comparables; los nombres y la cantidad definitiva quedan sujetos a evaluación.
- **Emisión:** mantener la descarga automática después de una autorización exitosa y ofrecer una acción explícita para volver a descargar. Imprimir/reimprimir nunca vuelve a emitir.
- **Personalización:** logo, color de acento validado y datos comerciales permitidos. Los campos fiscales obligatorios siguen bajo control de los datos autorizados y del snapshot.
- **Históricos:** la reimpresión debe respetar los datos y la plantilla guardados para ese comprobante/lote; editar la configuración no debe alterar documentos históricos.

## 2. Auditoría inicial del código existente

La revisión del repositorio encontró estas piezas relevantes:

- `src/lib/fiscal-invoice-pdf.ts`: genera el PDF en el navegador con `jsPDF`, formato A4. Contiene el armado de la página, datos del emisor/receptor, tabla de ítems, importes, CAE y QR fiscal.
- `src/components/fiscal/FiscalInvoiceTemplateEditor.tsx`: editor de identidad/configuración visual. Genera una vista previa como Blob PDF con datos de muestra y permite guardar una plantilla.
- `docs/fiscal/diseno-visual-comprobantes.md`: alcance funcional del diseñador.
- `docs/fiscal/CHECKLIST-DISENO-COMPROBANTES.md`: checklist normativo, funcional y de pruebas.
- `docs/zap-style-interface-guidelines.md`: principios de interfaz ZAP Style.

El tipo `FiscalPdfTemplate` actualmente contempla `designVariant: 'classic' | 'modern' | 'editorial'`. La función de PDF asigna tratamientos distintos a esas variantes, y el editor muestra una representación del PDF real, marcada como vista previa. Esto indica que ya existe una base que conviene auditar y evolucionar antes de reconstruirla.

### Hallazgo clave sobre REVEX

La impresión de REVEX usa una vista de documento específica y reglas CSS de impresión (A4, márgenes, ocultamiento de controles y prevención de cortes). NODO, en cambio, hoy dibuja el PDF con jsPDF. Por lo tanto, **no se debe asumir que copiar el CSS de REVEX mejorará el PDF actual**: son mecanismos diferentes.

La referencia de REVEX es el modelo técnico deseado para la experiencia: documento formado con componentes React/Next.js discretos y reutilizables, más CSS de pantalla e impresión. La dirección propuesta es **dejar de usar jsPDF para construir visualmente los comprobantes** y formar el documento de manera nativa en Next.js. La auditoría debe determinar cómo retirar o sustituir el renderer actual de forma segura, conservar la información fiscal y mantener la funcionalidad existente. No es una migración a ciegas: primero se inspeccionan todos los consumidores, dependencias y contratos.

## 2.1 Hallazgos confirmados en la auditoría técnica inicial

- El renderer actual vive en `src/lib/fiscal-invoice-pdf.ts`, es cliente-side y usa `jsPDF` + `qrcode`. Expone construcción de Blob, descarga individual, vista previa y exportación de lote. No alcanza con reemplazar la descarga: hay que localizar y migrar todos los consumidores.
- `FiscalWorkspaceClient.tsx` importa esas funciones para vista previa, descarga individual y lote; tras emisión sincrónica intenta descargar el comprobante automáticamente. La emisión y el PDF están separados en funciones, pero hoy la descarga está encadenada al resultado de emisión.
- El registro `FiscalInvoiceRecord` persiste cada comprobante y un `payload` JSON, incluye `requestReference`, `jobId`, `workerVoucherId` y `invoicePdfUrl`, y tiene unicidad por ambiente/CUIT/punto de venta/tipo/número. El snapshot visual se guarda dentro del payload y también se expone como `pdfTemplateSnapshot` al renderer.
- En el modelo Prisma revisado no aparece una entidad de lote fiscal persistente ni una relación de pertenencia/posición de comprobantes a un lote. La exportación actual del historial recibe una selección de facturas; eso no equivale a recuperar el lote original importado desde Excel.
- `FiscalBatchImport.tsx` mantiene filas y estados de lote en estado de React (incluye `pending`, `valid`, `invalid`, `submitted`, `uncertain`, `failed`) y llama al flujo de emisión; esta evidencia obliga a rastrear las rutas de API y la persistencia de cada fila antes de diseñar la recuperación. No se debe inferir que el estado visual actual sobreviva a una recarga.
- El editor `FiscalInvoiceTemplateEditor.tsx` obtiene la vista previa a través del renderer jsPDF actual. Al pasar a HTML/CSS, tanto vista previa como impresión deberán compartir el mismo componente de documento y los mismos datos de muestra.
- La plantilla ya incluye datos comerciales, `logoUrl`, `primaryColor` y `designVariant` (`classic | modern | editorial`). Por tanto, las tres propuestas existentes son variantes del renderer actual, no evidencia de que haya tres composiciones visualmente distintas adecuadas para impresión nativa.
- La auditoría no considera validado el cumplimiento fiscal por el mero hecho de que el renderer actual tenga validaciones. Falta contrastar los campos y leyendas con tipos de comprobante realmente soportados y normativa vigente antes de cerrar el diseño.

- La configuración visual se guarda en `FiscalInvoiceTemplate`, vinculada a la cuenta fiscal, mediante `GET/PUT /api/fiscal/template`; el esquema Zod ya restringe el logo a `https://media.zap.com.ar/` y el color a hexadecimal. La UI nueva debe preservar esas validaciones y revisar si los campos comerciales actuales exceden la personalización ahora acordada.
- La emisión de la interfaz usa `/api/nodo/invoices/emit`; el registro del panel se crea en el flujo de emisión y guarda el snapshot de plantilla. La nueva capa de impresión debe recibir comprobantes persistidos y autorizados, no reconstruir ni reenviar la solicitud de emisión.
- La salida de lote actual valida los comprobantes seleccionados y crea un PDF local. Eso sirve para exportación de selección, pero no garantiza reimpresión del lote Excel original ni continuidad si se cierra/recarga el navegador.
- La plantilla tiene campos comerciales amplios (teléfono, WhatsApp, web, pie, actividades y datos de emisor) además de logo/color. La decisión de producto reduce el editor visible a logo, acento y datos comerciales permitidos; no significa borrar de golpe los campos persistidos antes de comprobar sus usos y compatibilidad histórica.

**Brecha de arquitectura prioritaria:** el requisito nuevo de recuperar un lote completo requiere un modelo persistente de lote y sus elementos ordenados, o una alternativa relacional equivalente. Debe diseñarse sin alterar la idempotencia ni permitir que la impresión reintente una emisión. La migración debe ser compatible con facturas ya guardadas que no pertenezcan a ningún lote.

## 3. Requisito: contenido variable, varias páginas y lotes

La composición nativa debe soportar desde el inicio dos escalas diferentes. La estructura visual tendrá espacios reservados y bloques de cierre controlados; el detalle conserva crecimiento natural y paginación multipágina, sin alturas fijas que recorten contenido:

### Una factura, una o varias páginas

- El contenido determina la altura; no se fija una altura rígida que recorte ítems o descripciones.
- Cuando el comprobante excede una página, continúa en páginas adicionales de forma controlada.
- La tabla de conceptos debe repetir encabezados cuando corresponda; las filas no deben cortarse de forma ilegible.
- Totales, CAE, vencimiento y QR fiscal deben permanecer legibles y ubicarse junto a un contexto suficiente, sin superponerse ni desaparecer al paginar.
- Definir explícitamente qué se repite por página (por ejemplo, identificación del comprobante y encabezados) y qué aparece solo al cierre.
- Probar textos largos, muchos conceptos, observaciones, datos de receptor extensos y contenido opcional.

CSS de impresión puede controlar tamaño de página, márgenes, saltos y reglas como `break-inside`, pero la paginación real debe verificarse en los navegadores/motores elegidos. No prometer una paginación perfecta solo por agregar CSS.

### Lote de comprobantes desde Excel

La carga de Excel es un flujo de emisión por lote, no una única factura con muchas páginas. Cada comprobante debe mantener su propia identidad fiscal, datos, autorización, QR y snapshot visual. La salida imprimible debe generar una secuencia ordenada de documentos independientes, con un salto de página o separación clara entre comprobantes, y permitir imprimir/guardar el conjunto cuando el flujo actual lo soporte.

- No mezclar varias facturas dentro de una misma hoja como si fueran una sola.
- Cada comprobante inicia en una nueva página; si uno necesita más de una página, termina antes de comenzar el siguiente.
- Un fallo o rechazo de una fila no debe convertirla en un comprobante válido ni romper silenciosamente los restantes; respetar el estado de emisión del lote.
- Antes de diseñar el lote, auditar el flujo existente de importación/emisión y distinguir claramente **emisión fiscal** de **generación de documentos imprimibles**. El diseño no debe disparar emisiones por el solo hecho de previsualizar o imprimir.
- Probar lotes mixtos, comprobantes largos, orden de salida, límites de volumen y recuperación ante errores.

## 4. Qué vamos a decidir

### A. Sistema visual

Crear y comparar propuestas que respondan a necesidades distintas, no a etiquetas arbitrarias. Como hipótesis inicial, evaluar:

1. **Esencial:** máxima claridad, economía visual y lectura rápida.
2. **Editorial:** identidad de marca más presente mediante tipografía, grilla y acento medido.
3. **Firma:** composición más distintiva para negocios que valoran especialmente su presentación.

Son nombres de trabajo, no una decisión final. Pueden cambiar, combinarse o reducirse si no aportan diferencias claras. Todas deben cumplir el mismo estándar fiscal, de legibilidad y calidad.

### B. Arquitectura de renderizado

Comparar dos caminos con un mismo comprobante de prueba:

**Dirección elegida:** construir el comprobante como una vista HTML/React nativa de Next.js, con componentes discretos, CSS específico para pantalla e impresión y comportamiento A4 inspirado en REVEX. No usar jsPDF como motor que dibuja el diseño final.

**Decisión tomada:** imprimir desde el navegador y permitir Guardar como PDF. El prototipo debe validar el comportamiento real en navegadores soportados, incluidos márgenes, saltos, cabeceras repetidas, logo/QR y colores. No se debe prometer identidad pixel-perfect entre navegadores.

El documento debe componerse con una única estructura de presentación para vista previa e impresión. CSS `@media print` y `@page` controlarán tamaño, márgenes, colores, controles ocultos y saltos; los componentes se encargarán de cabecera, emisor/receptor, detalle, totales y bloque fiscal. El motor de emisión fiscal sigue separado y es la fuente de los datos autorizados.

## 5. Experiencia propuesta

- Entrar a **Diseño de comprobantes** desde la configuración correspondiente.
- Identificar claramente el emisor/CUIT al que se aplica la configuración.
- Elegir entre las propuestas mediante previsualizaciones comparables, con datos ficticios y marca visible de “Vista previa”.
- Configurar únicamente lo que aporta valor: logo validado, color de acento dentro de una paleta segura y datos comerciales opcionales.
- Guardar, volver al diseño predeterminado y comprobar el resultado antes de usarlo.
- Aplicar nuevas preferencias a documentos futuros. No alterar ni regenerar documentos históricos de forma silenciosa.
- Mantener separado el diseño de comprobantes de la plantilla Excel para facturación por lotes.

No construir un editor de lienzo libre. La vista previa debe ser el resultado del mismo motor que genera el archivo final, o debe demostrarse que la diferencia es insignificante.

## 6. Límites fiscales y de seguridad

La personalización es exclusivamente de presentación. No puede cambiar, inventar, ocultar ni reemplazar los datos fiscales autorizados.

- Mantener la emisión y la autoridad fiscal en el Worker existente; esta iniciativa no debe modificar `zap-fiscal-core` ni su despliegue.
- Conservar integridad de tipo/letra, punto de venta, numeración, fechas, receptor, conceptos, cantidades, importes, impuestos, moneda, CAE/vencimiento y QR fiscal según corresponda.
- Auditar la normativa oficial vigente por cada tipo de comprobante efectivamente soportado antes de dar por cerrados los layouts. La lista de campos existente es una guía de auditoría, no una certificación de cumplimiento.
- Un QR comercial opcional nunca sustituye al QR fiscal.
- No permitir HTML/CSS arbitrario ni URLs externas libres para recursos visuales.
- Reutilizar el flujo seguro y CDN de medios existente si la auditoría confirma que cumple los requisitos; no crear almacenamiento paralelo.
- Aislar la configuración por el ámbito correcto (tenant/CUIT/emisor) y respetar permisos.
- Conservar snapshots/versiones necesarias para que el documento histórico no cambie cuando se edite el diseño.

## 7. Plan de trabajo

### Fase 1 — Auditoría técnica
- [ ] Leer completa la ruta de exportación del PDF y todos sus consumidores.
- [ ] Identificar persistencia, snapshot, permisos y alcance actual de la configuración.
- [ ] Revisar editor, vista previa, carga de logo, errores y fallback.
- [ ] Mapear límites del renderer actual: descripciones largas, varias páginas, totales, CAE/QR, caracteres, imágenes y moneda.
- [x] Inspección inicial del componente de importación: estado de filas en cliente y estados conceptuales detectados; pendiente rastrear rutas API, persistencia, reanudación y límites reales.\n- [ ] Auditar el flujo completo de importación y emisión por lote de Excel, sus estados, descarga actual y límites de volumen.\n- [ ] Diseñar modelo persistente de lote y elementos ordenados, con aislamiento tenant/CUIT/ambiente, estados recuperables, auditoría y compatibilidad con facturas históricas individuales.
- [ ] Confirmar contratos reales de los datos del Worker y tipos de comprobantes soportados.

### Fase 2 — Prototipos visuales y decisión de motor
- [ ] Elegir un comprobante representativo y crear datos de prueba anonimizados.
- [ ] Producir propuestas visuales con la misma información y restricciones fiscales.
- [ ] Comparar al menos un PDF con pocos ítems y otro que fuerce varias páginas.
- [ ] Construir un prototipo nativo React/Next.js + CSS de impresión, siguiendo el patrón arquitectónico de REVEX.
- [ ] Comparar el prototipo con el PDF actual usando el mismo conjunto de datos, identificar qué se gana y qué se debe preservar.
- [ ] Definir la forma oficial de obtener el PDF y documentar límites conocidos del navegador/motor elegido.
- [ ] Registrar plan de sustitución y compatibilidad antes de retirar el renderer jsPDF.

### Fase 3 — Especificación final
- [ ] Elegir las plantillas definitivas según diferencias útiles y ZAP Style.
- [ ] Definir tokens compartidos: tipografía compatible, escala, espacios, líneas, color y tamaños.
- [ ] Especificar comportamiento para una y varias páginas.
- [ ] Definir qué preferencias son configurables y cuáles permanecen fijas por integridad fiscal.
- [ ] Actualizar el checklist existente con criterios de aceptación comprobables.

### Fase 4 — Implementación controlada
- [ ] Trabajar en una rama específica, sin desplegar ni alterar el Worker.
- [ ] Mantener la lógica fiscal separada de la capa visual.
- [ ] Implementar la vista de comprobante con componentes React/Next.js y CSS de impresión, conectada al editor.
- [ ] Retirar jsPDF del flujo visual de comprobantes solo después de verificar que ningún consumidor requerido dependa de su salida; no eliminar dependencias o archivos sin auditoría.
- [ ] Preservar la configuración existente y definir fallback seguro.
- [ ] No cambiar la apariencia de documentos históricos ya emitidos.

### Fase 5 — Validación
- [ ] Comparar la vista previa con la impresión física y el PDF obtenido mediante el flujo elegido.
- [ ] Probar una página, múltiples páginas, descripciones extensas, muchos ítems, importes altos, campos opcionales y logo ausente/inválido.
- [ ] Probar un lote de varios comprobantes: cada uno comienza en una página nueva, los documentos largos continúan correctamente y ningún comprobante se mezcla con el siguiente.
- [ ] Verificar que las filas no se recorten y que los totales no queden aislados o superpuestos.
- [ ] Verificar CAE, vencimiento y lectura real del QR fiscal.
- [ ] Probar color y blanco y negro, A4 y distintos navegadores/dispositivos relevantes.
- [ ] Verificar permisos y aislamiento entre emisores.
- [ ] Ejecutar typecheck, tests y build; documentar resultados y pendientes.
- [ ] No fusionar ni habilitar producción hasta revisar evidencia y resolver fallos.

## 8. Criterios de aceptación

La iniciativa estará lista cuando:

1. La plantilla predeterminada sea clara y profesional sin configuración manual.
2. Cada variante tenga una razón de uso reconocible; si dos son casi iguales, se simplifica la oferta.
3. La previsualización represente fielmente el archivo final.
4. El contenido fiscal aplicable se conserve y la auditoría normativa esté documentada.
5. No haya recortes, solapamientos ni pérdida de información en casos reales de una o varias páginas.
6. Los QR y datos de autorización sean legibles y verificables.
7. Los cambios visuales no alteren la emisión, los importes, la numeración ni los snapshots históricos.
8. La experiencia sea entendible sin explicación extensa y respete los criterios de interfaz ZAP Style.
9. Las pruebas y el build pertinentes pasen, con evidencia registrada.
10. La paginación automática se valide con comprobantes cortos y largos en el mecanismo de salida elegido.
11. La impresión por lote respete el orden y la separación de cada comprobante y no vuelva a emitir comprobantes al imprimir o descargar.

## 9. Fuera de alcance

- Rediseñar o cambiar la lógica de emisión fiscal.
- Cambiar Worker, certificados, autorizaciones o integración ARCA.
- Rehacer la facturación por lotes de Excel.
- Editar el contenido fiscal de comprobantes ya emitidos.
- Ofrecer un diseñador libre de posiciones, HTML o CSS.
- Dar por cumplida la normativa solo por una revisión visual.

## 10. Referencias del repositorio

- `src/lib/fiscal-invoice-pdf.ts`
- `src/components/fiscal/FiscalInvoiceTemplateEditor.tsx`
- `docs/fiscal/diseno-visual-comprobantes.md`
- `docs/fiscal/CHECKLIST-DISENO-COMPROBANTES.md`
- `docs/zap-style-interface-guidelines.md`
- Referencia REVEX: `RPM.ar/components/print/OrderPrintView.tsx` y estilos `@media print`.

**Próximo paso:** completar la Fase 1, incluyendo el flujo Excel, y construir un prototipo nativo React/Next.js + CSS de impresión que valide una factura de varias páginas y un lote con varios comprobantes. La decisión pendiente es el mecanismo definitivo para entregar el PDF y cómo reemplazar de forma segura el flujo actual basado en jsPDF.
