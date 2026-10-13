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


## Decisión de fuente de verdad y modelo conceptual (13-10-2026)

La auditoría confirma que las ventas, el checkout, el modelo `Order` y la pantalla de detalle de pedido viven en `tienda-zap`. `zap-nextjs` contiene gestión general de archivos de clientes (`ClientFile`), pero en esta revisión no se encontró un circuito de facturación asociado a esas ventas. Por tanto, para la facturación de ventas de Tienda:

- **Fuente de verdad comercial y de facturación: `tienda-zap`**. La solicitud, el vínculo con ventas, el registro fiscal canónico, el estado visible y las referencias a archivos viven aquí.
- **`zap-fiscal-core`: autoridad de ejecución fiscal**. Recibe solicitudes autenticadas, gestiona idempotencia/concurrencia y devuelve el resultado confirmado de ARCA. No reemplaza el registro canónico comercial de Tienda.
- **`zap-nextjs`: fuera del circuito de facturación de pedidos de Tienda por ahora**. No replicar allí estados ni usar `ClientFile` como fuente de verdad. Si en el futuro se facturan ventas originadas en ese sistema, deberá definirse una integración explícita contra el registro canónico, no un segundo circuito independiente.

### Modelo conceptual a diseñar antes de migrar

No usar columnas `invoice*` en `Order` como modelo definitivo. Crear entidades independientes con identificadores estables:

- **InvoiceRequest**: solicitud persistida, estado, cliente, snapshot del receptor, clave idempotente, `externalId`, `jobId`, datos de configuración fiscal congelados para el intento, timestamps, motivo de revisión y vínculo con una o varias ventas mediante una relación explícita.
- **FiscalInvoice**: una sola factura canónica con identidad fiscal única (emisor/CUIT, ambiente, punto de venta, tipo y número), CAE y vencimiento, fecha de emisión, snapshot fiscal de receptor/ítems/importes, procedencia, datos de reconciliación y estados separados de autorización y representación documental.
- **FiscalInvoiceOrder** (o entidad puente equivalente): relación muchos-a-muchos entre factura y venta, con restricciones que impidan asociar ventas de distintos clientes y que permitan una factura para varias ventas del mismo cliente.
- **InvoiceDocument** (o campos versionados dentro de `FiscalInvoice` si el alcance se mantiene simple): formato, clave R2, nombre de descarga, hash, fecha/versión de generación y procedencia del archivo. El PDF/HTML no constituye una emisión fiscal separada.
- **FiscalEvent / InvoiceAttempt**: registro durable de callbacks, reintentos y reconciliaciones, deduplicado por ID de evento y asociado a la solicitud/job. Si se opta por polling en vez de webhook, debe quedar definido un mecanismo de reconciliación durable equivalente.

Las restricciones únicas deben estar en el nivel correcto: una clave idempotente por intento/solicitud y una identidad fiscal única por comprobante, no un supuesto de una factura por orden. Las transiciones de estado deben ejecutarse en servidor con transacciones y control de concurrencia.

### Siguiente corte de trabajo

Antes de diseñar migraciones o tocar código, cerrar el contrato real del Worker: ruta de consulta (`GET /v1/jobs/:jobId`), campos admitidos para el detalle de comprobante y datos que devuelve al confirmar. Después, diseñar el esquema Prisma y la estrategia de migración conservando los `invoiceUrl` históricos como comprobantes manuales legados hasta reconciliarlos; no borrarlos ni moverlos en esta fase de auditoría.


## Auditoría de contrato y propuesta de migración (13-10-2026)

### Matriz de contrato: Tienda ↔ Worker

