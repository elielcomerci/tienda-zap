# Trabajos y archivos de clientes

El módulo usa dos recursos separados: metadatos en PostgreSQL y objetos en un bucket Cloudflare R2 privado. No debe apuntar al bucket usado por `media.zap.com.ar`.

## Antes de habilitarlo

1. Crear un bucket R2 dedicado sin dominio público asociado.
2. Configurar CORS en el bucket privado para permitir `PUT` desde `https://tienda.zap.com.ar` (y `http://localhost:3000` solo para desarrollo), con el header `Content-Type`. No asociarle un dominio público.
3. Crear una regla de ciclo de vida para eliminar objetos bajo el prefijo `client-file-uploads/` después de 1 día. Es el área temporal de subidas incompletas; los archivos definitivos usan `client-files/`.
4. Configurar `R2_PRIVATE_BUCKET_NAME` en los entornos que vayan a usar el módulo. Reutiliza las credenciales R2 existentes.
5. Aplicar una sola vez `prisma/manual-sql/client-work-files.sql` a la base de datos de Tienda ZAP.
6. Regenerar Prisma (`npx prisma generate`) y desplegar el código.
7. Mantener `CLIENT_WORK_FILES_ENABLED=false` durante la preparación. Verificar con dos cuentas cliente distintas que no puedan enumerar ni abrir archivos ajenos. Comprobar también que `media.zap.com.ar/client-files/...` no sirve los objetos privados.
8. Probar subida, vista previa, descarga, reemplazo, borrado y reintento de limpieza. Solo después establecer `CLIENT_WORK_FILES_ENABLED=true` y desplegar. No habilitar el módulo a clientes hasta superar estas pruebas.

El repositorio no tenía historial de migraciones Prisma versionado ni un despliegue automático de esquema. Por eso el SQL se entrega como intervención explícita, no como una migración que pueda dar una falsa impresión de estar aplicada automáticamente.

## Comportamiento

- Archivos de hasta 150 MB; originales preservados.
- Previsualización solo para PDF, imágenes rasterizadas, audio y video reconocidos. El resto se descarga.
- Reemplazar sube y verifica el nuevo objeto antes de cambiar el registro. Si no puede borrar el anterior, queda registrado para reintentar desde administración.
- Borrar mantiene el registro si R2 falla.
- Las acciones de crear trabajo, cargar, reemplazar, abrir vista previa, descargar, borrar y reintentar limpieza se registran en `AdminAuditLog` sin almacenar claves internas ni contenido de archivos.
- Las URLs de acceso se firman por cinco minutos. Los objetos de este módulo no usan URLs públicas.
