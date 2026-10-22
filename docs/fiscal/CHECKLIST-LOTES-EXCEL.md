# Checklist de desarrollo — Facturación por lotes Excel

**Estado general:** documentación creada; desarrollo no iniciado.  
Marcar una tarea como terminada solo con evidencia verificable (commit, prueba, captura o decisión registrada).

## Fase 0 — Alcance y protección del sistema actual
- [ ] Confirmar alcance inicial y usuarios objetivo: negocios y estudios contables.
- [ ] Mantener esta funcionalidad dentro de `tienda-zap`; ningún cambio de Worker sin aprobación separada.
- [ ] Confirmar que la carga manual de facturas y los archivos de clientes no se modifican.
- [ ] Revisar PR y estado actual de integración del panel administrativo fiscal.
- [ ] Acordar qué CUIT/tenant y ambientes se usarán para pruebas; usar homologación para pruebas iniciales.

## Fase 1 — Auditoría del contrato fiscal real
- [ ] Inspeccionar en la rama activa del Worker las rutas de emisión, autorización y consulta.
- [ ] Registrar request/response reales y esquemas TypeScript disponibles.
- [ ] Confirmar tipos de comprobante y conceptos realmente soportados.
- [ ] Confirmar campos obligatorios y condicionales por comprobante.
- [ ] Confirmar autenticación, autorización por tenant/CUIT y permisos.
- [ ] Confirmar límites, timeouts, concurrencia y rate limiting.
- [ ] Confirmar estrategia de idempotencia y reconciliación de respuestas inciertas.
- [ ] Confirmar datos que identifican una emisión autorizada y su resultado fiscal.
- [ ] Documentar diferencias entre homologación y producción, incluidos puntos de venta.
- [ ] Registrar brechas del contrato; no inventar endpoint ni comportamiento para avanzar.

## Fase 2 — Prototipo de plantilla y experiencia
- [ ] Probar con usuarios la opción de una fila por comprobante frente a comprobantes con múltiples ítems.
- [ ] Definir versión de plantilla y estrategia de compatibilidad.
- [ ] Definir instrucciones breves y un ejemplo ficticio.
- [ ] Definir campos comunes y campos condicionales.
- [ ] Definir formatos de fecha, decimales, moneda y celdas vacías.
- [ ] Definir listas de opciones únicamente a partir de capacidades confirmadas.
- [ ] Definir reporte de errores por fila/campo.
- [ ] Definir resumen de confirmación antes de emitir.
- [ ] Definir formato de salida con resultado por comprobante.

## Fase 3 — Diseño técnico y datos
- [ ] Decidir almacenamiento de lote/archivo y retención.
- [ ] Diseñar persistencia de lote y estado por fila.
- [ ] Definir referencia externa estable, huella del contenido y prevención de duplicados.
- [ ] Definir estados finales e inciertos alineados con la API real.
- [ ] Definir reconciliación para timeout o respuesta ambigua.
- [ ] Definir reintentos por fila elegible, nunca reintento ciego del lote completo.
- [ ] Definir límites de tamaño, cantidad de filas, duración y concurrencia.
- [ ] Definir permisos y aislamiento por tenant, CUIT y ambiente.
- [ ] Definir auditoría, logging sin secretos y política de datos personales.
- [ ] Revisar diseño técnico antes de comenzar a emitir en producción.

## Fase 4 — Importación y validación
- [ ] Implementar descarga de plantilla versionada.
- [ ] Implementar validación de extensión, tipo, tamaño y estructura.
- [ ] Rechazar encabezados ausentes/duplicados y filas ambiguas.
- [ ] Validar celdas, fechas, identificadores e importes.
- [ ] Validar reglas condicionales según el contrato fiscal confirmado.
- [ ] Mostrar vista previa y totales sin emitir.
- [ ] Mostrar errores accionables por fila y campo.
- [ ] Permitir descargar errores y corregir/reimportar.
- [ ] Sanitizar texto exportado para evitar fórmulas/inyección.

## Fase 5 — Orquestación segura de emisión
- [ ] Integrar desde backend con el endpoint individual real o endpoint por lote si existe y fue confirmado.
- [ ] Mantener secretos solo en entorno servidor.
- [ ] Confirmar explícitamente el resumen antes de iniciar emisión.
- [ ] Persistir estado antes y después de cada intento.
- [ ] Limitar concurrencia y respetar límites de API.
- [ ] Guardar resultados individuales y datos de autorización confirmados.
- [ ] Tratar timeouts/respuestas ambiguas como estado incierto.
- [ ] Reconciliar antes de reintentar un estado incierto.
- [ ] Bloquear duplicados ya autorizados.
- [ ] Mostrar progreso y permitir consultar un lote en curso sin duplicar el procesamiento.
- [ ] Asegurar que un fallo parcial preserve los resultados ya confirmados.

## Fase 6 — Seguridad y observabilidad
- [ ] Verificar rol ADMIN en servidor en cada acción protegida.
- [ ] Verificar permisos de tenant/CUIT/ambiente, no solo el rol global.
- [ ] Aplicar límites de tamaño, filas, duración y frecuencia.
- [ ] Evitar secretos, tokens, certificados y respuestas internas en logs/UI.
- [ ] Auditar carga, validación, confirmación, emisión, reintentos y descargas.
- [ ] Revisar acceso y retención de archivos con datos de clientes.
- [ ] Revisar accesibilidad, mensajes de error y confirmaciones de producción.

## Fase 7 — Pruebas
- [ ] Plantilla válida con un comprobante.
- [ ] Plantilla válida con lote de tamaño representativo.
- [ ] Archivo vacío, corrupto, con extensión falsa o estructura incorrecta.
- [ ] Encabezados duplicados, columnas desconocidas y versión antigua.
- [ ] Fechas/decimales regionales y celdas con fórmulas.
- [ ] CUIT/documento inválido y campos condicionales ausentes.
- [ ] Importes inconsistentes y combinaciones fiscales no permitidas.
- [ ] Usuario no autorizado y aislamiento entre tenants.
- [ ] Lote mixto con éxitos y errores.
- [ ] Timeout después de enviar una emisión.
- [ ] Reintento tras estado incierto sin duplicar.
- [ ] Reimportación del mismo archivo/lote sin duplicar.
- [ ] Fallo parcial durante la ejecución y recuperación.
- [ ] Confirmar separación entre homologación y producción.
- [ ] Regresión de carga manual de facturas y archivos de clientes.
- [ ] Typecheck, lint, tests y build de tienda-zap pasan.

## Fase 8 — Piloto controlado y lanzamiento
- [ ] Probar primero en homologación con datos no productivos.
- [ ] Revisar resultados contra comprobantes autorizados y registros del Worker.
- [ ] Probar un lote pequeño de producción con autorización del operador.
- [ ] Definir procedimiento de soporte y recuperación de estados inciertos.
- [ ] Definir límites iniciales conservadores.
- [ ] Publicar guía breve de uso y errores frecuentes.
- [ ] Habilitar la función progresivamente y monitorear errores.
- [ ] Documentar incidentes y criterios para ampliar el tamaño de lote.

## Criterio de salida a producción

No habilitar emisión productiva hasta que el contrato real esté confirmado, exista una estrategia comprobada de idempotencia/reconciliación, todas las filas tengan trazabilidad, pasen las pruebas de permisos y duplicados y se haya validado la separación de ambientes y puntos de venta.
