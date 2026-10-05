# Registro de Deudas de Costeo

> Deudas identificadas durante el proceso de implementación de configuradores.
> Cada deuda tiene origen trazable al catálogo real y evidencia cuantificada.
> **No bloquean el configurador activo** — se resuelven en sprint de costing específico,
> una vez que haya suficiente masa crítica de evidencias para una pasada conjunta.

---

## DEUDA #001 — Perforación / Agujereado

**Estado:** Abierta  
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

### Corrección pendiente

Opciones a evaluar en el sprint de costing:

1. **Cambiar `costType` a `FIXED_SETUP`** con tiers por rango de cantidad:
   ```
   1–500:    $3.225 fijo
   501–1000: $4.500 fijo
   1001–2000: $8.056 fijo (4500 + 3556)
   2001–3000: $11.612 fijo (4500 + 3556×2)
   ```
2. **Agregar campo `setupCost`** al modelo `FinishingOperation` para separar
   costo fijo de postura + costo variable por unidad.
3. Revalidar E2E de `tags-etiquetas` tras la corrección; los demás configuradores
   activos (`tarjetas-vouchers`, `flyers-desplegables`) no usan `fin_perforacion`.

### Impacto comercial estimado

Los precios actuales de Tags subcotizan la perforación en ~$2.000–$4.000 por lote
según cantidad. El margen de beneficio del 150% amortigua parte de esto, pero el
costeo interno (`totalCost`) no refleja el costo real de producción.

---

## DEUDA #002 — (reservada para próxima identificación)

---

*Última actualización: 2026-10-04*
