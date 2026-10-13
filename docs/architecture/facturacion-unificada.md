# Circuito unificado de facturación

**Estado:** especificación funcional; pendiente de auditoría técnica e implementación.  
**Issue central:** https://github.com/elielcomerci/tienda-zap/issues/12  
**Alcance de repositorios:** `elielcomerci/tienda-zap`, `elielcomerci/zap-nextjs` y `elielcomerci/zap-fiscal-core`.


## Hallazgos de auditoría del estado actual (13-10-2026)

Estos hallazgos son de lectura del código en la rama por defecto; no representan cambios aplicados.

### `tienda-zap`

- El modelo `Order` almacena actualmente `invoiceUrl`, `invoiceFileName` e `invoiceUploadedAt` directamente en la venta. Esto representa un solo comprobante por venta y no modela de forma natural una factura que cubre varias ventas.
- La ruta `src/app/api/admin/orders/[orderId]/invoice/route.ts` permite al administrador cargar un PDF/imagen de hasta 10 MB, pero lo sube a Vercel Blob con acceso público. Actualiza la referencia de la orden y no emite factura ni modifica el estado fiscal. Debe migrarse a R2 como parte del circuito acordado.
- La validación de tipo de archivo se basa en el MIME declarado por el cliente; hay que validar también el contenido real.
- El componente `OrderInvoiceUploader` permite subir/reemplazar el archivo y abrir la URL actual directamente. La carga está ubicada en el detalle administrativo de una orden.
- `src/lib/order-access.ts` ya proporciona una regla reutilizable de acceso a una orden para admin, cliente autenticado y token público aleatorio (almacenado como hash). Existe una ruta de descarga de archivos de ítems que valida el acceso a la orden antes de generar una URL firmada de R2. Para facturas, el criterio acordado es distinto: URL directa y opaca desde `media.zap.com.ar`.
- `OrderItem.productId` es obligatorio y el detalle administrativo muestra `item.product.name`. Aunque hay snapshots parciales como `productName` y `productSlug`, la creación de conceptos ad hoc debe auditarse antes de decidir el modelo y la migración. No conviene resolverlo solo permitiendo cualquier `productId` nulo sin revisar los usos.
- `src/lib/orders.ts` incluye la venta, sus ítems, usuario, recibos, eventos y archivos de prueba para las vistas de administración/cliente. La pantalla cliente exacta que renderiza el campo de factura todavía debe localizarse y verificarse; no se afirma que ya muestre el comprobante.

### `zap-nextjs`

- `lib/r2.ts` implementa carga directa a R2 y devuelve una URL pública construida con `R2_PUBLIC_URL` (por defecto `https://media.zap.com.ar`). El nombre único actual combina timestamp y un fragmento aleatorio de `Math.random`; para comprobantes conviene usar un identificador aleatorio criptográficamente seguro.
- `app/api/admin/files/route.ts` gestiona archivos generales de clientes y guarda la URL pública en `ClientFile`. No se ha encontrado en esta revisión una integración de facturas con ese modelo; no debe reutilizarse automáticamente como modelo de comprobantes.
- El uso de `media.zap.com.ar` en `zap-nextjs` está confirmado como base de medios públicos. El circuito de facturas debe usar claves opacas y evitar listados/indexación, sin confundir esto con un control de acceso.
- Falta determinar si `zap-nextjs` participa en la vista de cuenta o solo comparte archivos y administración; la fuente de verdad de las solicitudes no debe duplicarse entre ambos proyectos.

### `zap-fiscal-core`

- El Worker ya expone `POST /v1/invoices/emit` con trabajo asíncrono, `jobId`, `externalId` y `idempotencyKey`; también existe `GET /v1/jobs/:jobId` para consultar el estado/resultados del trabajo.
- El Worker persiste trabajos y resultados fiscales, serializa operaciones por CUIT con Durable Object y hace una consulta previa a ARCA para ayudar a evitar duplicados. La cola reintenta fallos de despacho y los webhooks firmados tienen reintentos persistidos.
- Los webhooks contemplan eventos `invoice.result` y `invoice.failed`. La integración de Tienda debe validar firma, deduplicar eventos por ID, guardar el resultado y tolerar entregas repetidas o tardías.
- Un timeout en modo síncrono deja el trabajo procesándose en segundo plano; por tanto, la tienda no debe derivar inmediatamente a emisión manual por timeout. Debe conservar `FACTURA PENDIENTE` y consultar/reconciliar el job antes de habilitar una nueva emisión.
- El Worker opera con tenant, CUIT representada, ambiente y punto de venta autorizados. El mapeo de configuración fiscal de ZAP y el contrato exacto de callback/webhook todavía deben documentarse y verificarse; no se deben enviar solicitudes desde el frontend directamente al Worker.


