# ZAP Style — criterios de interfaz para tienda.zap.com.ar

## Propósito

La tienda es un único portal para clientes y administración de ZAP. La experiencia debe sentirse simple, directa y coherente aunque por detrás integre comercio, archivos, servicios y facturación electrónica.

**Principio rector:** si un elemento no ayuda a entender, decidir o actuar, no debería estar en pantalla. Reducir ruido nunca puede ocultar información crítica ni debilitar la seguridad.

## Filtros obligatorios para cada pantalla

1. **Una tarea principal reconocible.** La jerarquía visual debe dejar claro qué se puede hacer y cuál es el siguiente paso.
2. **Texto mínimo y concreto.** Títulos breves, etiquetas explícitas y ayuda contextual solo donde resuelva una duda real. Evitar párrafos que repitan lo evidente, jerga interna, métricas no verificadas y mensajes genéricos.
3. **Jerarquía y consistencia.** Reutilizar componentes, espaciados, estados, controles y patrones visuales existentes de ZAP. No inventar patrones por pantalla.
4. **Contexto visible.** Mostrar cuenta, negocio, CUIT, ambiente o pedido activo cuando su confusión pueda provocar un error.
5. **Estados honestos.** Diferenciar cargando, vacío, disponible, deshabilitado, error, pendiente y completado. No presentar datos ausentes como ceros ni afirmar éxito antes de confirmarlo.
6. **Acciones proporcionales.** Una acción principal; las secundarias deben competir menos visualmente. No sumar tarjetas, indicadores o adornos que no aporten decisión.
7. **Recuperación sin pérdida.** Cerrar un diálogo, volver atrás o recibir un error no debe borrar datos ingresados innecesariamente. Los reintentos deben ser seguros y no duplicar operaciones.
8. **Accesibilidad y uso real.** Etiquetas claras, foco y teclado funcionales, contraste suficiente, objetivos táctiles razonables y errores asociados al campo correspondiente.
9. **Sin sorpresas.** Explicar las consecuencias antes de operaciones sensibles. No usar confirmaciones para acciones inocuas ni textos alarmistas.
10. **Mobile y escritorio.** La tarea principal debe seguir siendo clara en ambos; evitar tablas y diálogos que obliguen a desplazamientos desproporcionados.

## Elegir el patrón de interacción

### Resolver en la misma vista
Preferirlo para filtros, búsquedas, selección rápida, acciones frecuentes y cambios pequeños que no necesitan un flujo propio.

### Modal
Usarlo cuando la tarea sea acotada, tenga un objetivo concreto y sea útil conservar el contexto de origen. Ejemplos: agregar un CUIT a una cuenta, editar un dato puntual o confirmar una acción sensible.

Un modal deja de ser apropiado cuando acumula muchos campos, pasos, paneles anidados, instrucciones extensas o scroll excesivo. No abrir un modal desde otro modal. Al cerrar, preservar el contexto y los datos que corresponda.

### Panel lateral
Usarlo para inspeccionar detalles complementarios o un registro sin abandonar el listado. Si el detalle es extenso o requiere varias acciones complejas, utilizar una página propia.

### Pantalla propia
Preferirla para procesos de varios pasos, configuración avanzada, certificados con varios requisitos, historiales extensos, importaciones por lote y tareas que merecen concentración o URL compartible.

### Confirmación
Reservarla para emitir, anular, revocar, cambiar de TEST a PROD o realizar acciones con consecuencias importantes. Mostrar un resumen verificable y la consecuencia concreta; pedir confirmación no reemplaza los controles del servidor.

### Preguntas para decidir
- ¿El usuario necesita mantener el contexto de la vista actual?
- ¿La tarea es realmente breve y autocontenida?
- ¿El modal simplifica el trabajo o solo esconde complejidad?
- ¿La información crítica y los errores siguen siendo visibles?
- ¿Se puede salir y retomar sin perder trabajo?

## Criterios específicos de facturación electrónica

