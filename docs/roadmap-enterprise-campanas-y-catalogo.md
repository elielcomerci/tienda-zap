# Roadmap enterprise: campanas, CRM y catalogo multirrubro

Este documento ordena lo que falta para convertir la tienda actual en una base comercial robusta, cuidando que cada paso sea verificable y no rompa el checkout, catalogo ni promociones existentes.

## Regla de ejecucion

Cada bloque se trabaja asi:

1. Definir alcance chico y reversible.
2. Revisar schema, acciones server y UI afectada.
3. Implementar sin refactors ajenos.
4. Ejecutar `npx prisma format`, `npx prisma generate` y `npx prisma db push` si hubo schema.
5. Ejecutar `npm run build`.
6. Validar checklist manual de los flujos tocados.
7. Commit chico y descriptivo.

## 0. Orden de release antes de seguir acumulando

Estado: pendiente.

- Separar commits limpios:
  - combos y seleccion de variantes.
  - cupones: edicion, paginacion, filtros y landing personalizada.
  - auditoria.
  - reglas de elegibilidad.
  - analytics de campanas.
  - docs.
- Decidir que scripts `scratch/` se descartan, cuales se convierten en scripts formales y cuales quedan fuera de git.
- Correr `docs/checklist-regresion-release.md`.
- Hacer push a `main` cuando la tanda este validada.

## 1. Cierre de Fase 1: campanas robustas

Objetivo: dejar promociones/cupones listos para operar campanas reales con control, medicion y trazabilidad.

### 1.1 Exportacion filtrada de cupones

- Exportar CSV respetando busqueda, estado, lote y vencimiento activos.
- Mantener exportacion total como opcion secundaria.
- Registrar exportacion en auditoria con filtros usados.
- Validar que el CSV incluya codigo, estado, destinatario, negocio, lote, referente publico, QR, escaneos, redenciones y vencimiento.

### 1.2 Auditoria mas util

- Agregar filtro por fecha desde/hasta.
- Agregar filtro por actor.
- Agregar link desde promocion/cupon hacia auditoria filtrada.
- Mostrar detalle expandible de `before`, `after` y `metadata` cuando haga falta.
- Mantener la vista liviana por defecto para no cargar JSON grande de entrada.

### 1.3 Detalle de campana

- Crear vista `/admin/promociones/[id]`.
- Mostrar datos de campana, reglas, alcance, analytics y cupones.
- Mostrar embudo:
  - cupones generados
  - escaneos
  - reservas
  - compras confirmadas
  - facturacion atribuida
  - descuento otorgado
  - retorno estimado
- Mostrar actividad reciente desde auditoria.

### 1.4 Proteccion de margen

- Agregar advertencias al guardar promociones:
  - descuento porcentual alto.
  - monto fijo mayor al minimo de compra.
  - promocion sin limite de uso y sin fecha final.
  - promocion aplicable a todo el catalogo con descuento agresivo.
- En una etapa posterior, calcular margen estimado cuando productos tengan costo confiable.

## 2. Proximo paso minimo de catalogo: plantilla Carteleria

Objetivo: sumar un producto configurable/cotizable para carteleria, parecido en filosofia a Indumentaria, pero basado en sustrato, medidas y estructura.

### 2.1 Modelo funcional

La plantilla debe permitir cotizar por:

- Sustrato:
  - lona front
  - vinilo impreso
  - backlight
  - foamboard / PVC espumado
  - alto impacto
  - acrilico
  - chapa / ACM si el proveedor lo maneja
- Medidas:
  - ancho en cm
  - alto/largo en cm
  - presets comunes
  - medida personalizada
- Estructura:
  - solo impresion
  - bastidor de madera
  - bastidor metalico
  - tensado / colocado sobre bastidor
- Terminaciones:
  - ojales
  - dobladillo
  - laminado
  - corte al ras
  - instalacion opcional, si se decide venderla
- Tipo de iluminacion:
  - sin iluminacion
  - backlight

### 2.2 Materias primas necesarias

- Cargar sustratos como materias primas por m2 o metro lineal segun corresponda.
- Cargar bastidor de madera por metro lineal.
- Cargar bastidor metalico por metro lineal.
- Cargar terminaciones por unidad, metro lineal o m2.
- Definir desperdicio/merma por material.
- Definir minimo cobrable por pieza.

### 2.3 Formula inicial de cotizacion

- Area = ancho_cm * alto_cm / 10000.
- Perimetro = 2 * (ancho_cm + alto_cm) / 100.
- Costo impresion/sustrato = area * costo_m2.
- Costo bastidor = perimetro * costo_m_lineal.
- Costo terminaciones = segun unidad, perimetro o area.
- Precio final = costo total * margen + setup/minimo si aplica.

### 2.4 Implementacion recomendada

- Reusar `ProductQuoterConfig` si alcanza para material, medida y terminaciones.
- Si falta soporte para ancho/alto libre, extender el configurador con campos numericos controlados.
- Crear template "Carteleria" en `ProductOptionsConfigurator`.
- Crear seed formal para productos/materias primas de carteleria solo cuando tengamos precios reales.
- Validar checkout con medida personalizada, bastidor y backlight.

## 3. CRM comercial

Objetivo: dejar de asignar cupones a textos libres y pasar a entidades comerciales reales.

- Crear `BusinessAccount` o `CustomerCompany`. Estado: hecho como `BusinessAccount`.
- Crear `CustomerContact`. Estado: hecho como `BusinessContact`.
- Crear tags comerciales. Estado: hecho en cuenta comercial.
- Agregar origen del lead. Estado: hecho como campo `source`.
- Vincular vendedor asignado. Estado: hecho con asesor titular y operativo.
- Vincular cupon a negocio/contacto. Estado: schema listo, falta selector en admin de cupones.
- Mostrar ficha de negocio:
  - datos
  - contactos
  - compras
  - cupones
  - campanas recibidas
  - notas internas
  - proxima accion.

## 4. Audiencias

Objetivo: generar campanas desde segmentos claros.

- Audiencias manuales por tags, rubro, zona, vendedor y estado comercial.
- Audiencias dinamicas:
  - compro en ultimos X dias
  - no compro hace X dias
  - escaneo y no compro
  - compro categoria X
  - ticket promedio mayor a X
- Preview antes de generar cupones.
- Generar lote desde audiencia.
- Guardar audiencia como plantilla reutilizable.

## 5. Automatizacion

Objetivo: ejecutar campanas con menos trabajo manual.

- Plantillas:
  - bienvenida
  - cliente inactivo
  - referidos
  - evento
  - cumpleanos
  - recompra
  - liquidacion
- Acciones automaticas:
  - generar cupon al crear cliente
  - recordatorio si escaneo y no compro
  - pausar por fecha o limite
  - alertar por bajo rendimiento
- Canales:
  - WhatsApp
  - email
  - QR
  - seller
  - partner
  - link directo

## 6. SaaS enterprise / multirrubro

Objetivo: convertir la base en producto comercializable.

- Multi-tenant real.
- Tiendas aisladas.
- Branding por tenant.
- Dominios personalizados.
- Roles granulares.
- Planes y limites.
- API de suscripcion activa.
- Bloqueo elegante por licencia vencida.
- Modulos activables por rubro.

## Proximo bloque recomendado

1. Commit/push de la tanda actual, despues de checklist manual.
2. Implementar exportacion filtrada de cupones.
3. Mejorar auditoria con fecha y detalle expandible.
4. Crear vista detalle de campana.
5. Empezar plantilla Carteleria con materiales reales y formula minima.
