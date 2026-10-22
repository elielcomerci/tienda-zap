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
