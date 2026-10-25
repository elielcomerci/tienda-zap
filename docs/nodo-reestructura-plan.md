# Reestructuración del espacio NODO ZAP

## Objetivo

Organizar el portal de clientes bajo `/perfil/nodo`, crear las vistas de lanzamiento y conservar las operaciones que ya funcionan. Esta pasada se enfoca en navegación, estructura visual y rutas. Las integraciones nuevas de las vistas se conectan en una pasada posterior.

## Pasada 1: estructura y vistas

1. Agregar navegación propia de NODO y un resumen de cuenta.
2. Dividir el espacio fiscal existente en vistas de resumen, emisión, comprobantes, configuración y herramientas, reutilizando la lógica fiscal actual.
3. Crear la vista de clientes y productos con estados vacíos claros, sin datos inventados ni persistencia ficticia.
4. Mover visualmente Integraciones bajo NODO.
5. Usar únicamente las rutas nuevas bajo `/perfil/nodo`; el portal todavía no tiene clientes productivos que requieran conservar rutas antiguas.
6. Separar los datos personales de Inicio en Mi cuenta.
7. Mantener intactos los endpoints actuales durante esta pasada.

## Pasada 2: conexión de APIs y agenda

1. Las vistas NODO llaman `/api/nodo`; los handlers existentes se reutilizan por rewrite a `/api/fiscal`, así la sesión, validaciones, cuotas y permisos actuales siguen aplicando.
2. Clientes y productos se guardan en tablas propias vinculadas a `FiscalClientAccount`, con CRUD y filtros por cuenta en servidor.
3. Emisión permite cargar datos guardados del cliente y de un ítem. Datos ingresados a mano se identifican como tales; no se presentan como datos de ARCA.
4. La migración `20261025100000_nodo_customer_product_catalog` debe aplicarse antes de habilitar la agenda en un entorno.

## Próxima pasada: consultas fiscales y cierre de emisión

1. Definir y conectar consulta de padrón según el propósito (alta de cliente, alta/vinculación de contribuyente o landing pública) y la precedencia entre datos manuales y ARCA.
2. Completar repetición, agenda, exportación/envío y webhooks según contratos confirmados del Worker.
3. Implementar la landing pública y su puerta `/api/public/padron` con límites y Turnstile.

## Límites de esta reestructuración

- No se cambian contratos ni datos del Worker.
- La migración de agenda agrega tablas aisladas y no altera registros fiscales existentes.
- La vista no presenta datos simulados como datos reales.
- La autorización de emisión, los planes y las cuotas siguen siendo responsabilidad del Worker.
- No se mueve la consola administrativa en esta pasada.

## Verificación

- Revisar enlaces antiguos y nuevos, estados vacíos y acceso por sesión.
- Ejecutar typecheck y revisar el diff. Las pruebas funcionales contra Worker/ARCA quedan para la pasada de integración.
