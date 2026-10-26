# Criterio fiscal para precios de Tienda ZAP

**Fecha:** 2026-10-26  
**Estado:** criterio operativo para la rama `audit/precios-mercado-seed-2026-10`. No implica merge ni despliegue.

## Costos y márgenes internos

- Los costos de imprenta/proveedores se cargan netos de IVA cuando ese es el importe de la lista.
- El margen comercial se calcula sobre importes netos comparables; el IVA débito no se trata como ingreso propio.
- Los importes de referencia externos se conservan tal como aparecen en su fuente. Cada benchmark indica `INCLUDED`, `EXCLUDED` o `UNSPECIFIED`; no se debe comparar directamente una cifra con IVA contra otra neta sin normalizar primero.
- Si la fuente no aclara el tratamiento fiscal, se marca como no especificado; no se presume que el IVA esté incluido ni excluido.

## Precios públicos de servicios

- ZAP es Responsable Inscripto y discrimina IVA en sus facturas.
- En el seed, `priceFrom` para servicios representa el importe neto de referencia.
- La interfaz presenta el importe final orientativo con IVA general del 21% incluido, y debajo el desglose:
  - **PRECIO SIN IMPUESTOS NACIONALES**: base neta.
  - **IVA (21%)**: importe del impuesto.
- Se conserva la modalidad `CONSULTAR`: el precio es orientativo, no un presupuesto cerrado.
- Antes de publicar un servicio con tratamiento fiscal distinto de la alícuota general, debe revisarse su configuración. El 21% es el criterio por defecto de estos servicios, no una regla universal para cualquier operación.

## Impresos configurables

Los precios cotizados por las matrices deben mantener su cálculo fiscal propio: costos netos, margen neto y desglose público final. No se debe sumar IVA dos veces si un motor ya devuelve un total final con IVA incluido.

## Verificación pendiente

Los cambios de esta rama no se consideran aprobados para producción hasta ejecutar los checks/build y revisar los importes renderizados en catálogo y ficha.
