# Trabajos y archivos de clientes

El módulo guarda metadatos en PostgreSQL y objetos en el bucket R2 existente configurado en `R2_BUCKET_NAME`. No requiere un segundo bucket ni nuevas credenciales.

## Antes de habilitarlo

1. Reutilizar las credenciales y el bucket R2 ya configurados para `media.zap.com.ar`.
2. Configurar CORS del bucket para permitir `PUT` desde `https://tienda.zap.com.ar` (y `http://localhost:3000` solo para desarrollo), con el header `Content-Type`.
3. Configurar una regla de ciclo de vida para eliminar objetos bajo el prefijo `client-file-uploads/` después de 1 día. Es el área temporal de subidas incompletas; los archivos definitivos usan `client-files/`.
4. Aplicar una sola vez `prisma/manual-sql/client-work-files.sql` a la base de datos de Tienda ZAP.
5. Regenerar Prisma (`npx prisma generate`) y desplegar el código.
6. Mantener `CLIENT_WORK_FILES_ENABLED=false` hasta confirmar que el SQL está aplicado y probar con dos cuentas cliente distintas que no puedan enumerar ni abrir archivos ajenos. Verificar también que el dominio público de medios no entregue los objetos bajo `client-files/` ni `client-file-uploads/`. La ausencia de un listado público no bloquea el acceso a una URL de objeto conocida; esos prefijos deben quedar bloqueados en la capa pública de medios (por ejemplo, mediante el Worker que atiende ese dominio) antes de habilitar el módulo.
7. Probar subida, vista previa, descarga, reemplazo, borrado y reintento de limpieza. Solo después establecer `CLIENT_WORK_FILES_ENABLED=true` en Vercel Production y desplegar.

El repositorio no tenía historial de migraciones Prisma versionado ni un despliegue automático de esquema. Por eso el SQL se entrega como intervención explícita, no como una migración que pueda dar una falsa impresión de estar aplicada automáticamente.

## Comportamiento

- Archivos de hasta 150 MB; originales preservados.
- Prefijos separados: `client-file-uploads/` para cargas temporales y `client-files/` para archivos definitivos.
- Previsualización solo para PDF, imágenes rasterizadas, audio y video reconocidos. El resto se descarga.
- Reemplazar sube y verifica el nuevo objeto antes de cambiar el registro. Si no puede borrar el anterior, queda registrado para reintentar desde administración.
- Borrar mantiene el registro si R2 falla.
- Las acciones de crear trabajo, cargar, reemplazar, abrir vista previa, descargar, borrar y reintentar limpieza se registran en `AdminAuditLog` sin almacenar claves internas ni contenido de archivos.
- Las URLs de acceso se firman por cinco minutos. Las URLs firmadas no sustituyen el bloqueo de los prefijos privados en el dominio público de medios.
