# Paquetes de servicios ZAP — propuesta comercial

**Fecha:** 2026-10-17  
**Objetivo:** publicar primero servicios con alcance controlable y precio entendible, sin convertir a ZAP en una oferta básica ni salir del mercado.  
**Estado:** primera iteración de alcance y precios propuesta; no equivale a verificación de rentabilidad ni confirma cambios en la base de datos de producción.

## Criterio comercial

- Precio fijo cuando entregables, insumos del cliente y revisiones pueden limitarse de antemano.
- Precio desde cuando existe una versión inicial vendible, pero el alcance puede crecer.
- Consulta cuando la solución depende de entender el negocio, integrar sistemas o desarrollar algo a medida.
- Los precios son importes de referencia en ARS. Antes de comunicarlos como definitivos, validar tratamiento fiscal, capacidad/horas, comisiones, herramientas y margen. No asumir que el importe de seed ya está publicado en producción.

## Primera tanda recomendada

| Producto | Modalidad propuesta | Precio de referencia | Alcance incluido | Fuera de alcance / disparadores de presupuesto |
|---|---|---:|---|---|
| Landing de captación | Desde | $390.000 | Una página; una oferta principal; diseño responsive; estructura de contenidos; formulario o WhatsApp; medición básica y SEO técnico elemental; hasta dos rondas de ajustes | Pauta, producción audiovisual, redacción extensa, múltiples ofertas, integraciones especiales |
| Sitio web institucional | Desde | $790.000 | Hasta cinco páginas/secciones; arquitectura de información; diseño propio responsive; formulario; WhatsApp; configuración técnica y SEO básico; hasta dos rondas de ajustes | Tienda online, área privada, turnos, integraciones complejas, carga masiva de contenidos |
| Perfil de Empresa en Google | Fijo | $99.000 | Revisión/configuración del perfil; categorías, servicios, descripción, horarios, enlaces y guía para gestionar reseñas | Verificación de Google, gestión mensual, publicaciones recurrentes, respuesta permanente a reseñas o garantía de posicionamiento |
| WhatsApp comercial configurado | Fijo | $150.000 | Perfil comercial; horarios; catálogo inicial de hasta 15 artículos/servicios; respuestas rápidas; etiquetas; bienvenida y guía de uso | API, bots, CRM, automatizaciones externas y atención de mensajes por ZAP |
| Diseño de flyer/volante | Fijo | $79.000 | Una pieza original; una propuesta; hasta dos rondas de ajustes; archivo final para impresión o publicación | Impresión, fotografía, ilustración compleja, múltiples adaptaciones o redacción/campaña completa |
| Pack de 10 piezas para redes | Fijo | $220.000 | Diez piezas coordinadas; criterio visual basado en identidad existente; ajustes agrupados en hasta dos rondas; archivos finales para publicar | Community management, publicación, moderación, estrategia mensual integral, fotos, video o identidad desde cero |
| Diseño de menú gastronómico | Fijo con límite | $170.000 | Una carta acotada; orden y jerarquía de contenidos provistos; hasta dos rondas de ajustes; archivo final para producción | Carta extensa, traducciones, fotografía, impresión, múltiples formatos o actualizaciones recurrentes |
| Papelería corporativa | Fijo | $185.000 | Aplicación de identidad existente a tres piezas acordadas —por ejemplo, tarjeta, hoja membretada y firma de correo—; hasta dos rondas de ajustes; archivos finales | Creación de identidad, impresión, más piezas o adaptaciones complejas |

## Reglas de alcance que deben aparecer en las fichas

1. El cliente entrega información, textos, precios, logos y materiales de marca necesarios, salvo que la ficha indique expresamente que ZAP los produce.
2. Las rondas de ajustes se entregan agrupadas. Cambios de dirección o pedidos que amplíen el alcance se presupuestan aparte.
3. El trabajo comienza cuando se reciben los materiales y la información necesarios.
4. Dominio, hosting, licencias, suscripciones y servicios de terceros no están incluidos salvo que la ficha lo indique.
5. El plazo se confirma al recibir el material completo y acordar el alcance.
6. El precio no debe publicarse como definitivo hasta validar impuestos, costo operativo y margen.

## Estado en el repositorio

### Ajustado en `prisma/seed/data/05-products.ts`

- **Diseño de Flyer / Volante:** $79.000; alcance actualizado con dos rondas de ajustes.
- **Diseño Pack de piezas para redes (10):** $220.000; alcance limitado a identidad existente y ajustes agrupados.
- **Diseño de Menú Gastronómico:** $170.000; alcance acotado y contenidos provistos.
- **Diseño de Papelería Corporativa:** $185.000; aplicación a tres piezas sobre identidad existente.

Estos cambios están en el seed de GitHub. No prueban que la base de datos de producción ni el sitio publicado hayan recibido los nuevos importes.

### Requiere implementación/verificación aparte

- **Landing y sitio institucional:** actualmente se agrupan bajo el producto configurable `activos-web-sitios`. Hay que comprobar que el configurador pueda distinguir ambos paquetes y que el cálculo público, carrito e impuestos coincidan antes de cambiar precios.
- **Perfil de Empresa en Google** y **WhatsApp comercial configurado:** deben comprobarse como productos independientes en el catálogo persistente, no inferirse solo porque aparezcan como parte de combos.
- Confirmar si el precio directo de los cuatro productos de diseño se interpreta como importe final, neto o precio sin impuestos en la tienda.
- Verificar costo de capacidad interna: horas de estrategia, diseño, coordinación, implementación, revisiones, herramientas y tareas no facturables.

## Criterio para cerrar la tanda

