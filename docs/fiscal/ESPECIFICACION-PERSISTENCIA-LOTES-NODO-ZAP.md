# NODO ZAP — Especificación de persistencia de lotes y snapshot fiscal

**Estado:** diseño previo a implementación.  
**Rama:** `docs/nodo-zap-print-design-plan-20261025`  
**Alcance:** Tienda ZAP únicamente. No cambiar ni desplegar `zap-fiscal-core`.

## 1. Objetivo

Permitir que una importación de facturas exista como unidad recuperable aunque se cierre o recargue el navegador. Conservar el orden de origen, los resultados por fila y los datos exactos necesarios para consultar jobs ya creados o reimprimir comprobantes autorizados.

La impresión nunca emite, reintenta ni consulta ARCA. Los reintentos de emisión conservan el `externalId` y el payload original para que siga operando la idempotencia existente del Worker.

## 2. Modelo de datos propuesto

Los nombres son conceptuales hasta contrastarlos con el esquema y convenciones actuales de Prisma.

### FiscalInvoiceBatch

- `id`: ID estable del lote.
- `accountId`: cuenta fiscal propietaria; relación obligatoria y con política de borrado coherente con datos fiscales.
- `createdBy` o referencia al usuario disponible en el sistema, si el modelo de identidad lo permite.
- `sourceType`: origen (por ejemplo, importación Excel/TSV); no guardar el archivo original si no es necesario.
- `status`: estado agregado derivado/actualizado transaccionalmente a partir de las filas; no debe reemplazar el estado individual.
- `rowCount`, `authorizedCount`, `failedCount`, `uncertainCount`: contadores opcionales para lectura rápida, reconciliables desde las filas.
- `createdAt`, `updatedAt`, `completedAt`.

### FiscalInvoiceBatchItem

- `id`, `batchId` y `rowNumber`: identidad y orden original; unicidad compuesta `(batchId, rowNumber)`.
- `accountId`: redundancia intencional posible para filtrar/autorizar con seguridad; si se usa, verificar consistencia con el lote.
- `environment` y `cuit`: valores de esa fila; no asumir que un lote contiene una sola CUIT o ambiente.
- `externalId` y `idempotencyKey`: conservar los valores originales, con restricciones de unicidad acordes al alcance tenant del Worker.
- `requestPayload`: solicitud validada/original usada para emisión, con los datos necesarios para reintentar exactamente la misma operación. No persistir secretos, certificados ni claves de API.
- `status`: estado explícito por fila (validación, pendiente, autorizada, rechazada, incierta, fallo recuperable, etc.) con transición documentada.
- `errorCode` y `errorMessage`: diagnóstico sanitizado; evitar secretos o datos sensibles innecesarios.
- `jobId` y `invoiceRecordId`: vínculos opcionales al job fiscal y al comprobante persistido.
- `documentSnapshot`: snapshot fiscal canónico recibido del Worker, si no queda almacenado de forma fiable en el registro del comprobante. Preferir una única fuente canónica para evitar divergencias.
- `createdAt`, `updatedAt`, `submittedAt`, `resolvedAt`.

No duplicar un snapshot en dos sitios sin definir precedencia. Antes de migrar, verificar si `FiscalInvoiceRecord.payload` puede contener el snapshot de forma estable; la prioridad es que la ruta de sincronización asíncrona lo guarde y que la lectura histórica lo recupere de forma uniforme.

## 3. Flujo de creación y emisión

1. Crear el lote persistido antes de comenzar a emitir, con las filas y su orden, solicitud validada, `externalId` e idempotency key.
2. La validación `dryRun` sigue siendo no fiscal: no crea jobs ni consulta ARCA. Los errores de validación se guardan por fila y no se emiten.
3. Al emitir una fila, marcarla como enviada/pending y asociar el `jobId` cuando la respuesta lo permita. Conservar siempre el identificador original y la solicitud original.
4. Si la respuesta es incierta o la conexión se interrumpe, no inventar un nuevo identificador ni marcar éxito. Consultar el job si se conoce; si no, reconciliar usando el mecanismo ya soportado por el flujo actual antes de volver a emitir.
5. Cuando el job termina, sincronizar el estado y guardar el `documentSnapshot` junto con número, CAE, vencimiento y referencia al comprobante en una operación consistente.
6. Un lote con filas fallidas, rechazadas o inciertas puede seguir visible y recuperable. No se presenta como lote completamente autorizado.

