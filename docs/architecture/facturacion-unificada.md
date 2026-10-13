# Circuito unificado de facturación

**Estado:** especificación funcional; pendiente de auditoría técnica e implementación.  
**Issue central:** https://github.com/elielcomerci/tienda-zap/issues/12  
**Alcance de repositorios:** `elielcomerci/tienda-zap`, `elielcomerci/zap-nextjs` y `elielcomerci/zap-fiscal-core`.

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