Un producto queda listo para publicar cuando su ficha, precio, alcance y exclusiones coinciden; el importe se mantiene igual desde producto a carrito/checkout; la condición fiscal está validada; y el precio cubre el costo operativo con el margen previsto. Las integraciones o trabajos no cubiertos quedan en consulta, no se resuelven con costos supuestos.

## Comparación competitiva pública — 17/10/2026

La revisión sí usa ofertas y tarifarios públicos identificables, pero no todas las referencias tienen idéntico alcance. Se separa precio anunciado de juicio sobre comparabilidad; las páginas de tarifas orientativas no sustituyen cotizaciones directas.

| Servicio | Referencias públicas encontradas | Lectura para ZAP | Precio de trabajo propuesto |
|---|---|---|---:|
| Landing de captación | Manivela publica $200.000 para su plan landing y rango profesional de $200.000–$500.000; Sistemas Winter publica $350.000 y señala rango de $250.000–$700.000. | $490.000 estaba en el techo del rango de Manivela. Para una oferta de entrada definida, $390.000 mantiene margen de posicionamiento sin ir directamente al máximo. Validar si se incluye copy, analítica, hosting y soporte. | $390.000 desde |
| Sitio institucional | SiteMaster publica referencia de $350.000–$700.000 para 4–6 secciones; Tarifario.info separa freelance y agencia, y ubica el nivel agencia por encima del freelance. | $790.000 queda por encima de la franja económica, justificable solo si se mantiene diseño propio, arquitectura, configuración y criterio estratégico. No venderlo como sitio de plantilla. | $790.000 desde |
| Perfil de Empresa en Google | SEO Local Argentina anuncia creación a $100.000 y optimización a $80.000; Nova Digital publica $35.000. | $120.000 era alto frente a esos precios. $99.000 es más defendible para configuración completa con revisión y guía, pero debe delimitar si incluye asistencia de verificación. | $99.000 fijo |
| WhatsApp comercial configurado | Nodus publica setup a $145.000 e incluye perfil, catálogo, mensajes, respuestas rápidas, etiquetas, capacitación y tracking con Meta Ads. | $190.000 superaba una oferta que declara más alcance. $150.000 es una base más competitiva para la configuración descrita; tracking, integraciones o automatizaciones complejas deben cotizarse aparte. | $150.000 fijo |
| Flyer / pieza individual | looop.ar publica desde $100.000 por flyer de una cara; ADG publica $112.560 para flyer de una cara y $150.080 frente y dorso. Tarifario.info muestra un rango de agencia de USD 80–200, sin especificar siempre el mismo alcance. | $79.000 es una entrada competitiva frente a estos referentes, siempre que sea una pieza simple con materiales provistos. No incluye concepto de campaña o copy extenso. | $79.000 fijo |
| Pack de 10 piezas para redes | EcomA publica 10 piezas a $180.000; Concandela publica 12 piezas a $115.000 con formatos/adaptaciones especificados. | $270.000 era una prima alta frente a ofertas directas; con alcance limitado a identidad existente y sin publicación, $220.000 mantiene posicionamiento superior sin alejarse tanto. El benchmark no permite afirmar que todas las ofertas tienen igual profundidad estratégica. | $220.000 fijo |
| Menú gastronómico | Tarifario.org publica diseño de menú de restaurante de 6 páginas entre $269.150 y $519.076 (última actualización indicada: diciembre de 2025). | $170.000 puede ser razonable para una carta acotada y contenidos entregados, pero no para una carta editorial de seis páginas o redacción/arquitectura integral. | $170.000 fijo con límite |
| Papelería corporativa | Agustina Rossini publica $110.000 para tarjeta, hoja membretada y sobre; ARDG publica $366.000 como referencia para papelería completa. | $185.000 se ubica por encima de una oferta individual y debajo del tarifario de asociación para papelería completa. Hay que explicitar qué tres piezas se incluyen. | $185.000 fijo |

### Fuentes públicas consultadas

- Manivela — landing y rangos: https://manivela.com.ar/blog/cuanto-cuesta-landing-page-argentina-2026
- Sistemas Winter — web y landing: https://sistemaswinter.com/precios/cuanto-cuesta-una-pagina-web-en-argentina
- SiteMaster — precios web: https://sitemaster.com.ar/blog/cuanto-cuesta-una-pagina-web-en-argentina
- Tarifario.info — desarrollo web y diseño gráfico: https://tarifario.info/desarrollo-web/ y https://tarifario.info/diseno-grafico/
- SEO Local Argentina — Perfil de Empresa en Google: https://seolocalarg.com/servicios
- Nova Digital — Google Business y diseño gráfico: https://www.novadigital.com.ar/google-business-perfil-profesional y https://www.novadigital.com.ar/categoria/diseno-grafico
- Nodus — setup WhatsApp Business: https://www.nodusargentina.com/servicios/whatsapp-business
- looop.ar — diseño de flyers: https://looop.ar/diseno-de-flyers/
- ADG — tarifario profesional: https://www.adg.com.ar/tarifario-diseno-grafico/
- EcomA — packs de piezas: https://ecoma.ar/diseno-branding
- Concandela — packs de diseño: https://concandela.com.ar/packs-de-diseno/
- Tarifario.org — diseño de menú: https://tarifario.org/piezas-editoriales-c26
- ARDG — papelería: https://ardg.ar/tarifario/
- Agustina Rossini — papelería y diseño: https://www.agustinarossini.com/diseno-grafico-digital-e-interfaces-web

**Limitación:** son precios publicados visibles en la web al momento de la consulta; algunos pueden ser promocionales, orientativos, sin IVA o con alcance menor. Antes de cerrar una publicación conviene pedir cotización directa a 2–3 proveedores para los servicios con mayor impacto. No se usaron precios de impresión para estimar servicios de diseño.
