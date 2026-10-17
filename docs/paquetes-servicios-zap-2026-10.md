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
| Landing de captación | Desde | $490.000 | Una página; una oferta principal; diseño responsive; estructura de contenidos; formulario o WhatsApp; medición básica y SEO técnico elemental; hasta dos rondas de ajustes | Pauta, producción audiovisual, redacción extensa, múltiples ofertas, integraciones especiales |
| Sitio web institucional | Desde | $950.000 | Hasta cinco páginas/secciones; arquitectura de información; diseño propio responsive; formulario; WhatsApp; configuración técnica y SEO básico; hasta dos rondas de ajustes | Tienda online, área privada, turnos, integraciones complejas, carga masiva de contenidos |
| Perfil de Empresa en Google | Fijo | $120.000 | Revisión/configuración del perfil; categorías, servicios, descripción, horarios, enlaces y guía para gestionar reseñas | Verificación de Google, gestión mensual, publicaciones recurrentes, respuesta permanente a reseñas o garantía de posicionamiento |
| WhatsApp comercial configurado | Fijo | $190.000 | Perfil comercial; horarios; catálogo inicial de hasta 15 artículos/servicios; respuestas rápidas; etiquetas; bienvenida y guía de uso | API, bots, CRM, automatizaciones externas y atención de mensajes por ZAP |
| Diseño de flyer/volante | Fijo | $79.000 | Una pieza original; una propuesta; hasta dos rondas de ajustes; archivo final para impresión o publicación | Impresión, fotografía, ilustración compleja, múltiples adaptaciones o redacción/campaña completa |
| Pack de 10 piezas para redes | Fijo | $270.000 | Diez piezas coordinadas; criterio visual basado en identidad existente; ajustes agrupados en hasta dos rondas; archivos finales para publicar | Community management, publicación, moderación, estrategia mensual integral, fotos, video o identidad desde cero |
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
- **Diseño Pack de piezas para redes (10):** $270.000; alcance limitado a identidad existente y ajustes agrupados.
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