## Contrato del Worker verificado en código (13-10-2026)

Esta sección recoge detalles observados en `fiscal-worker/src/index.ts`, `handlers/emit.ts`, `handlers/job-status.ts` y `webhooks/sender.ts`. Es una auditoría estática; no constituye una prueba de emisión de extremo a extremo.

### Solicitud de emisión

- La ruta autenticada es `POST /v1/invoices/emit`; se autentica mediante API key de un tenant, nunca desde el navegador con un secreto interno.
- El body exige `externalId`, `idempotencyKey`, `contributor` (CUIT, punto de venta y ambiente `TEST|PROD`), `voucher` (tipo, concepto y fecha), `amounts` (total, neto, IVA y opcionalmente exento/desglose IVA) y `customer` (tipo/número de documento y datos opcionales).
- La clave idempotente aplica dentro del tenant. Si se reutiliza con otra CUIT, ambiente o `externalId`, el Worker responde conflicto; si coincide, devuelve el trabajo existente. La tienda debe crear una clave estable por solicitud y conservarla en todos los reintentos.
- `GET /v1/jobs/:jobId` devuelve el estado y, cuando existe, metadatos fiscales: tipo/número, CAE, vencimiento del CAE, fecha de emisión y observaciones.
- El endpoint de estado **no devuelve un PDF ni una URL de archivo**. El registro canónico debe separar el resultado fiscal confirmado del archivo ofrecido al cliente. Antes de cerrar la implementación hay que decidir y probar cómo se genera o incorpora el PDF de la factura emitida.

### Webhook y recuperación

- El destino efectivo se obtiene de `Tenant.webhookUrl` y el secreto de `Tenant.webhookSecret`. Aunque el body de emisión acepte `webhook`, el envío usa la configuración del tenant. Esto debe resolverse al aprovisionarlo; no aceptar un callback arbitrario por solicitud.
- El Worker envía `X-Fiscal-Signature: sha256=...`, `X-Fiscal-Event-Type`, `X-Fiscal-Event-Id` y `X-Fiscal-Timestamp`. La firma HMAC-SHA256 se calcula sobre `timestamp.rawBody`. El receptor debe verificar firma y tolerancia temporal usando el cuerpo crudo.
- Las entregas se persisten y reintentan con backoff. El receptor debe ser idempotente por `eventId`, responder 2xx solo después de registrar el evento de forma durable y tolerar entregas repetidas o tardías.
- `invoice.result` y `invoice.failed` incluyen `jobId`, `externalId`, estado y, si está disponible, datos fiscales. Antes de cambiar estados, el receptor debe comprobar que `externalId` corresponde a una solicitud local.
- El modo síncrono espera hasta 10 segundos y puede devolver un trabajo asíncrono si no termina a tiempo. Eso no prueba que la emisión haya fallado: conservar la solicitud pendiente y consultar el mismo `jobId` antes de considerar otra emisión o gestión manual.

### Configuración y bloqueos

- Antes de habilitar el circuito hay que confirmar el tenant de ZAP, el vínculo autorizado con CUIT, ambiente, punto de venta y permisos de emisión. Que el Worker esté desplegado no significa que la emisión productiva esté habilitada o validada.
- La cuota de 25 facturas figura como propuesta no habilitada comercialmente; no debe prometerse ni incorporarse como regla del producto sin aprobación explícita.
- Las rutas de health/status no sustituyen las pruebas del flujo fiscal, del webhook receptor ni del aislamiento entre tenants.

### Decisiones que requieren cerrarse antes de migrar

