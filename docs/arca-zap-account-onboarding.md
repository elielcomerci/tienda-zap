# ARCA ZAP — cuenta fiscal y puesta en marcha

## Propósito

La plataforma Tienda ZAP será la primera interfaz de alta, administración y soporte del servicio fiscal de ZAP. El Fiscal Worker seguirá siendo un servicio independiente y agnóstico: no conoce la tienda ni depende de ella para autenticar, aplicar derechos de consumo, resolver TA o emitir.

La misma cuenta fiscal podrá ser consumida desde Tienda ZAP, Clikit, Revex, plugins WooCommerce/WordPress y futuras integraciones. Las claves autentican el acceso a la cuenta; el plan y el saldo pertenecen a la cuenta y se comparten entre sus consumidores.

## Áreas de producto

### 1. Cuenta fiscal

- Estado de cuenta y estado de puesta en marcha.
- CUIT/s representadas y entorno disponible (homologación / producción).
- Plan vigente, fecha de vigencia, unidades del período, paquetes adquiridos, saldo y consumo.
- Historial de emisiones, errores recuperables y acciones que requieren intervención.
- API Keys: crear, mostrar el secreto una sola vez, rotar, revocar y consultar último uso. Rotar claves no modifica cuotas.
- Integraciones conectadas como información operativa, no como cuentas de consumo separadas.
- Historial de actividad y trazabilidad de cambios relevantes.

### 2. Asistente guiado de autorización ARCA

El flujo debe ser un asistente paso a paso, con progreso persistente, lenguaje claro y un indicador verificable por paso. No debe afirmar que algo quedó autorizado solo porque el usuario leyó una instrucción.

Estados sugeridos:

1. **Identificar la CUIT y el titular del certificado.** Explicar quién emite, quién representa al contribuyente y qué identidad puede actuar por él.
2. **Elegir el entorno y el servicio.** Distinguir homologación de producción y explicar que la autorización es específica para el servicio ARCA requerido.
3. **Preparar la relación de autorización en ARCA.** Instrucciones vigentes para delegar/autorizar el servicio a la identidad correspondiente; enlaces oficiales actualizables, sin fijar pasos de interfaz que puedan quedar obsoletos.
4. **Obtener o generar certificado y clave privada.** Explicar las opciones y la responsabilidad del titular. Nunca pedir que se pegue una clave privada en un chat o formulario de soporte.
5. **Registrar y validar el certificado.** La plataforma valida formato, correspondencia de clave/certificado, vigencia y cadena/identidad según corresponda.
6. **Firmar la solicitud de acceso y obtener el TA.** El Worker realiza WSAA server-side, para el servicio, ambiente e identidad correctos.
7. **Probar conexión.** Una consulta inocua y controlada valida la configuración; la prueba no debe emitir una factura real.
8. **Habilitar producción.** Solo tras comprobar permisos, credenciales, CUIT representada, entorno y aceptación explícita del usuario.

Cada paso debe mostrar: qué se necesita, por qué, instrucciones, enlace oficial, resultado esperado, estado comprobado, error habitual y opción para pedir asistencia. Homologación y producción deben tener indicadores visuales inequívocos.

### 3. Opción “Que ZAP lo gestione”

Ofrecer un camino asistido para clientes que no quieran completar el procedimiento solos:

- Solicitud de asistencia con CUIT, contacto, entorno y paso en el que necesita ayuda; recopilar únicamente lo necesario.
- Explicar alcance, precio si corresponde, plazo estimado y responsabilidades antes de contratar.
- Consentimiento explícito para la gestión y registro auditable de quién lo autorizó y cuándo.
- Verificación de identidad y autoridad del solicitante antes de actuar.
- Instrucciones seguras para que el cliente realice en su propia cuenta ARCA las acciones que legalmente requieran su intervención.
- No solicitar contraseñas de ARCA, códigos de segundo factor ni claves privadas sin protección. Preferir que el cliente genere/controle la clave privada; si el proceso exige transferencia de material criptográfico, diseñar un canal cifrado, temporal, de acceso restringido y con política de borrado antes de ofrecerlo.
- Estado del trámite, mensajes de seguimiento y evidencia de los pasos completados, sin guardar contraseñas ni exponer certificados/secretos en logs.
- Revocación de autorización y procedimiento de salida claros.

