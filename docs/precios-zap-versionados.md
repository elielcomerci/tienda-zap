# Precios ZAP — implementación por etapas

**Fecha:** 2026-10-13  
**Rama:** `feat/precios-zap-versionados`  
**Estado:** plan de implementación; no cambia precios, seed, checkout ni producción.

## Decisión técnica

La primera versión debe reutilizar `ConfiguratorVersion`, que ya guarda `schema`, `compatibility` y `pricing` como JSON y contempla los estados `DRAFT`, `ACTIVE` y `ARCHIVED`. El cotizador público ya toma la versión `ACTIVE` y su huella de precio incluye la versión y sus datos. Antes de sumar tablas nuevas o una infraestructura paralela, conviene validar y aprovechar ese mecanismo existente.

El seed queda como importación inicial y referencia de estructura, no como herramienta cotidiana para actualizar precios.

## Objetivo de la primera entrega

Crear un apartado privado **Precios ZAP** dentro del admin para trabajar con cinco familias iniciales:

1. Tarjetas & Vouchers
2. Flyers & Desplegables
3. Tags & Etiquetas
4. Adhesivos & Stickers
5. Carpetas & Folders

La primera entrega no debe recalcular ni publicar precios automáticamente al importar costos. Debe permitir preparar, revisar y publicar una versión controlada de la matriz existente.

## Flujo de trabajo

1. **Lista:** mostrar producto, versión activa, estado de la fuente de costos y si hay un borrador pendiente.
2. **Editar borrador:** copiar la versión activa a una nueva versión `DRAFT`; editar únicamente los datos de precio que el motor de ese producto ya consume. Nunca modificar en el lugar la versión activa.
3. **Revisar:** comparar la versión activa con el borrador, mostrar las celdas que cambian y validar estructura, valores numéricos finitos/no negativos, cobertura de las combinaciones anunciadas y fecha/fuente de costos.
4. **Publicar:** en una única transacción, archivar la versión activa y activar el borrador. La versión anterior queda disponible para revertir.
5. **Revertir:** volver a activar una versión anterior mediante otra transacción; no borrar historial.
6. **Auditar:** guardar usuario, fecha, motivo y versiones involucradas en cada publicación/reversión. Si el modelo de auditoría existente no sirve para este evento, añadir el registro mínimo necesario sin acoplarlo a órdenes.

## Reglas de seguridad y consistencia

- El área y todas sus acciones requieren sesión con rol `ADMIN`.
- No editar la versión `ACTIVE` directamente.
- No permitir dos versiones activas para el mismo producto.
- El cambio de estado debe ser transaccional; si falla, debe permanecer activa la versión anterior.
- La publicación no debe alterar órdenes, presupuestos ya emitidos, variantes de catálogo ni snapshots históricos.
- No aplicar IVA, recargos ni márgenes por inferencia. La semántica de costos, IVA y margen se debe resolver explícitamente por motor antes de habilitar el botón de publicación.
- Las combinaciones sin costo validado deben quedar bloqueadas o marcadas como consulta; nunca completar celdas con estimaciones silenciosas.
- El seed no debe sobrescribir una matriz administrada/publicada durante una ejecución normal. Antes de cambiar el comportamiento del seed, revisar su idempotencia y definir cómo importar futuras actualizaciones de fuente.

## Experiencia de edición

No arrancar con un editor JSON genérico. La UI debe presentar una tabla entendible por producto y respetar las dimensiones reales de cada matriz (cantidad, formato, papel, impresión, terminación y procesos aplicables). Si una matriz tiene estructura que todavía no puede representarse correctamente, dejar esa familia en modo lectura y no habilitar publicación hasta resolverla.

Acciones masivas de la primera versión:
- reemplazar costos de una fuente/lote, conservando trazabilidad;
- ajustar una regla comercial de una familia o selección;
- revisar antes/después y descargar/ver la matriz que se publicaría.

No usar una regla global para todos los productos. El recargo porcentual y el margen bruto son conceptos distintos; cada motor debe declarar cuál aplica y cómo se calculan impuestos y cargos.

## Secuencia para reducir riesgo

### Fase 0 — verificación (antes de habilitar escritura)
- Confirmar qué productos tienen versión activa y la forma exacta de `pricing`.
- Confirmar que todas las rutas públicas seleccionan una sola versión activa y que los snapshots guardan la configuración/precio cotizados.
- Revisar caché, concurrencia y restricciones actuales del modelo.
- Verificar controles de acceso del admin y el mecanismo de auditoría.

### Fase 1 — MVP interno
- Listado y detalle de las cinco familias.
- Borrador versionado, comparación y validación.
- Publicar/revertir atómicamente.
- Registro de auditoría.
- Tests para permisos, validaciones, publicación concurrente y rollback.
- Sin tocar precios de venta reales ni desplegar automáticamente.

### Fase 2 — calidad de las matrices
- Resolver las brechas identificadas en la auditoría: perforación por tramos para Tags, vigencia de la fuente offset de Flyers, combinaciones de tarjetas no cubiertas, claves/cantidades de Flyers, cobertura de Stickers y motor activo de Carpetas.
- Definir y probar costo completo, recargo/margen, IVA y precio mostrado antes de habilitar publicación de cada familia.

### Fase 3 — ampliación
- Incorporar gran formato y servicios solo cuando tengan una fuente de costos y un modelo de cálculo validables.
- No convertir servicios de diseño/consultoría a una matriz de imprenta; necesitan un modelo de horas, alcance y capacidad.

## Criterios de aceptación

- Un administrador puede crear y modificar un borrador sin alterar el precio público.
- Puede ver exactamente qué celdas y precios cambiarían antes de publicar.
- Una validación fallida impide publicar y explica qué falta.
- Publicar activa una versión completa, nunca una mezcla parcial de matrices.
- La versión anterior puede reactivarse sin reconstruirla a mano.
- Las cotizaciones/órdenes ya guardadas conservan sus valores históricos.
- Las familias no validadas siguen bloqueadas para publicación; no se fabrican costos ni precios para cerrar huecos.

## Fuera de alcance de esta entrega

- Cambiar importes de venta actuales.
- Ejecutar seed, migraciones o cambios de base de datos en producción.
- Cambiar checkout, promociones, financiación o Crédito ZAP.
- Publicar automáticamente después de importar costos.
- Habilitar familias sin matriz completa y trazable.