## 3.1 Cola de emisión: secuencial, una factura por vez

- La UI procesa las filas elegibles de forma secuencial: espera la respuesta/estado de la fila actual antes de iniciar la siguiente, conforme al comportamiento acordado.
- Cada comprobante conserva su propio job, clave de idempotencia, payload, autorización y estado. El lote solo agrupa y ordena.
- Persistir el lote y todas sus filas antes de empezar la cola. Guardar el resultado de cada fila apenas se conozca; no esperar a que termine todo el lote.
- Si se recarga o interrumpe la sesión, reconstruir el avance desde la base de datos y reconciliar jobs ya existentes. No reiniciar la cola completa ni reenviar filas a ciegas.
- Reanudar por la primera fila pendiente elegible, preservando el orden de origen. Una fila en estado incierto debe reconciliarse antes de considerar una nueva emisión.
- El orden de impresión siempre es `rowNumber ASC`, no el orden en que ARCA autoriza los comprobantes.
- El estado agregado del lote refleja estados parciales; nunca presentar como completado un lote con filas pendientes, rechazadas, fallidas o inciertas.

## 4. Recuperación y reintento

- La recuperación lista lotes de la cuenta autorizada, luego obtiene sus filas en orden `rowNumber ASC`.
- El acceso siempre se limita por la cuenta fiscal resuelta en servidor. No confiar en un `accountId` enviado por el navegador.
- El reintento reutiliza `externalId`, `idempotencyKey` y payload originales. Nunca editar silenciosamente el payload de una fila ya enviada; una modificación fiscal requiere un nuevo intento explícitamente identificado según las reglas existentes.
- Si el Worker devuelve un job ya existente para una petición idéntica, Tienda reconcilia el job existente en lugar de crear una segunda emisión.
- Las filas autorizadas se pueden imprimir; filas rechazadas, fallidas o inciertas se excluyen de la impresión fiscal y muestran su estado.
- Los comprobantes históricos que no pertenezcan a un lote siguen siendo accesibles desde el historial individual.

## 5. Contratos de API a evaluar

No implementar endpoints duplicados si rutas actuales pueden extenderse de forma segura. La auditoría debe identificar la ubicación correcta y aplicar autorización de cuenta en servidor.

- Crear/importar lote: persiste el lote y filas antes de las emisiones.
- Leer detalle del lote: devuelve cabecera y filas ordenadas, con estados recuperables.
- Reanudar/reconciliar: consulta estados de jobs existentes; solo emite filas elegibles usando las mismas claves y solicitudes persistidas.
- Historial: permite encontrar lotes sin depender de los últimos 100 comprobantes individuales.
- Impresión: recibe IDs de comprobantes autorizados del lote y lee snapshots persistidos; no invoca rutas de emisión.

## 6. Snapshot y documentos históricos

- El snapshot fiscal devuelto por el Worker se debe persistir también en el camino asíncrono.
- El renderer nuevo debe consumir un modelo de lectura normalizado que combine los datos fiscales canónicos, el snapshot del documento y las preferencias visuales guardadas para ese comprobante.
- La plantilla editable actual no debe sobreescribir el snapshot histórico.
- Si un comprobante antiguo carece de snapshot, aplicar un fallback explícito y documentado sin inventar datos fiscales; marcar internamente el origen del fallback.
- Los datos QR se derivan de la autorización fiscal canónica; nunca del texto comercial o de campos editables.

## 6.1 Matriz de requisitos fiscales para la plantilla