1. Fuente única de verdad para solicitudes y comprobantes: elegirla tras verificar los límites reales de Tienda y ZAP Agencia, evitando un estado duplicado sin sincronización.
2. Modelo canónico de factura con relación muchos-a-muchos o entidad puente para facturas agrupadas.
3. Identidad fiscal para reconciliar una factura cargada manualmente con el resultado posterior del Worker.
4. Modelo de solicitud persistente, intentos, eventos, reintentos y estados de revisión.
5. Pantalla exacta del cliente donde se mostrará `SOLICITAR FACTURA` / `FACTURA PENDIENTE` / `VER FACTURA`.
6. Contrato de configuración, autenticación de backend y webhook con el Worker.

## Objetivo

Permitir que un cliente solicite una factura desde una venta y que la solicitud se resuelva por Worker fiscal o por intervención administrativa, con un único registro de factura, una experiencia de cliente uniforme y recuperación ante errores sin duplicar emisiones.

Esta especificación es la referencia reutilizable para adaptar el circuito a otro cliente. Las decisiones específicas de cada implementación (autenticación, proveedor fiscal, modelo de venta, notificaciones y configuración) deben quedar aisladas de las reglas del flujo.

## Experiencia del cliente

1. Antes de solicitar, mostrar `SOLICITAR FACTURA`.
2. Al persistir la solicitud en servidor, deshabilitar/reemplazar el botón por `FACTURA PENDIENTE`.
3. Mantener ese estado al recargar o volver a entrar. El cliente no debe repetir la solicitud para reanudar el proceso.
4. Cuando la factura está emitida y el comprobante registrado, mostrar `VER FACTURA`.
5. No exponer si la factura se procesó por vía automática o manual.

El cambio visual nunca sustituye la persistencia del servidor.

## Estados de la solicitud

Estados conceptuales mínimos (los nombres finales del enum se decidirán al auditar el modelo actual):

- `NOT_REQUESTED`: no hay solicitud.
- `PENDING`: solicitud persistida; el cliente ve FACTURA PENDIENTE.
- `PROCESSING`: un intento de emisión está en curso.
- `MANUAL_REQUIRED`: se requiere intervención administrativa.
- `RECONCILIATION_REQUIRED`: no se sabe con certeza si ARCA emitió el comprobante; consultar/reconciliar antes de emitir otra vez.
- `INVOICED`: emisión confirmada y comprobante registrado.
- `REVIEW_REQUIRED`: incidencia que necesita revisión.

No todo fallo debe derivarse inmediatamente a gestión manual: los fallos transitorios pueden reintentarse con límites; los errores definitivos requieren intervención; los resultados inciertos requieren reconciliación.

## Flujo

1. El cliente solicita la factura.
2. El servidor crea o recupera idempotentemente la solicitud y la vincula a la venta.
3. Si el Worker está configurado y operativo, se entrega la solicitud al flujo fiscal automático.
4. El Worker confirma la emisión y el comprobante se registra en el registro canónico.
5. Ante un error definitivo, la solicitud se deriva a la bandeja administrativa y se notifica al administrador con el contexto y el motivo.
6. Ante timeout o respuesta perdida, consultar/reconciliar el estado fiscal antes de volver a emitir.
7. La vía manual permite al administrador cargar un comprobante que ya fue emitido y registrar sus metadatos; subir un archivo no emite por sí solo una factura.
8. Al completarse cualquiera de las vías, se registra una sola factura y se actualiza el estado de la venta/solicitud.

## Registro canónico de factura

- Mantener separados venta/pedido, pago, solicitud de facturación, emisión fiscal y archivo del comprobante, aunque se relacionen.
- Una factura puede cubrir una venta o varias ventas del mismo cliente.
- La factura debe poder relacionarse con todas las ventas que cubre.
- La procedencia (Worker o administración), los intentos y los errores se guardan para auditoría interna; no cambian la experiencia del cliente.
- Usar una identidad fiscal estable e idempotencia para prevenir duplicados cuando el Worker registre una factura que previamente fue cargada manualmente.
- Una venta solo se marca como facturada cuando la emisión está confirmada y el comprobante quedó registrado.
- La creación de una venta no emite una factura ni modifica automáticamente el estado fiscal.

