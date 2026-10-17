# Registro de Deudas de Costeo

> Deudas identificadas durante el proceso de implementación de configuradores.
> Cada deuda tiene origen trazable al catálogo real y evidencia cuantificada.
> **No bloquean el configurador activo** — se resuelven en sprint de costing específico,
> una vez que haya suficiente masa crítica de evidencias para una pasada conjunta.

---

## DEUDA #001 — Perforación / Agujereado

**Estado:** Parcialmente resuelta (17/10/2026). Tags 9×5 cm de 500 u. ya incorpora papel, impresión digital por pliego, perforación y laminado opcional en `TAGS_DIGITAL`; 1.000 u. sigue en consulta. La operación genérica compartida conserva únicamente los tiers explícitos de 500 y 1.000 u.  
**Descubierta en:** Tags & Etiquetas E2E (2026-10-04)  
**Impacta:** `fin_perforacion` (ID estable)  
**Productos activos afectados:** `tags-etiquetas`  
**Productos futuros en riesgo:** cualquiera que reutilice `fin_perforacion`

### Origen

Al comparar los tiers del cotizador contra la tarifa real de `AGUJEREADOS` de
Tarjetas Clásicas 350g (`lista-print.txt`, pp. 11–12):

| Cantidad | Cotizador actual (PER_UNIT × $2.5/u) | Catálogo real | Diferencia |
|---:|---:|---:|---:|
| 500 | $1.250 | $3.225 | −$1.975 |
| 1.000 | $2.500 | $4.500 | −$2.000 |
| 2.000 | $5.000 | $8.056 | −$3.056 |
| 3.000 | $7.500 | $11.612 | −$4.112 |

Los precios reales del catálogo tienen estructura de **precio fijo por lote** (no lineal):

```
500 u.  → $3.225 fijo
1000 u. → $4.500 fijo
+ millar adicional → $3.556 cada uno
```

El `costType: PER_UNIT` con tier `501+ → $2.5/u` no captura esta estructura.

### Causa raíz

`fin_perforacion` fue sembrado con tiers lineales simples derivados de una estimación,
no de la fuente primaria del catálogo. La tarifa real tiene un componente fijo de
postura (setup) que hace la curva sublineal solo hasta cierto punto y luego salta.

### Resolución aplicada y trabajo pendiente

Para `tags-etiquetas`, el configurador ya no usa la tarifa lineal subestimada. La versión activa `1.1` incorpora el costo de papel por pliego, impresión digital por pliego, perforación fija de $3.225 para 500 unidades y laminado frontal opcional. El redondeado también tiene costo explícito por lote.

El cálculo usa una imposición conservadora de 24 tags 9×5 cm por pliego imprimible 46×31 cm para reservar margen de corte y merma. La cantidad publicada se limita a 500 unidades porque la matriz digital no permite sostener un precio competitivo para 1.000 unidades frente a la alternativa offset.

Pendiente para cerrar la deuda general:
1. Obtener un costo offset terminado verificable para tags de 1.000 unidades.
2. Revalidar el rendimiento real de imposición en producción y ajustar la reserva de merma si el proveedor confirma otra cantidad por pliego.
3. Mantener la operación genérica `fin_perforacion` como tarifa fija por lote; no volver a representarla como costo unitario lineal.

### Impacto comercial estimado

La configuración activa de 500 tags ahora incorpora el costo fijo de perforación. El riesgo pendiente está en 1.000 unidades y en confirmar la imposición real; no debe extrapolarse el precio de 500 unidades.

---

## DEUDA #002 — (reservada para próxima identificación)

---

*Última actualización: 2026-10-17*
