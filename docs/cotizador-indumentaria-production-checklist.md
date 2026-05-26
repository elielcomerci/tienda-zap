# Checklist de Produccion: Cotizador e Indumentaria

## Fase 0 - Contencion

- [x] Recalcular `remera-personalizada` con variantes comprables y precios mayores a cero.
- [x] Bloquear guardado/publicacion de productos activos con matriz 100% incomprable.
- [x] Auditar productos activos con variantes en cero, precio fijo sin costing y quoter incompleto.
- [ ] Documentar productos que quedan temporalmente como precio fijo o variantes manuales.

## Fase 1 - Fuente de Verdad

- [ ] Definir para cada producto el modo de pricing: fijo, variantes, quoter grafico o quoter indumentaria.
- [x] Persistir `ProductQuoterConfig` desde el admin cuando se use cotizador dinamico.
- [x] Evitar que el cotizador automatico solo genere variantes efimeras sin configuracion auditable.
- [x] Mostrar en admin el estado operativo del producto: comprable, requiere datos, no publicable.

## Fase 2 - Indumentaria Enterprise

- [ ] Crear configuracion propia para indumentaria: prenda base, tecnica, ubicacion, area, proveedor, costo y margen.
- [ ] Reemplazar constantes hardcodeadas de frontend por costos persistidos.
- [ ] Soportar reglas por color/tela/tecnica, por ejemplo sublimacion solo en prendas blancas.
- [ ] Guardar precio con desglose: costo prenda, costo estampa, merma, margen, redondeo y version de costo.

## Fase 3 - Archivos y Produccion

- [ ] Subir archivo de diseno del cliente al seleccionar "Mi archivo".
- [ ] Asociar archivo, lado, escala y preset al item del carrito y al pedido.
- [ ] Validar en checkout que un producto estampado tenga archivo, preset o pedido explicito de diseno.
- [ ] Exponer el arte en admin de pedidos para preprensa/produccion.

## Fase 4 - Calidad y Observabilidad

- [ ] Tests unitarios para pricing grafico e indumentaria.
- [ ] Tests de checkout recalculando precios desde servidor.
- [ ] Script CI de auditoria que falle ante productos activos no comprables por error.
- [ ] Log/auditoria de cambios de costos y margenes.

## Fase 5 - Catalogo Completo

- [ ] Migrar productos con `variants-priced-no-costing` a quoter o BOM.
- [x] Migrar `banners` a BOM por variante con costos de proveedor auditables.
- [x] Resolver productos con `variants-incomplete`.
- [ ] Revisar productos con precio fijo sin costing y decidir si quedan fijos o migran.
- [x] Crear tablero admin de brechas de costing por categoria.
