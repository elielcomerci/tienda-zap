# Tienda ZAP — checklist de transición comercial

## Principio rector

La tienda deja de presentar primero un catálogo técnico. Su recorrido principal pasa a ser:

**situación → necesidad → intervención → oferta**

La compra directa sigue disponible para quien ya sabe qué necesita. Checkout, precios, variantes, cupones, créditos, carrito, medios de pago y órdenes quedan fuera de alcance de esta transición.

## Corte 1 — navegación y descubrimiento (en curso)

- [x] Inventariar los modelos y recorridos existentes sin modificar la capa transaccional.
- [x] Corregir el enlace de la portada hacia el filtro de intenciones.
- [x] Replantear la portada con dos velocidades: explorar una situación o ir al catálogo directo.
- [x] Exponer rubros como puerta de entrada pública y filtrar las ofertas relacionadas.
- [x] Renombrar la navegación de descubrimiento para hablar de situaciones, soluciones y catálogo técnico.
- [x] Mantener compatibilidad con las URLs previas `mode=objective&intent=…`.
- [x] Cargar y revisar los contenidos iniciales de situaciones y rubros desde Administración.

## Corte 2 — modelo de descubrimiento

- [ ] Separar en el modelo editorial `Situación` y `Necesidad`; las actuales Intenciones operan transitoriamente como un contexto de descubrimiento.
- [ ] Relacionar necesidades con situaciones, rubros y ofertas sin duplicar productos.
- [ ] Definir el tipo comercial de cada oferta: Cosa, Solución o Desarrollo.
- [ ] Revisar los combos existentes para que sean soluciones configurables y no sólo descuentos agrupados.
- [ ] Agregar relaciones cruzadas entre ofertas: complementos, situaciones, necesidades y rubros.

## Corte 3 — fichas y modos de compra

- [ ] Completar en cada ficha: qué es, para qué sirve, en qué situación ayuda, qué incluye y qué se configura.
- [ ] Declarar el recorrido por oferta: compra directa, configuración, consulta guiada o hablar con ZAP.
- [ ] Mostrar complementos relevantes y la derivación a Agencia u Operaciones cuando exceda la estandarización.
- [ ] Mejorar búsqueda para comprender cosas, situaciones, necesidades, rubros y desarrollos.

## Corte 4 — oferta, configuración y contratación

- [ ] Modelar configuradores versionados y declarativos por oferta, sin duplicar productos por variante configurable.
- [ ] Reutilizar bloques de medida, cantidad, material, impresión, terminación, diseño, archivo e instalación.
- [ ] Definir por configurador si el resultado es precio directo, precio calculado o revisión guiada.
- [ ] Persistir el snapshot legible de configuración, reglas de precio y archivos desde carrito hasta orden y producción.
- [ ] Normalizar primero Stickers, Talonarios, Cartelería por m², Ploteo de vidriera y Remeras estampadas.

## Validación antes de cada despliegue

- [ ] Navegación pública y enlaces anteriores.
- [ ] Carrito, variantes y configurador.
- [ ] Checkout Mercado Pago, transferencia y efectivo.
- [ ] Cupones, créditos y financiación.
- [ ] Órdenes, comprobantes y panel de administración.
- [ ] Pruebas de tipos y build.
