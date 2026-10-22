# Facturación por lotes mediante plantilla Excel

**Estado:** propuesta documentada; pendiente de diseño técnico, contrato confirmado y desarrollo.  
**Separación funcional:** esta es únicamente la plantilla de carga de datos. El diseño visual del PDF/comprobante se documenta por separado en [diseño visual de comprobantes](diseno-visual-comprobantes.md) y tiene su propio checklist.
**Proyecto:** `tienda-zap` como interfaz de administración e importación; ZAP Fiscal Worker como autoridad de validación y emisión.  
**Regla de alcance:** esta documentación no autoriza cambios ni despliegues en `zap-fiscal-core`. Cualquier necesidad nueva del Worker debe documentarse por separado y aprobarse antes de implementarla.

## 1. Objetivo

Permitir que una persona sin conocimientos técnicos prepare, revise e importe un lote de comprobantes con una plantilla Excel sencilla. Debe servir para distintos usos —facturación mensual recurrente, operaciones puntuales, negocios y estudios contables— sin asumir un único rubro o circuito contable.

Excel es una interfaz de carga, no un emisor fiscal ni una fuente de verdad. La validación final, numeración, autorización y constancia fiscal deben provenir del servicio fiscal y de ARCA.

## 2. Principios de producto

- **Fácil de empezar:** instrucciones breves, una hoja de carga clara y ejemplos no fiscales ficticios.
- **Flexible sin abrumar:** campos comunes visibles; campos condicionales solo cuando el tipo de comprobante/concepto lo requiera.
- **No adivinar reglas fiscales:** los tipos de comprobante, alícuotas, conceptos, monedas, fechas, datos de receptor y requisitos se contrastan con el contrato activo del Worker y la normativa aplicable.
- **Prevalidar antes de emitir:** mostrar errores por fila y permitir corregirlos sin rehacer el lote.
- **Consentimiento explícito:** importar o validar nunca debe emitir automáticamente. La emisión requiere resumen y confirmación.
- **Resultados por comprobante:** registrar éxito, rechazo, pendiente o estado incierto por fila; no representar el lote solo como éxito/fallo global.
- **Reintentos seguros:** nunca repetir ciegamente una emisión si el resultado anterior es incierto.
- **Separación de ambientes:** homologación y producción son independientes, incluidos sus puntos de venta y credenciales. Nunca asumir que el punto de venta de un ambiente sirve en el otro.
- **Seguridad y privacidad:** no exponer secretos del Worker en el navegador ni incluir credenciales en el Excel, logs o reportes.
- **Compatibilidad:** preservar las rutas de carga manual de facturas existentes y los archivos de clientes; esta función es adicional, no un reemplazo.

## 3. Experiencia propuesta

1. El usuario administrador elige el contribuyente/CUIT y el ambiente autorizado.
2. Descarga la plantilla con versión identificable e instrucciones.
3. Completa una fila por comprobante y, si corresponde, filas adicionales para ítems según el formato que se defina.
4. Sube el archivo; el sistema comprueba extensión, tamaño, estructura, versión, tipos y datos.
5. Se muestra una vista previa: filas válidas, filas con errores, importes calculados, cantidad de comprobantes y advertencias.
6. El usuario descarga errores o corrige el archivo y vuelve a subirlo. La validación no emite.
7. El usuario confirma la emisión de las filas válidas después de ver un resumen inequívoco.
8. El backend procesa cada comprobante de forma controlada y persiste el resultado antes de permitir reintentos.
9. Se presenta un reporte descargable con referencia de origen, estado, número de comprobante y datos de autorización disponibles, o error accionable.
10. Las filas ya emitidas quedan bloqueadas frente a reenvíos duplicados; las inciertas se reconcilian antes de intentar otra emisión.

## 4. Formato del archivo: decisión pendiente de prototipo

El archivo debería contener, como mínimo:

- **Instrucciones:** cómo completar, qué no modificar, límites, privacidad y flujo de emisión.
- **Carga:** una fila por comprobante o una estructura normalizada de comprobantes e ítems. La elección entre ambos modelos debe probarse con usuarios antes de cerrar el formato.
- **Listas de referencia:** solo valores confirmados por el contrato fiscal y habilitaciones del contribuyente; no listas estáticas que prometan opciones no soportadas.
- **Resultados/errores:** preferentemente generados por el sistema en un archivo de salida, para no mezclar datos de entrada y resultados autoritativos.

Campos candidatos, sujetos a validación del contrato: referencia externa única por fila; fecha; tipo de comprobante; concepto; CUIT/documento del receptor; razón social como dato informativo; descripción; importes; moneda y datos impositivos que correspondan. No definir aún nombres finales, obligatoriedad ni fórmulas hasta revisar los esquemas reales de emisión y casos fiscales soportados.

### Reglas de Excel

- Una fila representa una unidad de emisión inequívoca.
- La referencia externa identifica la fila dentro del lote y no debe cambiar entre reintentos.
- Las celdas vacías, fechas, decimales y separadores regionales deben interpretarse de manera explícita.
- No confiar en fórmulas ni valores calculados por Excel como validación fiscal autoritativa.
- Proteger el archivo contra fórmulas ejecutables/inyección al generar reportes CSV/XLSX.
- No requerir macros ni complementos.
- Rechazar columnas obligatorias ausentes, encabezados duplicados, filas ambiguas y formatos no soportados con mensajes claros.

## 5. Contrato técnico e integración

