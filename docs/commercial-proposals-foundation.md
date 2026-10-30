# Propuestas comerciales — base inicial

Rama: `feat/propuestas-comerciales`

## Incluido en este primer esqueleto
- Modelos Prisma para propuesta, materiales e invitaciones.
- Navegación de administración y listado/alta de propuestas.
- Contenido editorial por secciones e importe opcional.
- Asociación opcional con usuario y cuenta CRM.
- Generación de invitación con token aleatorio, hash SHA-256 almacenado, vencimiento a 14 días y revocación del enlace anterior.
- Entrada privada que valida token y sesión, y verifica que el usuario sea el destinatario antes de redirigir al portal.
- Registro inicial de decisión/comentario del cliente.

## Pendiente antes de producción
1. Revisar y aplicar SQL de esquema en entorno de desarrollo/staging; no ejecutar cambios sobre Neon Production desde esta rama.
2. Adjuntos privados reales: presigned uploads R2, validación MIME/extensión/tamaño, escaneo/controles, descarga firmada y bloqueo del acceso público. No habilitar `CLIENT_WORK_FILES_ENABLED` hasta completar las pruebas ya documentadas para archivos privados.
3. Materiales de YouTube: validación de dominios permitidos, extracción segura del ID y render de reproductor con controles de privacidad.
4. Versionado inmutable: al compartir, congelar snapshot; las ediciones posteriores crean versión nueva y revocan/invalidan invitaciones previas según política.
5. Completar onboarding y registro desde invitación, sin mostrar contenido antes de autenticar.
6. Respuesta con adjuntos del cliente y timeline/audit log.
7. Pruebas de aislamiento entre clientes, expiración/revocación, sesión existente, email coincidente, aceptación duplicada y reintentos.
8. Typecheck/build y revisión de rutas reales del proyecto.

## Seguridad
- El token no se persiste en claro, sólo su hash.
- El token no da acceso al contenido por sí solo: se requiere sesión y coincidencia con usuario o email invitado.
- No se devuelven campos de propuesta desde el endpoint de invitación.
- La aceptación aún no crea automáticamente un trabajo ni una orden.
- El importe es nullable y no se interpreta como cero.
