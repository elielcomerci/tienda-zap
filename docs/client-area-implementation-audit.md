# Área de Clientes: mapa y estado de implementación

Este inventario contrasta el mapa funcional acordado con las rutas y componentes presentes en `tienda-zap`. “Parcial” significa que existe una parte útil del flujo, pero todavía no cubre el alcance descrito. No se consideran funcionales las opciones que solo tengan un rótulo o una vista sin operación real.

## Navegación acordada

El menú del Área de Clientes contiene seis entradas: **Inicio**, **Mis servicios**, **Archivos y mensajes**, **Facturación**, **Integraciones** y **Mi cuenta**. Créditos y beneficios se ubica dentro de Mi cuenta. La campana de notificaciones queda como acceso global cuando exista un sistema de avisos.

Inicio muestra pedidos reales y su estado. Integraciones ahora tiene una página de trabajo en `/perfil/integraciones`; no altera los menús públicos de la tienda ni las consolas internas de ZAP.

## Cobertura actual

| Área del mapa | Estado | Implementación actual | Falta principal |
|---|---|---|---|
| Inicio y pendientes | Parcial | `/perfil` muestra pedidos recientes y pedidos en curso, sin métricas inventadas. | Tareas pendientes, proyectos, avisos relevantes y accesos contextuales. |
| Mi negocio | Parcial | La cuenta fiscal y sus contribuyentes se gestionan desde `/perfil/fiscal`. | Perfil comercial separado de identidad fiscal, selector multiempresa, usuarios y permisos. |
| Servicios | Parcial | Catálogo público y acceso a pedidos. | Contratos, alcance, vigencia, consumos y cambios del servicio. |
| Tienda y pedidos | Parcial | Catálogo, compra y seguimiento de pedidos existentes. | Presupuestos completos, cronología comercial, repetir pedido y relación con proyectos. |
| Mis proyectos | Parcial | `ClientWorkPortal` ofrece espacios de trabajo y archivos compartidos. | Etapas, tareas, responsables, dependencias y actividad del proyecto. |
| Solicitudes y briefs | Parcial | Hay formularios y consultas de producto fuera del portal. | Solicitudes autenticadas, borradores, seguimiento y briefs guardados. |
| Revisiones y aprobaciones | No disponible | No hay un flujo de aprobación con versiones y registro de conformidad. | Versionado, comentario, aprobar, solicitar cambios y auditoría de quién decidió. |
| Mensajes y soporte | Parcial | El portal permite compartir archivos; el contacto general deriva a WhatsApp. | Conversaciones o tickets con contexto, estado, responsable e historial. |
| Facturación | Parcial | `/perfil/fiscal` vincula CUIT/certificados, emite contra el Worker y mantiene un historial local. | UX cotidiana simplificada, pruebas de múltiples CUIT, conciliación accesible, uso del plan y despliegue probado del flujo revisado. |
| Integraciones API | Parcial, implementación local | `/perfil/integraciones` ofrece generadores Node.js/TypeScript y Python, paquete ZIP con `.env`, clave propia por integración, validación autenticada contra `https://arca.zap.com.ar` y revocación/listado de metadatos. PHP, Java y C# quedan marcados pendientes. | Aplicar/deployar Worker con listado interno de claves; habilitar `apiKeyManagement`; probar desde Tienda desplegada; agregar expiración y límites por permisos si el producto lo requiere. |
| Créditos y beneficios | Parcial | `/perfil/creditos` muestra planes, cuotas y comprobantes vinculados. | Saldo y movimientos de beneficios con reglas definidas, sin presentarlos como dinero. |
| Notificaciones | No disponible | No existe una bandeja de notificaciones accionables para cliente. | Avisos con destino, lectura, historial y preferencias. |
| Mi cuenta y seguridad | Parcial | Nombre/teléfono y cambio de contraseña en `/perfil`. | Recuperación completa, sesiones, preferencias, privacidad y gestión de acceso a negocios. |

## Emisión fiscal desde el navegador

La pantalla arma y valida localmente la vista previa. La confirmación realiza una sola petición de navegador a `POST /api/fiscal/invoices/emit?sync=true`; la ruta autenticada de Tienda reenvía una petición al Worker con la clave fiscal descifrada en el servidor. El navegador nunca recibe esa clave ni certificados.

El Worker vuelve a validar autorización, contribuyente, ambiente, punto de venta e importes; aplica idempotencia, reutiliza la autorización fiscal vigente, contacta a ARCA y persiste el comprobante canónico con su snapshot. Si termina dentro de la espera síncrona, la respuesta incluye CAE, número, vencimiento y snapshot. Si excede el límite de 10 segundos, devuelve una referencia al trabajo pendiente; Tienda conserva la misma clave idempotente y no muestra éxito fiscal antes de tener la respuesta autorizada.

La respuesta oficial actualiza la lista en pantalla sin pedir otra lectura para volver a buscar ese comprobante. El Worker sigue siendo el registro fiscal canónico; la fila local de Tienda sirve como referencia y vista de la cuenta. Si falla esa copia local después de que el Worker aceptó la emisión, la UI debe conservar el `jobId` y conciliar, nunca generar otra clave para emitir a ciegas.

