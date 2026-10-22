# Checklist — Diseñador visual de comprobantes

**Estado general:** alcance documentado; desarrollo no iniciado.  
Marcar una tarea como terminada solo con evidencia verificable.

## Fase 0 — Separación de alcance
- [ ] Mantener el diseñador separado de la plantilla Excel para facturación en lote.
- [ ] Ubicar la función dentro del menú administrativo de ZAP Fiscal.
- [ ] Confirmar que solo configura la presentación y no modifica la emisión fiscal.
- [ ] Preservar las rutas actuales de carga manual de facturas y archivos de clientes.
- [ ] No modificar ni desplegar el Worker como parte de esta tarea sin aprobación separada.

## Fase 1 — Auditoría normativa y técnica
- [ ] Consultar normativa oficial vigente de ARCA para cada tipo de comprobante que se vaya a soportar.
- [ ] Confirmar qué campos y leyendas corresponden a comprobantes A, B, C y otros tipos efectivamente habilitados.
- [ ] Confirmar formato oficial y datos requeridos para QR fiscal según el comprobante.
- [ ] Confirmar formato, ubicación y representación del CAE/código de autorización y su vencimiento.
- [ ] Auditar los datos reales de comprobante que devuelve el Worker.
- [ ] Definir cuáles son datos fiscales autoritativos y cuáles son campos comerciales configurables.
- [ ] Registrar requisitos condicionales; no asumir que una única plantilla sirve sin cambios para todos los tipos.

## Fase 2 — Identidad visual y experiencia
- [ ] Definir campos de datos comerciales: teléfono, WhatsApp, web, email y otros pertinentes.
- [ ] Definir opciones visuales limitadas y profesionales: logo, acento, tipografía compatible y ubicación.
- [ ] Diseñar vista previa claramente marcada como muestra.
- [ ] Definir valores por defecto y acción para restaurar diseño predeterminado.
- [ ] Definir aplicación de configuración por tenant/CUIT/emisor y tipos de comprobante.
- [ ] Definir si una configuración nueva aplica solo a documentos futuros.
- [ ] Probar la experiencia con usuarios no técnicos.

## Fase 3 — Logo y CDN
- [ ] Auditar el flujo actual de carga de medios y almacenamiento en media.zap.com.ar.
- [ ] Reutilizar el CDN y flujo existente si cumplen los requisitos.
- [ ] No crear otro bucket ni modificar las rutas de archivos de clientes.
- [ ] Validar tamaño, MIME, dimensiones y contenido real.
- [ ] Definir formatos permitidos y sanitización segura para SVG si se admite.
- [ ] Evitar URLs externas arbitrarias y recursos remotos inseguros.
- [ ] Definir reemplazo, caché y comportamiento cuando un logo deja de estar disponible.
- [ ] Verificar que el logo no se distorsione en PDF o impresión.

## Fase 4 — Modelo de configuración y permisos
- [ ] Definir entidad y persistencia de configuración visual.
- [ ] Definir ámbito de configuración (tenant/CUIT/emisor) y permisos de edición.
- [ ] Aislar datos entre emisores y tenants.
- [ ] Guardar referencia al logo, no secretos ni tokens fiscales.
- [ ] Registrar quién cambia la configuración, cuándo y qué versión queda activa.
- [ ] Definir qué ocurre con los comprobantes históricos.
- [ ] Validar datos de contacto y normalizar enlaces de WhatsApp/web/email.

## Fase 5 — Renderizado de comprobantes
- [ ] Separar datos fiscales autoritativos de la capa de presentación.
- [ ] Crear layouts compatibles por tipo de comprobante cuando las reglas lo requieran.
- [ ] Mantener todos los campos y leyendas fiscales aplicables.
- [ ] Renderizar CAE/código de autorización y vencimiento cuando corresponda.
- [ ] Generar QR fiscal conforme al estándar oficial aplicable.
- [ ] Si se añade QR comercial, distinguirlo y no permitir que reemplace el fiscal.
- [ ] Mantener legibilidad en pantalla, PDF y papel.
- [ ] Soportar descripciones largas, muchos ítems y documentos de varias páginas.
- [ ] Controlar márgenes, saltos de página, totales, fuentes y caracteres españoles.
- [ ] No permitir HTML/CSS arbitrario ni scripts introducidos por el usuario.

## Fase 6 — Pruebas y seguridad
- [ ] Usuario no autorizado no puede ver ni cambiar la configuración.
- [ ] Aislamiento entre tenants/CUIT comprobado.
- [ ] Logo inválido, demasiado grande o con contenido no permitido es rechazado.
- [ ] Datos de contacto malformados no generan enlaces inseguros.
- [ ] Vista previa no puede confundirse con una factura válida.
- [ ] Verificar comprobantes de prueba por cada tipo soportado.
- [ ] Verificar CAE/vencimiento y QR con herramientas de lectura.
- [ ] Verificar impresión en color y blanco y negro.
- [ ] Verificar textos largos, varias páginas y tablas con muchos ítems.
- [ ] Verificar que los cambios visuales no alteren importes, numeración o datos autorizados.
- [ ] Regresión de PDF y de los flujos existentes.
- [ ] Typecheck, lint, tests y build de tienda-zap pasan.

## Fase 7 — Piloto y lanzamiento
- [ ] Validar en homologación con comprobantes de prueba claramente identificados.
- [ ] Revisar salida con el criterio fiscal vigente antes de producción.
- [ ] Confirmar fallback al diseño predeterminado si falla el logo.
- [ ] Confirmar que documentos históricos no se alteran silenciosamente.
- [ ] Publicar guía breve para cargar logo y configurar contacto.
- [ ] Habilitar progresivamente y monitorear errores de renderizado.

## Criterio de salida a producción

No publicar el diseñador hasta validar requisitos oficiales por tipo de comprobante, integridad de datos fiscales, QR fiscal, aislamiento de configuración, seguridad de carga del logo y calidad de PDF/impresión.
