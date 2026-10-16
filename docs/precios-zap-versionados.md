# Precios ZAP — implementación por etapas

**Fecha:** 2026-10-13  
**Rama:** `feat/precios-zap-versionados`  
**Estado:** módulo interno en `main`, con edición de borradores e importación CSV por plantilla. No cambia precios públicos automáticamente ni altera pedidos/cotizaciones históricos.

## Estado de implementación

Ya está creado el panel privado para listar las familias compatibles, abrir un borrador, editar importes reconocidos como costos, comparar cambios y auditar cada escritura. Las acciones exigen rol `ADMIN`. La edición excluye metadatos numéricos como límites de cantidad, dimensiones y porcentajes.

**La publicación y restauración están bloqueadas por defecto** mediante `PRICING_ZAP_PUBLISH_ENABLED` y `PRICING_ZAP_COMMERCIAL_AUDIT_APPROVED` (ambas deben ser exactamente `true`). Solo deben configurarse después de validar cobertura de combinaciones, vigencia de cada fuente, costos completos, IVA y margen para las familias habilitadas. El checkbox de confirmación no reemplaza esa barrera del servidor.

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
- Ambas variables (`PRICING_ZAP_PUBLISH_ENABLED` y `PRICING_ZAP_COMMERCIAL_AUDIT_APPROVED`) deben permanecer sin definir o distintas de `true` hasta que la auditoría comercial esté aprobada; la barrera se verifica también dentro de las acciones del servidor.
- Las combinaciones sin costo validado deben quedar bloqueadas o marcadas como consulta; nunca completar celdas con estimaciones silenciosas.
- El seed no debe sobrescribir una matriz administrada/publicada durante una ejecución normal. Antes de cambiar el comportamiento del seed, revisar su idempotencia y definir cómo importar futuras actualizaciones de fuente.

## Importación CSV y persistencia incremental

El editor permite descargar una plantilla CSV de la matriz del borrador. Para importar, se completa la columna `new_cost` únicamente en las referencias que cambian; las filas vacías se ignoran. El importador admite coma o punto y coma como separador, valida referencias contra la matriz del borrador, rechaza duplicados, rutas desconocidas, valores negativos/no numéricos y archivos mayores de 1 MB. El límite de una importación es de 5.000 filas con importe.

Antes de guardar se muestra una comparación de valores anteriores y nuevos. El servidor vuelve a validar cada ruta y valor, exige rol `ADMIN`, comprueba que la versión siga en estado `DRAFT` y usa control optimista de concurrencia. Toda la tanda se guarda en una sola transacción. Solo se persisten los importes que efectivamente cambian; los iguales se contabilizan como sin cambios. Si no hay diferencias, no se reescribe la matriz.

La matriz se persiste en `ConfiguratorVersion.pricing`; cada importación con cambios genera una entrada de auditoría con archivo de origen, fecha, cantidades y detalle antes/después. La edición incremental no recalcula ni publica precios finales: solo actualiza los costos de proveedor en el borrador. El motor de cotización calcula el resultado cuando corresponde, usando la versión activa. La publicación sigue siendo un paso explícito y bloqueado por las dos variables de seguridad hasta completar la auditoría comercial.

**Formato de plantilla:** columnas `path`, `label`, `current_cost`, `new_cost`. No modificar `path`; se usa como identificador exacto. Esta primera importación trabaja con la plantilla generada por Precios ZAP, no con cualquier CSV arbitrario del proveedor. Para importar archivos originales con columnas distintas hace falta definir y guardar un mapeo por proveedor/familia, evitando emparejar referencias solo por texto parecido.

## Experiencia de edición

No arrancar con un editor JSON genérico. La UI debe presentar una tabla entendible por producto y respetar las dimensiones reales de cada matriz (cantidad, formato, papel, impresión, terminación y procesos aplicables). Si una matriz tiene estructura que todavía no puede representarse correctamente, dejar esa familia en modo lectura y no habilitar publicación hasta resolverla.

Acciones masivas de la primera versión:
- reemplazar costos de una fuente/lote, conservando trazabilidad;
- ajustar una regla comercial de una familia o selección;
- revisar antes/después y descargar/ver la matriz que se publicaría.

No usar una regla global para todos los productos. El recargo porcentual y el margen bruto son conceptos distintos; cada motor debe declarar cuál aplica y cómo se calculan impuestos y cargos.

## Política comercial versionada y simulación de rentabilidad

La política comercial se guarda dentro de `ConfiguratorVersion.pricing.commercialPricingPolicy`, en la misma versión que contiene la matriz de costos. El borrador permite elegir:

- **Margen sobre venta neta:** precio neto objetivo = costo / (1 − margen objetivo).
- **Recargo sobre costo:** precio neto objetivo = costo × (1 + recargo).
- **IVA estimado:** se muestra separado del resultado bruto y se agrega al precio final simulado.

El editor convierte el porcentaje al cambiar de modo para conservar, en lo posible, el mismo precio objetivo. La vista previa muestra costo, venta neta estimada, IVA, precio final, resultado bruto y margen real después del redondeo comercial. También admite ingresar un precio neto manual por referencia para simular ganancias o pérdidas exactas; ese precio manual es temporal y no se guarda ni altera el cotizador. El resultado bruto todavía no descuenta comisiones, logística, retenciones, Ingresos Brutos ni gastos operativos.

La política guardada en una versión activa tiene prioridad en el motor `PROVIDER_FINISHED_COST`. Las versiones antiguas que no tengan esa política conservan el recargo histórico de `ProductQuoterConfig.profitMargin`. La tasa de IVA inicial es 0% intencionalmente: no se debe inferir el tratamiento fiscal de una familia sin validarlo. Configurar una tasa en el borrador y publicarlo modifica el precio final del cotizador; por eso la publicación continúa bloqueada por las dos habilitaciones explícitas.

La importación CSV sigue actualizando exclusivamente los costos de proveedor. La regla de margen/recargo e IVA se guarda por separado en el mismo borrador, con control optimista de concurrencia y auditoría. Guardar la política no cambia la versión activa.

## Secuencia para reducir riesgo

### Fase 0 — verificación (antes de integrar y usar precios reales)
- Confirmar qué productos tienen versión activa y la forma exacta de `pricing`.
- Confirmar que todas las rutas públicas seleccionan una sola versión activa y que los snapshots guardan la configuración/precio cotizados.
- Revisar caché, concurrencia y restricciones actuales del modelo.
- Verificar controles de acceso del admin y el mecanismo de auditoría.

### Fase 1 — MVP interno (implementado en esta rama; validación pendiente)
- Listado y detalle de las cinco familias.
- Borrador versionado, comparación y validación.
- Publicar/revertir atómicamente.
- Registro de auditoría.
- Pruebas unitarias para filtrar rutas editables de costos y excluir metadatos; los flujos completos de permisos/publicación concurrente/rollback requieren pruebas de integración antes de habilitar la publicación.
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
