# Plan de Padrón ARCA: onboarding fiscal y consulta pública

## Decisión funcional

La consulta al Padrón es una capacidad independiente de la emisión de comprobantes. Habilitar consultas no habilita la emisión, ni en TEST ni en PROD. La emisión sigue bloqueada hasta que el cliente haya incorporado el CUIT emisor y se hayan comprobado las autorizaciones efectivas del Worker/ARCA para ese CUIT, ambiente y operación.

## Dos experiencias, servicio fiscal controlado

### 1. Onboarding dentro de tienda.zap.com.ar

1. El cliente ingresa el CUIT que quiere incorporar.
2. El backend solicita una consulta actual al Padrón mediante una ruta de onboarding autorizada que usa la identidad fiscal de ZAP.
3. Se presenta una vista previa de los datos efectivamente devueltos por ARCA; el usuario confirma la vinculación.
4. Se crea o vincula el contribuyente de forma idempotente, sin duplicar tenants, contribuyentes ni asociaciones.
5. La información registral requerida para el alta se toma de ARCA. No completar campos faltantes con valores ficticios o defaults como una condición de IVA o fecha de inicio supuestas.
6. La consulta por sí sola no crea permisos de emisión ni activa certificados. El cliente completa después su configuración fiscal propia.

### 2. Landing pública de demostración

1. Una persona puede ingresar un CUIT sin iniciar sesión y solicitar una consulta en tiempo real.
2. El resultado se limita a un conjunto explícitamente aprobado de datos registrales no sensibles devueltos por ARCA.
3. Límite inicial configurable: máximo de 4 consultas por día y visitante, con controles de frecuencia y abuso en el servidor. Evaluar cuota por IP más señales adicionales y defensas contra automatización; no confiar en un contador del navegador.
4. La cuota pública se registra por separado de las cuotas y consumo de clientes. Definir límite global/circuit breaker para controlar costos y abuso.
5. Las respuestas fallidas o incompletas de ARCA se muestran como fallo de consulta; no presentar datos almacenados como actuales ni inventar resultados.
6. Restringir tamaño/frecuencia, validar CUIT, usar idempotencia donde corresponda, registrar auditoría sin almacenar datos personales innecesarios y devolver errores normalizados sin detalles internos.

## Identidad, autorización y seguridad

- La identidad/certificado de ZAP para consultas de onboarding y la landing se mantiene solo en el backend/Worker; nunca se comparte con tenants de clientes ni llega al navegador.
- Antes de habilitar consultas a CUIT de terceros, verificar en código y con una prueba autorizada que el certificado, los servicios delegados y los permisos ARCA de ZAP permiten la operación. No asumir que conocer el CUIT o tener un certificado alcanza.
- Preferir una ruta/servicio dedicado para las consultas públicas y de onboarding, con autorización interna explícita, cuota separada, allowlist de campos, idempotencia, rate limiting y auditoría. No debilitar el control tenant-scoped actual de `POST /v1/padron/consultas`.
- Separar TEST y PROD donde aplique; no confundir una consulta exitosa en homologación con autorización o disponibilidad en producción.
- No devolver certificados, claves privadas, TA/TRA/CMS, secretos, información de cuenta ni trazas internas.
- La fuente fiscal de verdad sigue siendo `zap-fiscal-core`; `tienda-zap` consume una respuesta reducida y puede mantener solo la proyección necesaria para su interfaz.

## Flags y separación de capacidades

- `padronQuery`: controla las consultas de Padrón de clientes autenticados/onboarding.
- La landing pública requiere una compuerta independiente (por ejemplo, `publicPadronLookup`) y cuotas propias; no debe quedar abierta solo porque `padronQuery` se habilitó para una cuenta.
- `invoiceEmissionTest` y `invoiceEmissionProd` permanecen independientes y desactivadas hasta cumplir sus gates.
- Las flags deben aplicarse en servidor y UI; una flag nunca sustituye la autorización efectiva de ARCA.

## UX y datos mostrados

- Landing: campo CUIT, estado de consulta, resultado legible y hora de consulta; explicar el límite diario sin prometer disponibilidad cuando ARCA falle.
- Mostrar solo los campos que se verifiquen en la respuesta real y se aprueben para exposición pública. Candidato sujeto a validación: CUIT, razón social/nombre registral, estado registral pertinente y condición IVA. El domicilio fiscal no se incluye hasta resolver expresamente que sea necesario y apropiado para la vista pública.
- Onboarding autenticado: previsualizar datos registrales antes de confirmar el alta y mostrar claramente que consultar no autoriza a facturar.
- No inferir permisos, puntos de venta ni estado de emisión a partir de una consulta al Padrón.