| Operación | Contrato actual verificado | Consecuencia para la integración |
|---|---|---|
| Crear emisión | `POST /v1/invoices/emit`; API key de tenant; respuesta asíncrona normal `202 { jobId, status: "PENDING", externalId }`. La misma clave idempotente puede devolver un job existente. | Persistir solicitud y clave antes de llamar al Worker; persistir `jobId` cuando llegue. Ante timeout de red, recuperar por la misma clave o `externalId`, nunca crear una clave nueva para “probar”. |
| Consultar job | `GET /v1/jobs/:jobId`; requiere autenticación del tenant. El job debe pertenecer a ese tenant. | La ruta de la rama antigua `/v1/invoices/jobs/:jobId` es incorrecta. Alinear cliente backend con `/v1/jobs/:jobId`. |
| Estado de job | El handler devuelve `PENDING`, `PROCESSING`, `DONE`, `FAILED` o `DEAD` según estado persistido; si hay comprobante, `voucher` incluye `voucherType`, `voucherNumber`, `cae`, `caeFchVto`, `issuedAt` y observaciones. | No traducir cualquier respuesta HTTP exitosa a factura emitida. Solo marcar autorizada con job terminal exitoso y metadatos fiscales completos. `FAILED/DEAD` exige revisión; no implica permiso para volver a emitir. |
| Emisión síncrona | `?sync=true` espera como máximo 10 segundos; puede responder con job pendiente si no termina. | No depender del modo síncrono para completar UX. Una respuesta incompleta o timeout queda pendiente y se reconcilia contra el mismo job. |
| Webhook | El sender emite `X-Fiscal-Signature: sha256=...`, `X-Fiscal-Event-Type`, `X-Fiscal-Event-Id` y `X-Fiscal-Timestamp`; firma el texto `${timestamp}.${rawBody}`. El destino y secreto efectivos salen de la configuración del tenant. | El receptor de Tienda debe verificar firma sobre el cuerpo crudo y tolerancia temporal, insertar el evento con ID único antes de responder 2xx, y procesarlo idempotentemente. La URL no se define libremente desde la solicitud de cliente. |
| Detalle fiscal | El tipo TypeScript y la validación del Worker admiten `externalId`, `idempotencyKey`, `contributor`, `voucher`, `amounts`, `customer` y configuración opcional de webhook. El job inmutable se construye con `voucher`, `amounts`, `customer` y webhook. No existe campo `items` en el contrato declarado ni se incluye en el payload fiscal construido. | La rama antigua envía `items: lineItems`, pero eso no prueba que el Worker lo valide, persista o use. Los importes/desgloses llegan; el detalle comercial no. No presentar los ítems como “enviados a ARCA”. Definir y probar cómo se obtiene la descripción exigida para la representación del comprobante. |
| Cuota | En el Worker actual, una emisión PROD puede reservar unidad de cuota y responder `402 FREE_QUOTA_EXHAUSTED` con referencia a 25 unidades gratuitas del período. | La auditoría anterior no tenía confirmada la regla comercial; ahora sí existe lógica de cuota en el código. Sigue pendiente confirmar condiciones comerciales/tenant antes de mostrarla o tratarla como promesa del producto. |

**Nota de alcance:** esta verificación es estática sobre el código consultado en GitHub; no demuestra que el deployment activo corresponda a ese commit ni que el tenant, CUIT, ambiente, punto de venta y callback estén configurados y probados de punta a punta.

### Reglas de mapeo del resultado fiscal

1. Persistir la solicitud local antes de llamar al Worker, con un `externalId` y una `idempotencyKey` estables. No derivar una clave nueva de cada reintento.
2. Guardar `jobId` con unicidad local cuando se reciba. Si la respuesta se pierde antes de guardar el identificador, reintentar la misma petición con la misma clave idempotente y validar que el Worker devuelve el mismo trabajo.
3. La consulta `GET /v1/jobs/:jobId` no devuelve PDF ni URL de documento. La emisión autorizada y la disponibilidad de su representación son estados distintos.
4. El job status consultado no ofrece `lastError` en el formato documentado aquí; para `FAILED/DEAD` expone un mensaje genérico. No basar la UI administrativa en un campo `lastError` inexistente; obtener el detalle seguro por un mecanismo explícito de diagnóstico/operación.
5. Los eventos webhook pueden repetirse o llegar tarde. Guardar el evento bruto verificado y su ID antes del ACK; procesar el evento y la actualización de solicitud/factura en una transacción o mediante una cola durable. Si no se puede persistir, responder error para permitir reintento.
6. Tanto webhook como polling deben converger en la misma función de reconciliación y en la misma identidad fiscal canónica. No permitir que dos canales creen dos facturas.
7. La identidad fiscal de un comprobante autorizado debe normalizarse al menos por CUIT emisor, ambiente, punto de venta, tipo y número. CAE, fecha e importes se validan y conservan como atributos confirmados; no sustituyen por sí solos la clave única del comprobante.
8. El Worker devuelve códigos numéricos ARCA de tipo de comprobante, mientras la solicitud de Tienda usa letras. Mantener un mapper explícito y testeado; no confundir los códigos de facturas con los de notas de crédito u otros tipos.

