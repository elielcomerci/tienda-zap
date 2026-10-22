# Auditoría del área de clientes y facturación — 22/10/2026

## Hallazgos verificados en `main`

### Área de clientes
- `/perfil` mezcla datos personales, cambio de contraseña, pedidos, créditos, trabajos compartidos y un acceso a la cuenta fiscal. No hay una navegación de portal que explique las áreas de trabajo y su relación.
- El acceso fiscal aparece como una tarjeta dentro del perfil, con una descripción genérica. No existe una jerarquía clara entre negocio/cuenta, compras e historial, facturación y configuración.
- El área fiscal actual carga una cuenta y sus comprobantes en una sola vista, pero el modelo de `FiscalClientAccount` admite una cuenta fiscal por usuario. La interfaz presenta varias CUIT, aunque no permite seleccionar un negocio/cuenta fiscal como contexto principal de toda la experiencia.

### Facturación
- `FiscalWorkspaceClient` mezcla en una única página herramientas conectadas al Worker, consulta de padrón/WSFE, gestión de CUIT, carga/revocación de certificados, emisión, registro manual y listado de comprobantes.
- El formulario de emisión muestra un selector de ambiente TEST/PROD junto al resto de los datos de la factura. Esto contradice la decisión acordada: el ambiente de desarrollo/homologación debe estar fuera del flujo normal de facturación.
- El estado inicial del formulario de emisión es TEST. El usuario puede llegar al formulario sin una señal visual persistente y dominante de qué razón social y CUIT emitirán.
- La selección de CUIT aparece como un campo más del formulario; no existe una cabecera persistente de emisor con identidad legal, CUIT y marca/logo seleccionado que ayude a prevenir errores entre cuentas.
- El registro manual de comprobantes también expone el ambiente en el mismo espacio de trabajo.
- Las herramientas de operación y configuración están visibles junto a tareas comerciales cotidianas. Esto aumenta la carga cognitiva y permite que controles técnicos compitan visualmente con la acción principal.

## Modelo de experiencia acordado

### Portal cliente
Navegación estable, orientada al negocio:
1. **Mi negocio** — identidad de la cuenta, razón social y CUIT vinculadas.
2. **Mi agencia** — trabajos compartidos y entregables, cuando estén habilitados.
3. **Mis compras** — pedidos, estados e historial.
4. **Facturación** — solicitudes de factura, comprobantes y estados.
5. **Configuración fiscal** — CUIT, permisos, certificados y puntos de venta.
6. Las funciones no terminadas permanecen desactivadas tanto en UI como en API; ocultarlas en la interfaz no reemplaza autorización de servidor.

### Facturación normal
- No mostrar un selector TEST/PROD en el flujo habitual.
- Mostrar de forma persistente la identidad del emisor activo: logo disponible, razón social y CUIT. Antes de emitir, mostrar el destinatario y el tipo de comprobante para revisión explícita.
- La factura se genera solo cuando el usuario la solicita y confirma los datos; un pago no equivale a una factura.
- Separar pedido/pago de solicitud fiscal y comprobante: `PAID` no significa `INVOICED`.
- Si el Worker falla o el resultado es incierto, dejar la operación pendiente de conciliación; no emitir otra vez a ciegas. Mantener el registro manual como alternativa administrativa.
- La selección de cuenta/CUIT debe quedar visible y ser inequívoca cuando el usuario tenga varias.

### Desarrollo y homologación
- Separar en una sección de **Desarrollo y pruebas** el ambiente TEST, certificados de homologación, puntos de venta de TEST, consultas técnicas y emisiones de prueba.
- No mezclar herramientas operativas del Worker con la pantalla de facturación habitual.
- TEST y PROD tienen certificados, autorizaciones y puntos de venta distintos. Cambiar de área nunca debe cambiar el emisor de una factura ya preparada ni reintentar una emisión automáticamente.

## Consulta pública de Padrón

Esta rama añade la ruta server-side `POST /api/public/padron/consulta` para que Tienda llame a `POST https://arca.zap.com.ar/internal/public/padron/consultas`. La ruta:
- valida CUIT y Turnstile del lado del servidor;
- usa la variable privada `PUBLIC_PADRON_BACKEND_SECRET` solo en el backend;
- fija el endpoint del Worker, envía `X-Public-Padron-Secret` e `Idempotency-Key`;
- limita el consumo a cuatro solicitudes diarias por IP seudonimizada en la base de datos;
- devuelve una proyección acotada y etiqueta la respuesta como homologación `TEST`;
- falla cerrada si la compuerta o las variables necesarias no están habilitadas.

### Configuración pendiente antes de probar
- Configurar `TURNSTILE_SECRET_KEY` en Vercel Production y Preview y la clave pública correspondiente en la futura interfaz.
- Aplicar la migración `20261022140000_public_padron_usage` mediante el flujo de migraciones del proyecto.
- Confirmar que el secreto de Vercel coincide con el secreto guardado en Cloudflare; no comparar ni registrar su valor.
- Activar `publicPadronLookup` solo después de pruebas de seguridad, cuota, idempotencia y respuesta real.
- No desplegar a producción ni activar la consulta pública solo por haber agregado el endpoint.

## Próximos cambios de interfaz
1. Reestructurar `/perfil` como portal cliente con navegación clara, manteniendo compras, agencia y fiscal como áreas diferenciadas.
2. Dividir `FiscalWorkspaceClient` en Facturación, Configuración fiscal y Desarrollo/pruebas.
3. Retirar el selector de ambiente de Facturación; TEST se opera solo desde Desarrollo/pruebas.
4. Añadir contexto persistente de emisor y una revisión explícita del comprobante antes de confirmar.
5. Alinear el historial con estados de solicitud, emisión, conciliación y descarga; no presentar una factura como emitida solo porque el pedido esté pagado.
6. Validar con typecheck, tests, build y pruebas de autorización. Mantener emisión PROD bloqueada hasta completar las autorizaciones reales.