No prometer que ZAP puede delegar o completar cualquier acción en nombre del cliente: la posibilidad depende de la autorización concedida en ARCA y de los requisitos vigentes del servicio.

### 4. Planes, cobros y saldo

La interfaz muestra derechos efectivos que el Worker calcula por cuenta:

- Asignación mensual renovable, condicionada al estado de la renovación/pago.
- Acceso ilimitado por término (6 meses, 1 año, 5 años).
- Ilimitado permanente, sujeto a las condiciones comerciales publicadas.
- Paquetes de unidades sin vencimiento (por ejemplo, 1.000, 5.000 o 50.000).
- Eventual plan gratuito con cupo de introducción.

Los webhooks de pago acreditan un beneficio de forma idempotente. La plataforma no lleva un contador fiscal paralelo: muestra los datos devueltos por el servicio central y conserva referencias de pago/compra. Las reglas de prioridad entre cupo mensual y paquetes deben ser explícitas.

## Límites de responsabilidad entre componentes

### Plataforma ZAP

Gestiona usuarios de la plataforma, alta de cuentas, contratación, pagos, interfaz, tutorial, solicitudes de asistencia, administración de claves y visualización del estado. Las credenciales fiscales y los secretos se procesan únicamente server-side.

### Fiscal Worker

Es la autoridad de autenticación API, autorización tenant/CUIT/entorno/servicio, derechos y reservas de consumo, idempotencia de emisión, persistencia y resolución de TA, llamadas ARCA, auditoría técnica y recuperación.

### Adaptadores

Tienda, Clikit, Revex, WooCommerce y otros clientes convierten sus datos de negocio al contrato común. No almacenan la clave global de ZAP en navegador, no gestionan TA y no mantienen cuotas independientes.

## Criterios de seguridad y cumplimiento

- Nunca exponer claves API, claves privadas, secretos WSAA o TA en el navegador, URL, analítica o logs.
- No enviar claves privadas ni certificados sensibles a servicios de terceros sin consentimiento, justificación y diseño de protección.
- Enmascarar identificadores fiscales cuando no sea necesario mostrarlos completos.
- Diferenciar homologación y producción en cada paso que pueda cambiar el estado.
- Registrar acciones administrativas, rotación/revocación de claves, cambios de autorización y acceso asistido.
- El acceso a soporte no debe dar por sí mismo permiso fiscal; debe existir autorización ARCA válida.
- El tutorial se mantiene con enlaces oficiales y una fecha de última verificación, para evitar instrucciones obsoletas.

## Secuencia sugerida de entrega

1. Auditar el esquema y las rutas actuales de la plataforma para reutilizar autenticación, cuenta y pagos existentes.
2. Implementar el modelo de cuenta fiscal y la vista de estado, sin emisión automática.
3. Integrar API Keys y lectura de plan/saldo desde el Worker.
4. Construir el asistente ARCA primero en modo guiado, con validaciones por paso y sin acceso de soporte a secretos.
5. Implementar el camino “Que ZAP lo gestione” con consentimiento, seguimiento y controles de acceso.
6. Añadir la activación de producción después de pruebas de homologación.
7. Conectar los demás adaptadores usando el mismo contrato central.

## Fuera de alcance de esta especificación

Este documento no implica que ya exista el panel, el tutorial, el flujo de delegación ni la nueva API comercial. Es la especificación inicial para implementarlos. No se deben ejecutar emisiones reales, migrar producción ni desplegar servicios sin autorización explícita.