Antes de programar, auditar en la rama activa de `zap-fiscal-core` los handlers reales y los esquemas de emisión vigentes. La documentación antigua no reemplaza el código ni las pruebas del contrato.

Confirmar por escrito:
- endpoint autorizado para emitir cada comprobante;
- autenticación y permisos por tenant/CUIT;
- campos y tipos exactos de request/response;
- límites de tamaño, frecuencia y concurrencia;
- comportamiento de errores y timeouts;
- forma de consultar/reconciliar una emisión cuyo resultado se desconoce;
- idempotencia disponible y claves aceptadas;
- campos fiscales que devuelve ARCA y cuáles deben guardarse;
- diferencias entre homologación y producción.

La UI de `tienda-zap` debe comunicarse con el Worker exclusivamente desde el servidor. No introducir secretos `INTERNAL_SECRET` ni secretos de provisioning en variables `NEXT_PUBLIC_*`, código cliente o archivos descargables.

**No asumir que existe un endpoint de emisión por lote.** Si el Worker solo admite emisiones individuales, la primera versión debe orquestar llamadas individuales desde backend con límites controlados, persistencia de estados y reconciliación; nunca crear una ruta ficticia ni cambiar el Worker dentro de este alcance.

## 6. Modelo de estados y recuperación

Estados conceptuales del lote: `uploaded`, `validating`, `ready`, `processing`, `completed`, `completed_with_errors`, `needs_reconciliation`, `failed`.

Estados conceptuales por fila: `invalid`, `ready`, `processing`, `authorized`, `rejected`, `unknown`, `not_attempted`.

Estos son nombres de diseño, no nombres de API ni enums existentes. Deben ajustarse al modelo de datos y contrato actuales antes de implementarse.

- Guardar el archivo/lote o una representación normalizada con permisos y retención definidos.
- Registrar identidad del tenant, CUIT, ambiente, versión de plantilla, referencia externa, huella del contenido y resultado por fila.
- Evitar duplicados con una restricción/idempotency key persistente; la clave exacta depende de las capacidades reales del Worker.
- Ante timeout o respuesta ambigua, marcar estado incierto y reconciliar antes de reenviar.
- Un reintento debe seleccionar solo filas elegibles, nunca el lote entero por defecto.
- No asumir que el número de comprobante o CAE existe si no se recibió y verificó la respuesta correspondiente.

## 7. Validaciones

### Archivo
- extensión/tipo permitido y tamaño máximo;
- versión y encabezados reconocidos;
- filas vacías, duplicadas o fuera del límite;
- fórmulas, errores de lectura y tipos de celda inesperados.

### Datos
- formato y consistencia de CUIT/documento;
- fecha válida y reglas por comprobante;
- campos obligatorios condicionales;
- importes, redondeo y sumas;
- compatibilidad de comprobante, concepto, moneda, IVA y condición fiscal;
- punto de venta habilitado para ese CUIT y ambiente;
- permisos del usuario/tenant y autorización vigente.

La validación local sirve para orientar; la validación del Worker/ARCA sigue siendo autoritativa. No prometer que la planilla garantiza aceptación fiscal.

## 8. Seguridad, auditoría y operación

- Autorizar cada acción en el servidor; no confiar solo en ocultar controles en la UI.
- Verificar el acceso a tenant, CUIT y ambiente en cada solicitud.
- Limitar tamaño, filas, duración, concurrencia y frecuencia; definir límites con base en infraestructura real.
- No registrar API keys, secretos, certificados, tokens TA ni datos sensibles innecesarios.
- Auditar quién subió, validó, confirmó, reintentó y descargó resultados, junto con timestamps y referencias.
- Mostrar claramente si el lote es de homologación o producción antes de confirmar.
- Retención, eliminación y descarga deben definirse antes de guardar archivos con datos de clientes.
- Evitar que errores internos o respuestas SOAP crudas aparezcan en la interfaz del cliente.

## 9. Criterios de aceptación

- Una persona puede descargar, completar y subir una plantilla sin macros.
- Errores identifican hoja/fila/campo y explican cómo corregirlos.
- La vista previa no emite comprobantes.
- La emisión requiere confirmación explícita del resumen.
- Cada fila tiene estado persistido y trazable.
- Un lote parcial no oculta éxitos ni errores individuales.
- Un timeout no causa reemisión automática ciega.
- Volver a subir un lote ya procesado no duplica comprobantes.
- Homologación y producción están visual y técnicamente separadas.
- Las claves y secretos no llegan al navegador ni al Excel.
- Los flujos actuales de carga manual de factura y archivos de clientes siguen funcionando.
- Pruebas automatizadas cubren archivo malformado, validación, parcialidad, timeout/estado incierto, reintento, duplicados, permisos y aislamiento por tenant.

## 10. Fuera de alcance inicial

- Modificar o desplegar `zap-fiscal-core` sin aprobación y revisión separadas.
- Programación automática de emisión mensual sin intervención.
- Importación directa de múltiples sistemas contables.
- Crear o administrar certificados, puntos de venta o autorizaciones si el contrato activo no lo permite.
- Presentar un saldo global de uso que la API no expone.
- Reemplazar la carga manual de facturas existente.
- Prometer soporte de todos los tipos de comprobante antes de verificar los endpoints y habilitaciones.

## 11. Referencias de trabajo

- Repositorio de interfaz: `elielcomerci/tienda-zap`.
- Servicio fiscal: `elielcomerci/zap-fiscal-core`.
- Esta propuesta documenta el producto; el contrato de API debe confirmarse contra el código activo y pruebas del Worker antes de implementar.
