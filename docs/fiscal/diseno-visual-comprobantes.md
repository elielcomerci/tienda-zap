# Diseñador visual de comprobantes fiscales

**Estado:** alcance funcional documentado; pendiente de auditoría normativa/técnica, prototipo y desarrollo.  
**Ubicación prevista:** menú de administración de ZAP Fiscal dentro de tienda-zap.  
**Activos visuales:** reutilizar el CDN existente media.zap.com.ar para el logo y los recursos aprobados.  
**Límite fiscal:** el diseño puede mejorar la presentación, pero no modificar, ocultar ni reemplazar los datos que deban figurar en el comprobante autorizado.

## 1. Es distinto de la plantilla Excel

Esta función no carga operaciones ni emite lotes. Configura la apariencia de los comprobantes PDF/descargables generados después de la emisión.

- **Importación por Excel:** datos de entrada para preparar y emitir operaciones en lote. Ver facturacion-por-lotes-excel.md.
- **Diseñador de comprobantes:** identidad visual y presentación de la documentación fiscal emitida.

Ambas funciones pueden convivir y utilizar los mismos comprobantes emitidos como fuente de datos, pero no deben confundirse en la UI ni en su arquitectura.

## 2. Objetivo

Permitir que cada negocio configure una presentación clara y profesional de sus comprobantes, sin conocimientos de diseño ni edición manual de PDF. La configuración se guarda y se aplica a los comprobantes compatibles que genere el sistema.

La presentación debe funcionar en pantalla, al descargar/imprimir en PDF y en papel, sin sacrificar legibilidad ni requisitos fiscales.

## 3. Experiencia prevista

1. Desde el menú, el usuario autorizado abre **Diseño de comprobantes**.
2. Selecciona el perfil de emisor/CUIT al que aplica la configuración, si tiene permiso sobre más de uno.
3. Carga el logo a través del flujo seguro existente de medios y lo almacena en el CDN media.zap.com.ar.
4. Completa datos comerciales de contacto: teléfono, WhatsApp, web, email y otros campos que se definan.
5. Selecciona opciones visuales acotadas: estilo, color de acento, tipografía compatible, ubicación del logo y presentación de la información de contacto.
6. Ve una previsualización con datos ficticios o un comprobante de prueba expresamente autorizado, claramente identificado como vista previa.
7. Guarda la configuración y puede restaurar el diseño predeterminado.
8. El sistema aplica la configuración solo a los documentos que se generen posteriormente, salvo que se diseñe y apruebe por separado un mecanismo de regeneración histórica.

## 4. Identidad visual y recursos

### Logo y CDN

- Reutilizar el mecanismo de carga de medios existente siempre que sea compatible; no crear otro bucket ni un almacenamiento paralelo.
- Guardar una referencia/URL validada al recurso en media.zap.com.ar, junto con metadatos mínimos necesarios.
- Validar tamaño, tipo MIME, dimensiones y contenido del archivo; no confiar solo en la extensión.
- Aceptar formatos de imagen seguros y acordados para renderizado en PDF. Preferir SVG sanitizado o PNG/JPEG según la biblioteca y los riesgos reales; no permitir SVG arbitrario sin sanitización.
- No permitir que el usuario introduzca una URL externa arbitraria como logo sin una política de seguridad explícita.
- Definir límites de tamaño, comportamiento si el recurso se elimina y política de reemplazo/caché.
- No modificar ni afectar los archivos de clientes existentes ni su ruta de almacenamiento.

### Datos de contacto comerciales

Campos candidatos: teléfono, WhatsApp, web, email, domicilio comercial u otras vías de contacto pertinentes. Se deben separar los datos fiscales obligatorios de los datos comerciales opcionales. No asumir que los datos del perfil comercial sustituyen los datos registrales exigidos.

El enlace de WhatsApp y los links deben validarse y representarse de forma segura. Si el comprobante se imprime, mostrar también un dato legible (por ejemplo, teléfono o dominio), no depender solo de enlaces clicables.

## 5. Datos fiscales y cumplimiento

Antes de definir el layout definitivo, auditar los requisitos oficiales vigentes y los datos que entrega el Worker/ARCA para cada tipo de comprobante habilitado. La implementación debe contemplar las diferencias por tipo, letra, operación y condición fiscal.

Como mínimo, verificar aplicabilidad y ubicación de:
- identificación del comprobante y letra/clase cuando corresponda (A, B, C u otros tipos autorizados);
- razón social/nombre legal y CUIT del emisor;
- condición frente al IVA u otra leyenda fiscal exigida;
- domicilio fiscal/comercial requerido;
- punto de venta y número correlativo;
- fecha de emisión;
- datos del receptor y su identificación según corresponda;
- descripción/conceptos, cantidades, precios e importes;
- discriminación de impuestos y alícuotas cuando corresponda;
- moneda, totales, descuentos u otros datos obligatorios de la operación;
- CAE u otro código de autorización aplicable, y su vencimiento cuando corresponda;
- QR fiscal obligatorio y los datos codificados/formato que establezca ARCA para ese tipo de comprobante;
- cualquier leyenda, referencia o requisito adicional aplicable al caso.

