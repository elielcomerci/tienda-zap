# Emisión fiscal de facturas

## Antes de desplegar

1. Fusionar primero la mejora del contrato en `elielcomerci/zap-fiscal-core` que agrega detalle de artículos y consulta de estado del trabajo fiscal.
2. Ejecutar una sola vez `prisma/manual-sql/order-fiscal-invoices.sql` en la base de datos de Tienda ZAP y regenerar Prisma Client.
3. Configurar `R2_PRIVATE_BUCKET_NAME` con un bucket R2 distinto del bucket público de medios. El bucket privado no debe tener acceso público ni un dominio público asociado.
4. Configurar en el entorno de Tienda ZAP:
   - `FISCAL_WORKER_URL` (por defecto `https://arca.zap.com.ar`)
   - `FISCAL_WORKER_API_KEY` (API key del tenant con permiso para emitir)
   - `ARCA_EMITTER_CUIT`
   - `ARCA_POINT_OF_SALE`
   - `ARCA_FISCAL_ENVIRONMENT` (`TEST` o `PROD`)
   - `ARCA_ISSUER_VAT_CONDITION` (`MONOTRIBUTO`, `RESP_INSCRIPTO`, `EXENTO` o `NO_RESPONSABLE`)
   - `ARCA_ISSUER_IIBB` (número de inscripción o la condición aplicable expresada explícitamente)
5. Confirmar en el Worker que el tenant tiene permiso de emisión para ese CUIT, entorno y punto de venta, y que existe un certificado activo y vigente para ese CUIT/entorno. La clave `CERT_ENCRYPTION_KEY_V1` debe coincidir con la usada al cifrar el certificado. Probar primero en homologación.

## Reglas de seguridad y consistencia

- No se emite ninguna factura al completar el checkout. El cliente debe abrir el pedido, revisar los datos y confirmar explícitamente.
- Los artículos, importes, descuentos y clasificación fiscal se calculan en el servidor desde el pedido persistido. El navegador no puede modificar importes.
- La clasificación fiscal del producto se copia al artículo al crear el pedido. Los pedidos antiguos sin ese snapshot no se facturan automáticamente; requieren revisión.
- Un pedido no puede iniciar una segunda emisión mientras exista una solicitud activa o una factura con CAE. Los reintentos usan la misma clave de idempotencia.
- La autorización ARCA y la generación del PDF son estados separados. Si falla el PDF después de obtener CAE, se recupera el PDF sin volver a emitir.
- Los PDF se guardan solo en el bucket privado. Las descargas requieren autenticación del dueño del pedido y URL firmada de corta duración.
- La carga manual existente se conserva, pero no puede reemplazar una factura ARCA.
- La vista de Facturación es independiente de Mis pedidos, Mis trabajos y archivos, Crédito ZAP y Mis datos.

## Límites intencionales

- La emisión automática para un emisor configurado como `NO_RESPONSABLE` queda bloqueada hasta validar la regla de comprobante aplicable.
- Los productos nuevos deben tener tratamiento fiscal y, si corresponde, alícuota configurados en Administración antes de que sus pedidos puedan facturarse automáticamente.
- No habilitar producción hasta completar pruebas de importes, redondeos, idempotencia, permisos entre usuarios y descarga privada.