- `zap-fiscal-core` (Fiscal Worker) es la autoridad para operaciones fiscales, autorizaciones, estado de trabajos, consumo y cuotas. `tienda-zap` es el portal y no implementa una segunda lógica fiscal.
- Toda llamada al Worker sale del servidor. La API key, el secreto interno, claves privadas, TRA/CMS y TA no se entregan al navegador ni se muestran en la interfaz.
- TEST y PROD son entornos estrictamente separados. Certificados, puntos de venta, numeración, autorizaciones y comprobantes nunca deben mezclarse.
- Antes de emitir, mostrar de forma inequívoca la cuenta y CUIT emisores, el ambiente y el punto de venta. La revisión final debe incluir los datos esenciales del comprobante y requerir una confirmación explícita.
- La emisión y la anulación deben verificar permisos efectivos del Worker; una feature flag o una prevalidación de interfaz no sustituyen la autorización del Worker ni la validación de ARCA.
- Mantener idempotencia estable durante los reintentos de una misma solicitud. No volver a emitir para recuperar o descargar un comprobante ya autorizado.
- Consultar en el Worker el consumo/cuota real; no duplicar contadores fiscales en la tienda.
- Diferenciar el comprobante electrónico autorizado por ARCA de un archivo de factura cargado manualmente. La carga manual existente debe seguir funcionando y no reemplazar ni falsear el estado de una factura electrónica.
- No activar emisión PROD hasta que contrato, permisos, migraciones, pruebas de homologación y revisión normativa estén comprobados.

## Feature flags y funciones futuras

- Las funciones aún no listas pueden tener páginas y componentes preparados, pero deben permanecer desactivados por defecto.
- La flag debe bloquear tanto la interfaz como la ruta/API del servidor. Ocultar un enlace no es control de acceso.
- Fallar de forma cerrada si falta la configuración necesaria o no se puede leer una flag.
- Solo usuarios autorizados pueden modificar flags. Registrar cambios y requerir confirmación reforzada para habilitar funciones productivas sensibles.
- No activar una función hasta completar su checklist funcional, seguridad, pruebas y despliegue de dependencias.

## Criterios de aceptación por pantalla

Una pantalla se considera lista cuando:
- La tarea principal se entiende sin leer una explicación larga.
- No hay texto, tarjetas, indicadores o acciones redundantes.
- El patrón de interacción corresponde a la complejidad real de la tarea.
- Cuenta, CUIT, ambiente y otros datos sensibles al contexto se identifican correctamente.
- Los estados vacíos, errores, carga, éxito y permisos insuficientes están resueltos.
- Las rutas y APIs aplican autenticación, autorización y feature flags en servidor.
- Los datos fiscales vienen del Worker cuando corresponda y no se filtran secretos.
- Los errores y reintentos no causan duplicados ni pérdida evitable de datos.
- Funciona en tamaños de pantalla relevantes y es operable con teclado.
- Tests, typecheck, build y migraciones pertinentes pasan; los casos de homologación están documentados.

## Secuencia de entrega y producción

1. Actualizar la rama fiscal respecto de `main` y revisar los cambios completos.
2. Alinear cada llamada con el contrato actual de `zap-fiscal-core` y sus permisos reales.
3. Aplicar migraciones en un entorno controlado y comprobar variables/secretos de servidor.
4. Ejecutar typecheck, pruebas automatizadas y build; resolver todos los errores.
5. Probar flujos positivos y negativos, incluyendo usuario no autorizado, flags apagadas, error del Worker, TEST/PROD, idempotencia y separación de factura manual/electrónica.
6. Hacer homologación antes de habilitar emisión productiva.
7. Revisar visualmente las pantallas con los filtros ZAP Style y ajustar modales/páginas según complejidad.
8. Fusionar solo cuando la revisión y los checks requeridos estén verdes.
9. Desplegar y verificar la versión productiva, migraciones y flags. Mantener las funciones fiscales sensibles apagadas hasta completar sus condiciones de habilitación; la disponibilidad del sitio no equivale a autorizar emisión PROD.
10. Observar el flujo en vivo y avanzar por incrementos pequeños, sin activar funciones incompletas.

## Principio de entrega

**Cada incremento debe ser pequeño, comprobable y visible.** Se puede publicar una interfaz segura para revisar el progreso, pero las operaciones fiscales de producción solo se habilitan cuando pasan sus controles técnicos, legales y de homologación.