Esta lista es una guía de auditoría, no una afirmación de que todos los campos sean obligatorios para todos los comprobantes. Las reglas finales deben basarse en normativa oficial vigente y en los tipos efectivamente soportados. No inventar QR ni codificar información fiscal a partir de una URL genérica: respetar el estándar oficial que corresponda.

**Regla de seguridad fiscal:** la configuración visual no puede cambiar datos fiscales devueltos por el proceso de emisión, alterar importes, cambiar letra/tipo, modificar numeración, ocultar CAE/vencimiento ni reemplazar el QR fiscal requerido. Si el QR oficial es obligatorio, un QR de contacto/WhatsApp nunca lo sustituye.

## 6. QR, WhatsApp y enlaces

- Reservar el QR fiscal oficial al cumplimiento normativo cuando corresponda.
- Si hay espacio y aporta valor, se puede incluir un segundo QR comercial para web/contacto/WhatsApp, identificado claramente y sin competir visualmente con el fiscal.
- No sobrecargar el comprobante con varios QR ni reducirlos hasta volverlos ilegibles.
- Verificar contraste, tamaño de impresión y lectura real del QR fiscal.
- Los datos de contacto deben seguir siendo legibles en impresión en blanco y negro.
- Los enlaces no deben abrir destinos arbitrarios derivados de contenido no validado.

## 7. Diseño y accesibilidad

- Apariencia profesional, limpia y sobria; prioridad a legibilidad y jerarquía de la información.
- Tipografía compatible con el motor PDF y con caracteres españoles; no depender de fuentes externas cargadas en tiempo de renderizado.
- Contraste suficiente, tablas claras, márgenes adecuados y saltos de página correctos.
- No usar solo color para diferenciar estados o información.
- Evitar recortes de logo, solapamientos, filas partidas de manera confusa y totales separados de su contexto.
- Soportar nombres legales y descripciones extensas, múltiples ítems y páginas adicionales.
- Probar PDF digital e impresión física; revisar que los QR y códigos de autorización sean legibles.
- La personalización debe limitarse a opciones controladas; no permitir HTML/CSS arbitrario ni una plantilla libre que pueda ocultar información obligatoria.

## 8. Modelo de configuración y versionado

La arquitectura debe confirmar el alcance del perfil antes de implementarse:
- propietario de la configuración (tenant, CUIT o emisor);
- usuarios que pueden verla y editarla;
- qué tipos de comprobante usan la configuración y qué excepciones aplican;
- valores por defecto cuando falte un campo comercial o el logo;
- versionado/auditoría de cambios y quién los realizó;
- momento en que una configuración nueva entra en vigor;
- política para documentos históricos, que deben conservar su integridad y no cambiar silenciosamente.

No almacenar secretos fiscales ni tokens en la configuración visual. La configuración debe guardar solo preferencias y referencias a recursos, no una copia editable de datos fiscales autorizados.

## 9. Criterios de aceptación

- Un usuario autorizado puede configurar y previsualizar el diseño sin emitir un comprobante real.
- El logo se guarda usando el CDN existente y se valida antes de aceptarse.
- Los datos de contacto son opcionales, se validan y no sustituyen datos fiscales.
- La vista previa está claramente marcada y no puede confundirse con un comprobante válido.
- La salida final muestra los datos fiscales correctos para el tipo de comprobante y conserva los datos autorizados.
- El CAE/vencimiento y el QR fiscal se presentan según corresponda y son legibles.
- Los cambios visuales no afectan emisión, numeración, importes, autorización ni registros históricos.
- PDF de una y varias páginas mantiene legibilidad, márgenes, tablas y totales.
- Se prueban impresión a color y en blanco y negro.
- No se puede inyectar HTML/CSS, scripts o recursos externos arbitrarios.
- La carga de logo no altera los archivos de clientes ni crea otro bucket.
- Pruebas cubren permisos, aislamiento entre emisores, logo inválido, datos largos, varios tipos de comprobante y regresiones del PDF.

## 10. Fuera de alcance inicial

- La plantilla Excel y la emisión por lotes.
- Editar el contenido fiscal después de emitir.
- Regenerar silenciosamente comprobantes históricos con una nueva identidad visual.
- Crear o modificar certificados, puntos de venta, CAE o autorizaciones.
- Reemplazar el QR fiscal obligatorio por un QR de marketing/contacto.
- Plantillas HTML/CSS libres o scripts del usuario.
- Cambios en zap-fiscal-core o despliegues del Worker sin revisión y aprobación separadas.

## 11. Referencias

- CDN existente: media.zap.com.ar.
- Integración de interfaz: elielcomerci/tienda-zap.
- Servicio fiscal: elielcomerci/zap-fiscal-core.
- Facturación en lote: facturacion-por-lotes-excel.md.
- Checklist de este módulo: CHECKLIST-DISENO-COMPROBANTES.md.

La auditoría normativa y el contrato real del Worker deben completarse antes de congelar el diseño del comprobante.
