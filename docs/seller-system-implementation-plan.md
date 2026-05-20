# Sistema de Asesores Comerciales ZAP

Este plan traduce el manual comercial de asesores a reglas implementables en Prisma, backend y paneles.

## Reglas cerradas

- Rangos por facturacion historica neta cobrada:
  - Inicial: 10%, desde $0.
  - Asociado: 13%, desde $5.000.000.
  - Senior: 16%, desde $15.000.000.
  - Estrategico: 20%, desde $40.000.000.
- Base de comision: subtotal menos descuentos.
- Las ventas de tienda y ventas manuales comisionan igual si tienen asesor asignado.
- Los abonos se cargan manualmente desde admin en la primera etapa.
- Los abonos activos registrados forman el "Piso Proyectado Proximo Mes".
- Las comisiones de orden se generan pendientes al cobrar y quedan disponibles solo al entregar.
- El rango conquistado no baja automaticamente.
- Penalizaciones de rango requieren motivo obligatorio y auditoria historica.
- Un asesor retirado conserva cartera, pero la comision se divide 50/50 con el heredero operativo.
- El heredero operativo se asigna cliente por cliente.
- Admin puede vender y comisionar, pero queda fuera de rankings por defecto.

## Fase 1 - Modelo comercial base

- [x] Agregar enums de rango, estado de asesor, estado/tipo de comision y eventos de rango.
- [x] Extender `SellerProfile` con rango, rango maximo, facturacion historica, override temporal, estado y exclusion de rankings.
- [x] Agregar `SellerRankEvent` para auditoria.
- [x] Agregar `SellerCommissionLedger`.
- [x] Agregar modelo de abonos recurrentes.
- [x] Agregar asignacion operativa de cliente por asesor heredero.
- [x] Generar Prisma Client.

## Fase 2 - Calculo y ledger

- [x] Crear constantes de rangos y thresholds.
- [x] Crear helpers para tasa efectiva, ascenso automatico y split de retiro.
- [x] Al confirmar pago, generar comision pendiente.
- [x] Al entregar orden, marcar comision disponible y acumular facturacion historica.
- [x] Al cancelar orden, anular comisiones pendientes.
- [x] Mantener compatibilidad temporal con `Order.commissionAmount`.

## Fase 3 - Liquidaciones

- [x] Cambiar liquidaciones para leer ledger disponible.
- [x] Registrar pagos contra comisiones concretas o saldo disponible.
- [x] Separar disponible, pendiente, pagado y cancelado.
- [x] Mostrar desglose por tipo: tienda, manual, recurrente y regalia.

## Fase 4 - Abonos y piso proyectado

- [x] Crear admin de abonos.
- [x] Crear accion para generar liquidacion mensual de abonos.
- [x] Calcular piso proyectado solo con abonos activos registrados.
- [x] Mostrar piso proyectado en dashboard seller.

## Fase 5 - Jubilacion y herencia

- [x] Permitir marcar asesor como retirado.
- [x] Permitir asignar heredero operativo cliente por cliente.
- [x] Aplicar split 50/50 en tienda y abonos de cartera retirada.
- [x] Mostrar regalias al asesor retirado y comisiones operativas al heredero.

## Fase 6 - Paneles y administracion

- [x] Admin usuarios: editar rango manual y penalizar rango con motivo obligatorio.
- [x] Admin usuarios: override temporal, estado y exclusion de rankings.
- [x] Seller dashboard: rango, progreso, saldo disponible, piso proyectado e ingresos por tipo.
- [x] Seller dashboard: ocultar admins de rankings competitivos. No hay ranking competitivo activo; el flag ya queda modelado para cuando se agregue.
- [x] Clientes seller: mostrar propietario y heredero operativo cuando aplique.

## Criterios de verificacion

- [ ] Un cliente nuevo queda ligado a asesor por referral o por asignacion manual.
- [ ] Una orden pagada crea comision `PENDING`.
- [ ] Una orden entregada mueve comision a `AVAILABLE`.
- [ ] Una orden cancelada anula comisiones.
- [ ] Un asesor sube automaticamente al cruzar thresholds.
- [ ] Una penalizacion de rango exige motivo.
- [ ] Un abono activo aumenta el piso proyectado del proximo mes.
- [ ] Un asesor retirado genera split 50/50 con heredero.