La referencia visual de YoFacturo sirve como ejemplo de jerarquía, pero no como fuente normativa suficiente. La implementación debe validar la representación contra las fuentes oficiales vigentes de ARCA.

- Soportar las modalidades de comprobante A que pueden llevar leyendas fiscales específicas («Pago en CBU informada» y «Operación sujeta a retención») cuando los datos autorizados lo indiquen.
- No forzar Factura B para todo receptor monotributista: ARCA documenta casos de Factura A a monotributistas y una leyenda sobre el crédito fiscal vinculada a la Ley 27.618.
- Renderizar importes y desgloses recibidos de la fuente fiscal canónica: netos, IVA por alícuota, tributos/percepciones aplicables y total. No asumir IVA 21 % como única alícuota.
- CAE, vencimiento, numeración, modalidad y QR deben derivarse de datos autorizados reales. No completar faltantes inventando datos ni reconstruir el QR desde campos editables.
- Evaluar la aplicabilidad de «ORIGINAL»/«DUPLICADO» según la modalidad; no imponerlo como regla universal a la representación electrónica.
- Confirmar datos obligatorios del Anexo II de RG 1415/2003 y de las reglas de factura electrónica antes de declarar conformidad. La revisión de diseño no equivale a certificación legal.

Fuentes oficiales de referencia:
- https://www.arca.gob.ar/facturacion/regimen-general/comprobantes.asp
- https://www.arca.gob.ar/facturacion/regimen-general/requisitos.asp
- https://www.arca.gob.ar/fe/emision-autorizacion/datos-comprobantes.asp
- https://www.arca.gob.ar/fe/emision-autorizacion/comprobantes.asp

## 7. Invariantes de seguridad y consistencia

1. No se llama al Worker ni a ARCA durante vista previa, impresión o descarga.
2. Una fila incierta no se marca autorizada por ausencia de error.
3. No se cambia el `externalId` al recuperar/reintentar la misma fila.
4. Un lote y sus filas siempre pertenecen a la cuenta fiscal autorizada.
5. CUIT y ambiente se conservan por fila; no se deducen de la cabecera del lote.
6. El orden original no depende del orden devuelto por una consulta sin `ORDER BY`.
7. Los snapshots de documentos autorizados no se reconstruyen a partir de la plantilla actual.
8. La migración permite comprobantes individuales preexistentes sin lote.
9. El estado agregado del lote no sustituye los estados por fila ni los datos canónicos del Worker.
10. Los registros de auditoría y errores no deben incluir secretos.

## 8. Pruebas de aceptación antes de UI

- Crear lote mixto con distintas CUIT/ambientes y filas válidas e inválidas.
- Recargar el navegador y recuperar mismo ID, cantidad, orden y estado de cada fila.
- Interrumpir una emisión después de que el Worker haya creado el job; recuperar sin duplicar emisión.
- Reconciliar un job asíncrono y comprobar persistencia del snapshot completo.
- Rechazar intento de leer o modificar lote de otra cuenta.
- Reimprimir lote con fallos: solo comprobantes autorizados, en orden original; cada comprobante inicia en hoja nueva y sus páginas no se mezclan con el siguiente.
- Confirmar que imprimir/reimprimir no llama a emisión.
- Mantener acceso a comprobantes individuales históricos.
- Ejecutar migración en base de prueba y verificar que los registros previos siguen legibles.

## 9. Orden de implementación recomendado

1. Revisar los modelos de cuenta, job y comprobante y decidir la fuente canónica del snapshot.
2. Añadir modelos/migración de lote y filas.
3. Persistir lote y filas antes de emitir; adaptar el importador para operar contra IDs persistidos.
4. Completar sincronización asíncrona del snapshot y reconciliación.
5. Añadir lectura/recuperación con controles de acceso.
6. Crear renderer nativo React/CSS de impresión y tres propuestas visuales.
7. Integrar reimpresión por lote y re-descarga individual.
8. Ejecutar pruebas, typecheck y build; no desplegar hasta revisar evidencia.