El PDF se genera en el dispositivo usando el snapshot fiscal devuelto por el Worker para emisor, receptor, ítems, importes y autorización. La plantilla de la cuenta aporta solo presentación y marca. Así el PDF conserva la identidad del CUIT que emitió aunque el tenant administre varias CUIT. Descargar el archivo local no lo guarda en el almacenamiento de Tienda.

## Generador de integraciones

La página prepara ejemplos reales para `GET /v1/contributors?environment=TEST|PROD`, con `X-Api-Key`, manejo de respuestas HTTP y errores, instrucciones y `.env`. Solo Node.js/TypeScript y Python se ofrecen como generadores listos; PHP, Java y C# aparecen como pendientes. El backend de Tienda valida primero la credencial protegida de la cuenta y después la nueva clave del proyecto contra la URL productiva oficial; si la segunda validación falla, intenta revocar la clave. El valor se entrega una sola vez con `Cache-Control: no-store`, se mantiene en memoria del navegador y se incorpora al ZIP descargado. La clave no tiene alcance aislado por ambiente: el selector preconfigura el ejemplo, mientras que el Worker aplica los permisos del tenant y la autorización de cada CUIT/ambiente.

La prueba valida autenticación del tenant contra la API del Worker y cuenta las CUIT visibles en el ambiente elegido. No contacta a ARCA ni prueba la autorización del certificado. En producción, el contribuyente genera el certificado con CSR mediante el Administrador de Certificados Digitales y luego autoriza el servicio en Administrador de Relaciones; ese flujo es independiente de WSASS y de la clave de API de ZAP.

## Límites y validación

- `sync=true` espera hasta 10 segundos en el Worker. Una emisión más lenta queda en curso y necesita consulta posterior del mismo trabajo; no se debe marcar como autorizada sin CAE.
- Un único envío de emisión desde la interfaz no convierte en atómica una llamada externa a ARCA y la copia local de Tienda. El Worker conserva el resultado fiscal y Tienda concilia por `jobId` si falla su réplica.
- La lista de comprobantes de Tienda refleja comprobantes vinculados al tenant; no es un listado completo de ARCA.
- `npm run typecheck` pasó en `tienda-zap` luego de regenerar localmente Prisma Client, y `npm run typecheck` pasó en `fiscal-worker`.
- No se emitió ningún comprobante ni se llamó a ARCA durante esta modificación.

## Próximas etapas sugeridas

1. Recorrer visualmente Inicio, pedidos, archivos y las pantallas fiscales en escritorio y móvil; corregir detalles de navegación y estados vacíos.
2. Cerrar el flujo síncrono/incierto en homologación con una emisión controlada autorizada, conciliando respuesta y snapshot contra Worker y Tienda.
3. Diseñar la selección explícita de negocio/cuenta antes de activar varios emisores en una misma experiencia.
4. Implementar aprobaciones y solicitudes con historial, permisos de servidor y relaciones con pedidos/proyectos.
5. Habilitar `apiKeyManagement`, desplegar Worker/Tienda y probar generación, descarga ZIP, llamada de ejemplo y revocación; mantener PHP, Java y C# como pendientes hasta tener ejemplos verificados.
6. Implementar notificaciones solo cuando exista un flujo real con destino, lectura e historial.


## Avance del ?rea de clientes (22/10/2026)

- `/perfil/servicios` es ahora la vista dedicada del historial: filtros por estado, paginaci?n, estados vac?os y acceso al detalle de cada pedido. La consulta siempre filtra por el ID autenticado.
- `/perfil/archivos` es el destino propio del men?. Respeta `CLIENT_WORK_FILES_ENABLED`; si est? apagado explica c?mo contactar al equipo y si est? activo muestra los trabajos/archivos, sin presentar mensajer?a ni aprobaciones como disponibles.
- El Inicio enlaza a esos destinos y mantiene solo pedidos recientes.
- El API de trabajos exige alcance expl?cito `scope=admin` para que un ADMIN lea todos los clientes. Sin ese alcance, tambi?n un ADMIN queda limitado a sus propios trabajos. La consola administrativa usa el alcance global; el portal personal pide `scope=client`.
- Se corrigi? un enlace de detalle de cr?dito que usaba una ruta con acento, incompatible con la ruta real `/perfil/creditos/[id]`.
- Verificaci?n: `npm run typecheck` y `git diff --check` pasan. No se despleg?.
- Se agreg? mensajer?a persistida por trabajo, con lectura y env?o autenticados, l?mite de 4.000 caracteres, y autorizaci?n por propietario; el ADMIN usa alcance global solo desde el portal administrativo. La migraci?n `20261022140000_client_work_messages` est? preparada, pero todav?a no se aplic? a la base.
- Sigue pendiente para considerar completa la experiencia: notificaciones globales accionables, aprobaciones con historial/versionado, y solicitudes/briefs autenticados. Requieren definir estados y responsables de operaci?n para ZAP.