## Archivos

- Cloudflare R2 es el almacenamiento único de comprobantes.
- El dominio de medios es `media.zap.com.ar`; no incorporar Vercel Blob.
- Se permiten enlaces directos con rutas opacas que contengan identificadores aleatorios criptográficamente seguros. No incluir CUIT, email, número de factura ni otros datos personales en la ruta.
- No publicar listados de archivos ni habilitar indexación.
- Guardar la clave del objeto R2 y los metadatos necesarios en la base de datos. No usar el nombre original del archivo como ruta pública.
- Validar tamaño y contenido real del archivo.
- Gestionar los reemplazos y los fallos de escritura para evitar perder el comprobante válido o dejar objetos huérfanos sin control.

El enlace opaco reduce la exposición casual, pero no equivale a autorización de acceso: cualquiera que obtenga la URL puede abrirla. Esta es una decisión consciente del nivel de privacidad previsto para los comprobantes comerciales.

## Bandeja administrativa

Debe existir una única vista operativa de solicitudes que requieren gestión manual. Debe mostrar cliente, venta(s), fecha, datos fiscales disponibles, motivo de derivación y estado; y permitir cargar el comprobante emitido en pocos pasos.

La carga debe registrar el comprobante y completar el flujo, sin obligar al administrador a actualizar manualmente varios módulos o reconstruir el contexto del cliente.

## Límites por repositorio

La asignación exacta se confirmará al completar la auditoría; no se debe asumir que un repositorio es dueño de un dato o endpoint sin comprobarlo.

- **`tienda-zap`:** experiencia de venta/cliente, persistencia de la solicitud, bandeja administrativa, relación entre ventas y comprobantes, UI de consulta.
- **`zap-nextjs`:** integrar solo las partes de cuenta/administración/archivos que la auditoría confirme que pertenecen a este circuito; evitar duplicar modelos o estados con Tienda.
- **`zap-fiscal-core`:** emisión fiscal mediante Worker, idempotencia y concurrencia por CUIT, resultado/reconciliación con ARCA y comunicación fiable del resultado al registro canónico.

Debe definirse una única fuente de verdad para la solicitud y el registro del comprobante. No duplicar el estado de facturación en sistemas distintos sin un contrato de sincronización explícito.

## Requisitos de fiabilidad

- Transiciones de estado validadas en servidor y trazables.
- Solicitudes, trabajos y callbacks idempotentes.
- Concurrencia controlada para impedir emisiones simultáneas de la misma solicitud.
- Recuperación tras caída del Worker o error de red; no perder solicitudes pendientes.
- No emitir de nuevo mientras un resultado previo siga siendo incierto.
- No reemplazar ni eliminar un comprobante válido antes de confirmar que el nuevo registro quedó persistido.
- No actualizar datos históricos de una venta a partir de cambios posteriores en el catálogo.

## Pruebas de aceptación

- Solicitud repetida y reintento de red no duplican solicitud ni factura.
- Worker no disponible o error definitivo deriva a gestión manual.
- Timeout después de enviar a ARCA dispara reconciliación, no una emisión ciega.
- Una factura emitida pero con respuesta perdida se recupera sin duplicación.
- Carga manual de una factura ya emitida termina el flujo sin volver a emitir.
- El registro posterior del Worker de una factura cargada manualmente se deduplica.
- Factura agrupada queda asociada a todas las ventas cubiertas del mismo cliente.
- El estado persiste después de recargar y en nuevas sesiones.
- Los comprobantes se sirven desde R2 mediante `media.zap.com.ar` con rutas opacas.
- Fallos al guardar metadatos o reemplazar archivos no pierden la referencia al comprobante válido.
- La venta nunca se marca como facturada solo por recibir una solicitud o subir un archivo.
- La UI es idéntica para el cliente, independientemente de la vía de resolución.

## Orden de implementación