## Pruebas y criterios de aceptación

- Consulta válida e inválida, CUIT inexistente/no encontrado, ARCA lento/caído, respuesta incompleta, timeout y reintento.
- Verificar cuota diaria por visitante, concurrencia en el límite, rotación de IP/automatización y límite global; ninguna ruta debe permitir saltarse los controles.
- Demostrar aislamiento entre cuota pública y consumo de cada tenant.
- Verificar que una consulta pública no crea tenants, contribuyentes ni permisos de emisión.
- Verificar que una consulta de onboarding no duplica registros y que el alta requiere confirmación.
- Verificar que activar la consulta no habilita emisión TEST/PROD.
- Comprobar redacción de datos sensibles, secretos y errores en respuestas/logs.
- Tests, typecheck, build, revisión del contrato del Worker y prueba autorizada con ARCA antes de habilitar o desplegar.

## Secuencia de la próxima pasada

1. Auditar la ruta actual del Worker `/v1/padron/consultas`, su Durable Object/cliente ARCA, identidad WSAA, permisos, cuota, persistencia e idempotencia.
2. Determinar la ruta más segura para una capacidad de consulta ZAP de servicio, separada de la autorización tenant-scoped actual.
3. Confirmar qué datos devuelve ARCA en el código real y elegir la allowlist pública; verificar el requisito de representación/delegación antes de probar CUIT de terceros.
4. Implementar primero el contrato backend y pruebas de aislamiento/cuotas; luego integrar onboarding y landing.
5. Mantener emisión y operaciones productivas deshabilitadas; no desplegar hasta que los checks requeridos pasen.

## Hallazgos de la primera pasada técnica — 22/10/2026

Revisión del código actual de `zap-fiscal-core/main`:

- `POST /v1/padron/consultas` está autenticado por tenant y exige que `representedCuit` ya exista como contribuyente vinculado, además de una asociación `tenantContributor` con permiso activo `canQueryPadron`. No sirve directamente para visitantes públicos ni para el onboarding inicial si ZAP aún no está asociado al tenant del cliente.
- El handler actual guarda la consulta con idempotencia por tenant y, en PROD, reserva/ajusta una unidad de la cuota mensual de Padrón del tenant. TEST no consume esa misma reserva mensual. La cuota pública diaria no debe reutilizarse como cuota de tenant.
- El Durable Object `FiscalAgent` llama a `getValidToken(..., 'canQueryPadron', 'ws_sr_padron_a5')`. La selección de certificado requiere que esté activo, vigente, corresponda a `holderCuit` y tenga `uploadedByTenantId` igual al tenant solicitante. La identidad de WSAA se separa por ambiente, servicio y huella del certificado.
- Por lo anterior, no se debe “resolver” el onboarding cambiando solamente `representedCuit`: el flujo actual necesita una identidad/certificado asociado al tenant y permisos explícitos. La consulta de servicio ZAP requiere una ruta y un contexto de autorización diseñados expresamente, sin copiar credenciales de ZAP a cuentas cliente ni relajar el endpoint actual.
- La ruta interna `/internal/wsaa/probe` inspeccionada en `main` es exclusivamente una prueba TEST de WSAA para el servicio `wsfe`; su comentario indica que no llama a Padrón. No demuestra que el certificado tenga delegación para `ws_sr_padron_a5` y no debe usarse como evidencia de que las consultas Padrón funcionan.
- El cliente SOAP usa el servicio `ws_sr_padron_a5` y consulta los endpoints distintos de homologación y producción. El parser devuelve el objeto completo `personaReturn`; hoy el handler responde con ese objeto en `result`. Una API pública nueva debe aplicar una allowlist explícita de campos antes de responder, en vez de reenviar el objeto completo.
- `POST /v1/contributors` actualmente aplica defaults para datos registrales faltantes (incluye condición IVA `MONOTRIBUTO` e inicio de actividad `2000-01-01`). El flujo nuevo no debe aceptar esos defaults como datos reales: hay que corregir el contrato/validación o exigir una respuesta Padrón verificada antes de crear un contribuyente nuevo.

### Próxima tarea técnica concreta

Auditar cómo el Worker obtiene el certificado de ZAP y qué autorización/delegación real tiene para `ws_sr_padron_a5` en TEST/PROD. Luego diseñar un servicio interno de consulta con identidad de servicio, cuota pública independiente y respuesta reducida. Hasta confirmar la delegación y el contrato, no habilitar consultas públicas en vivo ni afirmar que ZAP puede consultar cualquier CUIT.