### Modelo Prisma propuesto: responsabilidades y restricciones

Es un diseño lógico previo a la migración, no un esquema ya aplicado. Los nombres finales y tipos deben alinearse con los enums, convenciones y relaciones existentes.

- **`InvoiceRequest`**: una solicitud del cliente. Campos lógicos: `id`, `customerId`, `status`, snapshot inmutable del receptor, snapshot de configuración del emisor, `voucherType`, `concept`, `amountsSnapshot`, `externalId`, `idempotencyKey`, `fiscalJobId`, timestamps, `reviewReason` y relaciones a ventas/factura. Índices únicos para `externalId`, `idempotencyKey` y `fiscalJobId` cuando no sean nulos. Una solicitud agrupa una o varias ventas del mismo cliente.
- **`FiscalInvoice`**: el comprobante canónico, sin depender de una orden concreta. Campos lógicos: CUIT emisor, ambiente, punto de venta, tipo y número, CAE/vencimiento, fecha, datos de receptor, moneda, importes, desglose impositivo, snapshot de conceptos, procedencia (`WORKER` o `MANUAL`), fecha de confirmación y datos de reconciliación. Restricción única por identidad fiscal normalizada: CUIT emisor + ambiente + punto de venta + tipo + número. Los metadatos que no puedan verificarse al cargar un comprobante manual deben quedar marcados como pendientes de completar/verificar, no inventarse.
- **`InvoiceRequestOrder`** (o relación explícita equivalente): puente entre solicitud y orden. Validar en servidor que todas las órdenes pertenecen al mismo cliente y son elegibles; bloquear duplicación accidental de una misma venta en solicitudes activas incompatibles. La posibilidad de varias ventas por factura requiere una decisión explícita sobre si cada orden puede estar vinculada a más de una factura en casos parciales/rectificativos; no imponer una unicidad más restrictiva sin definir ese caso.
- **`FiscalInvoiceOrder`**: puente entre factura canónica y órdenes cubiertas. Mantiene la relación muchos-a-muchos y permite que una factura manual o del Worker se vincule a varias ventas. El mismo comprobante no debe duplicarse por orden.
- **`InvoiceDocument`**: cada representación/archivo de una factura. Campos lógicos: factura, formato (`HTML`/`PDF`/`UPLOAD`), clave de objeto R2, nombre, MIME validado por contenido, tamaño, SHA-256, fecha de alta/generación, versión y origen. La clave R2 usa aleatoriedad criptográfica; la URL pública se construye con `media.zap.com.ar`. No guardar datos personales en la ruta.
- **`FiscalEvent`** y/o **`InvoiceAttempt`**: evento webhook con ID único, timestamp, tipo, job/externalId, hash/cuerpo verificado, estado de procesamiento y error seguro; intentos con tipo, resultado, fechas y contadores. Separar el historial durable de eventos de la solicitud actual. La retención del cuerpo bruto debe limitarse a lo necesario y proteger secretos/datos personales.

**Separación de estados obligatoria:**
- Solicitud: no solicitada (implícita), pendiente, procesando, requiere revisión, resuelta/cancelada según reglas aprobadas.
- Autorización fiscal: pendiente, autorizada, rechazada/no concluyente; no inferir “rechazada” de un timeout de red.
- Representación: pendiente, lista, fallida; un error al generar PDF no debe revertir una autorización confirmada.
- Reconciliación: sin conciliar, conciliada, conflicto; los conflictos entre factura manual y resultado Worker deben quedar en cola de revisión, nunca resolverse por sobrescritura silenciosa.

### Estrategia de migración sin pérdida de historial

**Fase 0 — solo auditoría (estado actual):** no ejecutar SQL, no modificar Prisma funcional, no desplegar ni emitir. Inventariar registros existentes de `Order.invoiceUrl`, `invoiceFileName` y `invoiceUploadedAt`, incluyendo URL/host, nombre, fecha, orden, cliente y estado de pago; no asumir que cada archivo es fiscalmente válido.