1. Completar auditoría de rutas, modelos, permisos y flujos existentes.
2. Definir fuente de verdad, esquema de estados, relaciones y claves idempotentes.
3. Implementar persistencia de solicitudes y registro canónico.
4. Implementar UI del cliente y bandeja administrativa.
5. Integrar Worker, reintentos y reconciliación.
6. Migrar la carga de comprobantes a R2 y unificar consulta.
7. Añadir pruebas, runbook y guía de adaptación para otros clientes.
8. Revisar el diff y las migraciones antes de cualquier despliegue.

**No incluido en esta especificación:** cambios funcionales, migraciones de base de datos, despliegues o emisión fiscal automática al crear una venta.


## Decisión cerrada: representación y archivo del comprobante (13-10-2026)

**Decisión de arquitectura:** la vista HTML será la representación inmediata para consultar en la experiencia de cliente; además, se generará en servidor un PDF reproducible y se conservará en R2 como copia documental estable. Ambos deben derivarse del mismo registro fiscal canónico y de los datos confirmados de la emisión. No son dos facturas diferentes.

La representación gráfica de comprobantes electrónicos debe ajustarse a los requisitos aplicables al tipo de comprobante. La RG ARCA 4291, artículo 15, establece requisitos para la representación gráfica en imagen y/o impresión, incluidos el modelo aplicable y la consignación del CAE/CAEA; también pueden corresponder datos de Transparencia Fiscal al Consumidor y QR según el régimen y comprobante aplicables. Referencia normativa: https://www.argentina.gob.ar/normativa/nacional/resoluci%C3%B3n-4291-2018-313088/actualizacion y texto vigente publicado en la Biblioteca Electrónica de ARCA.

### Reglas de implementación

- La confirmación fiscal de ARCA es la fuente para el estado `INVOICED`; generar HTML o PDF no emite ni autoriza un comprobante.
- La vista HTML y el PDF deben presentar los mismos datos fiscales congelados: emisor, receptor, tipo y número de comprobante, punto de venta, fecha, moneda/importes, impuestos y desgloses que correspondan, CAE y vencimiento, más los restantes datos obligatorios según tipo y régimen.
- Incluir el QR y las leyendas/datos exigidos cuando correspondan. No considerar esta lista como sustituto de una validación formal por tipo de comprobante y condición fiscal del emisor.
- El PDF se genera en backend a partir de los datos fiscales canónicos y se almacena en R2 bajo una clave aleatoria criptográficamente segura; guardar la clave y metadatos en el registro canónico. No aceptar como “emitido” un PDF generado desde datos no confirmados.
- La carga manual solo registra un comprobante ya emitido. Debe conservar el archivo proporcionado por el administrador y sus metadatos, sin generar una nueva emisión ni sobrescribir el original sin trazabilidad.
- Si se re-genera una representación por corrección de formato, no cambiar los datos fiscales históricos. Registrar versión/hash y fecha de generación si se necesita trazabilidad de las representaciones.
- La validez fiscal no deriva del formato HTML/PDF ni del almacenamiento en R2. Antes de habilitar producción se debe verificar el diseño final frente a la normativa vigente para cada tipo de comprobante usado por ZAP y sus condiciones tributarias.

### Criterio de aceptación específico

Una factura confirmada debe poder abrirse como HTML y descargarse como PDF; ambas representaciones deben coincidir con el registro fiscal canónico, incluir los campos y elementos obligatorios que correspondan y no provocar una nueva solicitud de emisión. Un timeout o resultado incierto de ARCA no habilita la generación de un comprobante que se presente como factura emitida.


## Auditoría de implementación previa: `feat/customer-invoice-flow` (13-10-2026)

Se encontró una implementación anterior en la rama `feat/customer-invoice-flow`. No está integrada en `main`; la comparación de refs informa que esa rama está 1 commit por delante y 38 por detrás de `main`. No integrarla ni copiar archivos en bloque: primero reconciliarla con el código actual y revisar los siguientes bloqueos. La auditoría es estática; no se ejecutaron pruebas ni emisiones.

### Piezas reutilizables

