# Checklist de regresion para release

Usar antes de subir cambios a `main` o antes de publicar una version productiva. La idea es validar los flujos que generan dinero o afectan campañas.

## Base tecnica

- `npm run build` termina correctamente.
- Prisma Client esta generado si hubo cambios de schema.
- No hay migraciones pendientes sin aplicar.
- `git status` no mezcla scripts temporales, seeds de prueba o archivos `scratch/` con el release.

## Compra y checkout

- Producto simple: agregar al carrito, cambiar cantidad y llegar a checkout.
- Producto configurable: seleccionar variantes obligatorias y verificar precio final.
- Combo fijo: seleccionar variantes de cada producto incluido y confirmar que el carrito conserva la seleccion.
- Combo dinamico: seleccionar variantes de cada producto incluido y confirmar que el checkout usa el precio correcto.
- Checkout sin cupon: crear orden correctamente.
- Checkout con cupon valido: aplica descuento, muestra referente si corresponde y registra la reserva/redencion.
- Checkout con cupon invalido, usado, vencido o sin usos: muestra error claro y no descuenta.

## Cupones y campanas

- Crear promocion en borrador.
- Activar/pausar promocion.
- Generar lote de cupones con prefijo, lote y vencimiento.
- Generar lote con destinatarios pegados desde CSV.
- Buscar cupon por codigo, persona, negocio, email, telefono y lote.
- Filtrar cupones por estado.
- Filtrar cupones por lote.
- Filtrar cupones por vencimiento.
- Paginar cupones y editar uno que no este reservado/usado.
- Abrir link publico del cupon y verificar que muestre "Cupon preparado para" cuando tenga destinatario.
- Descargar PDF de un cupon y PDF de lote.
- Exportar CSV y verificar columnas criticas: codigo, estado, destinatario, negocio, lote, referente, QR.

## Admin comercial

- Crear/editar producto sin romper opciones existentes.
- Crear/editar producto configurable con variantes.
- Crear/editar combo y verificar seleccion de variantes en publico.
- Guardar configuracion SEO/ADS y verificar que el sitio sigue renderizando.

## Observaciones de salida

- Registrar fecha del release.
- Registrar commit incluido.
- Registrar riesgos conocidos.
- Registrar pruebas que no se pudieron ejecutar y por que.