**Fase 1 — expansión compatible:** cuando se apruebe la implementación, añadir las tablas y relaciones nuevas en una migración aditiva. Conservar las tres columnas legacy y no cambiar el tipo ni la obligatoriedad de `OrderItem.productId`. Crear índices y restricciones con cuidado ante nulos y duplicados existentes; verificar conteos y rollback antes de ejecutar en producción.

**Fase 2 — backfill controlado:** por cada orden con `invoiceUrl`, crear un documento/registro legado con origen `LEGACY_MANUAL` o `MANUAL_UNVERIFIED`, conservar la URL original como referencia y enlazarlo a la venta. No inventar CUIT, CAE, tipo/número ni estado de autorización. El archivo debe permanecer accesible mientras se decide su copia a R2; verificar hash/descarga antes de cambiar referencias. Resolver duplicados por identidad fiscal cuando los datos disponibles lo permitan; los casos ambiguos van a revisión.

**Fase 3 — lectura dual temporal:** las vistas nuevas priorizan el registro canónico, pero mantienen fallback explícito a `Order.invoiceUrl` si el backfill no está conciliado. Medir casos pendientes y probar que ningún comprobante histórico desaparezca. Evitar que ambos caminos permitan subir/emitir por separado.

**Fase 4 — escritura canónica:** la nueva carga manual y la integración Worker escriben únicamente en entidades canónicas. Las columnas legacy quedan en solo lectura para compatibilidad; no se borran durante el primer despliegue.

**Fase 5 — cierre posterior:** retirar el fallback y columnas antiguas solo después de conciliación completa, revisión de los casos manuales y un período de estabilidad aprobado. Es un cambio posterior separado, no parte de la migración inicial.

### Condiciones para dar la auditoría por cerrada

- [ ] Confirmar el contrato del deployment Worker que realmente está configurado en producción y la configuración del tenant/webhook.
- [ ] Decidir si el Worker necesita admitir snapshot de conceptos/ítems como contrato versionado; definirlo sin asumir que el campo `items` actual funciona.
- [ ] Validar tipos de comprobante y representación HTML/PDF contra régimen fiscal real de ZAP.
- [ ] Revisar elegibilidad, pagos, cancelaciones, notas de crédito, factura parcial y agrupación de órdenes.
- [ ] Definir política para facturas manuales con metadatos incompletos y para resultados Worker tardíos que colisionen con una factura ya cargada.
- [ ] Preparar un inventario de datos legacy y estrategia de rollback antes de escribir una migración.
- [ ] Diseñar pruebas de concurrencia, timeout tras emisión, repetición de webhook, clave idempotente reutilizada, factura agrupada y fallo de PDF después de autorización.

**Estado después de esta pasada:** contrato del código fuente y propuesta lógica de migración documentados. Sigue siendo una auditoría estática: no se modificó código funcional, no se ejecutó SQL, no se tocaron datos ni se hizo ningún despliegue.


### Precisión adicional: validación y respuestas no equivalentes

- La validación runtime de `handlers/emit.ts` comprueba que `amounts.total` sea numérico y positivo, pero no valida de forma equivalente todos los campos de `net`, `vat`, `exempt`, cada elemento de `vatBreakdown`, ni el formato/consistencia de `voucher.date` y `voucher.concept`. El tipo TypeScript no sustituye la validación runtime. La integración debe validar y cuadrar importes antes de invocar el Worker; también hay que reforzar o formalizar el contrato del Worker antes de considerarlo una frontera de validación fiscal completa.
- No todas las respuestas del endpoint de emisión tienen la misma forma: una creación asíncrona responde con `jobId/status/externalId`; un reintento idempotente de un job ya existente puede responder `200` con estado y `lastError` en estados no exitosos, pero el formato de respuesta de job `DONE` no incluye el objeto `voucher`. Por eso la tienda no debe intentar reconstruir los datos fiscales únicamente desde la respuesta de `POST /v1/invoices/emit`; debe consultar `GET /v1/jobs/:jobId` o procesar el webhook verificado para recuperar el resultado fiscal completo.
- El endpoint `GET /v1/jobs/:jobId` devuelve mensaje genérico para `FAILED/DEAD`, no el detalle interno de `lastError`. Mantener separado el diagnóstico operativo y no exponer errores internos al cliente.