- Vista de pedido en `src/app/(public)/perfil/ordenes/[id]/page.tsx` con un panel de solicitud de factura y datos del receptor.
- Endpoints de solicitud y consulta/reconstrucción de PDF, cálculo fiscal aislado y pruebas unitarias de casos básicos de importes y redondeo.
- Separación conceptual entre resultado de autorización ARCA y estado de generación del PDF; la ruta de recuperación intenta generar el PDF sin volver a emitir.
- Reglas que bloquean pedidos no confirmados, artículos sin clasificación fiscal y condiciones de emisor que no tienen una regla habilitada.

### Bloqueos para reutilizarla

1. **Modelo acoplado a la orden:** los nuevos campos y snapshots se guardan directamente en `Order`, con índices únicos por `invoiceFiscalJobId`, `invoiceExternalId` e `invoiceIdempotencyKey`. Esto no permite una factura canónica que cubra varias ventas y contradice el requisito de facturas agrupadas. No aplicar su SQL manual tal cual.
2. **Almacenamiento contradictorio con la decisión vigente:** la rama usa un bucket R2 privado, URLs firmadas y autenticación del propietario. La decisión acordada para este proyecto es R2 bajo `media.zap.com.ar` con URL pública opaca y no indexada. La elección final de exposición debe implementarse de forma consistente; no mezclar los dos modelos. La URL opaca no es control de acceso.
3. **La vía manual no está migrada a R2:** `src/app/api/admin/orders/[orderId]/invoice/route.ts` continúa importando `@vercel/blob` y escribe un archivo público. Además, la validación se basa en el MIME declarado por el cliente; falta validar contenido real y resolver reemplazo/limpieza de objetos.
4. **Ruta de consulta del Worker incorrecta para el contrato actual:** `src/app/api/orders/[orderId]/invoice/sync/route.ts` llama a `/v1/invoices/jobs/:jobId`, pero `zap-fiscal-core` registra `GET /v1/jobs/:jobId`. La consulta de estado fallaría hasta alinear el endpoint.
5. **Contrato de detalle de artículos sin confirmar:** la solicitud agrega `items`, pero el handler actual de `zap-fiscal-core` valida/consume `voucher`, `amounts` y `customer`, y construye el trabajo fiscal con esos campos; no se ha verificado un contrato desplegado que acepte y use `items`. No asumir que el detalle comercial se transmite a ARCA ni fusionar primero una modificación no auditada del Worker.
6. **Sin factura agrupada ni reconciliación entre vía manual y Worker:** el flujo está centrado en una orden y usa `invoiceSource` en ella. La carga manual bloquea emisión automática en esa misma orden, pero no crea una identidad fiscal canónica que deduplique una factura manual con un resultado tardío del Worker.
7. **Experiencia del cliente distinta de la decisión:** el CTA dice “Generar factura”, y la pantalla muestra CAE y estado de PDF. Debe adaptarse al contrato `SOLICITAR FACTURA` → `FACTURA PENDIENTE` → `VER FACTURA`, sin hacer depender el estado de React ni exigir al cliente reintentar la solicitud.
8. **Consulta por polling, sin receptor durable de webhooks identificado en esta rama:** hay que diseñar y probar el registro durable/deduplicación de eventos del Worker o definir explícitamente un mecanismo de reconciliación periódico y operativo. No depender solo de que el cliente vuelva a abrir la pantalla.
9. **La vista HTML acordada todavía no está implementada:** el generador encontrado produce PDF; la decisión vigente requiere vista HTML y PDF derivadas del mismo registro fiscal canónico.
10. **La ruta de descarga está protegida por sesión y propietario:** eso es coherente con la alternativa privada de esa rama, pero no con el enlace directo opaco acordado. También se mantiene en el pedido el enlace manual antiguo `invoiceUrl`; hay que unificar ambos tipos de comprobante detrás del registro canónico.

### Resultado de la auditoría

La rama previa aporta ideas reutilizables (cálculo fiscal aislado, snapshots, recuperación de PDF y pruebas iniciales), pero **no se considera base integrable ni lista para producción**. El siguiente paso es definir el modelo canónico independiente de `Order`, localizar y fijar la única fuente de verdad y diseñar el contrato exacto entre Tienda y Worker. Recién después se podrá rescatar selectivamente el cálculo fiscal y la generación de PDF, corregir rutas/contratos y ampliar las pruebas. No se modificó código funcional ni se ejecutó SQL.
