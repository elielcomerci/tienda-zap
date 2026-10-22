# Handoff técnico — tienda-zap PR #23

Última actualización: 2026-10-22 (UTC), después de la validación de integración

## Objetivo de esta tanda

Cerrar el PR #23 con validación verificable del contrato de precios/configuradores, integración de precios contra una base Neon aislada, estado de GitHub Actions y build de Preview. No hacer merge hasta resolver los bloqueos de validación.

## Estado de GitHub

- Repositorio: `elielcomerci/tienda-zap`
- PR: https://github.com/elielcomerci/tienda-zap/pull/23
- Rama: `fix/test-harness-configurator-contract-20261020`
- Base: `main`
- HEAD después del handoff y el runner de prebuild: `64bb728a8d120a6e8acfd428627b651822a4e0c3` (la nota puede quedar un commit atrás si se actualiza)
- La rama quedó alineada con `main` (sin commits atrasados); GitHub indicó `mergeable=true`, pero el PR continúa en borrador y abierto.
- Preview de Vercel con la integración DB activada: https://vercel.com/zapagenciacreativa/tienda-zap/CGqg6hBUuBn93GEiBghxkR14fZwV
- Estado observado: READY. Next.js compiló y terminó la fase de TypeScript.
- `npm test` pasó dentro del prebuild de Vercel: contrato de configuradores (21 pruebas), humo de cotización, allowlist de redes cripto, aritmética de cotizaciones, concurrencia/idempotencia y simulación de conciliación.
- No tomar los mensajes `stderr` de los casos de fallo simulado de conciliación como fallos de suite si el test final reporta PASS.

## Cambios incluidos

- `src/lib/pricing/configurator-adapter.ts`: validación estructural antes de cotizar; exige matrices según motor de precios.
- `tests/checkout-pricing-smoke.test.ts`: prueba del configurador de stickers hasta la cotización de checkout y regresiones para contratos inválidos.
- `scripts/run-ts-tests.cjs`: runner compatible con Windows/Linux para los tests TypeScript.
- `tests/pricing-db.integration.test.ts`: lee ConfiguratorVersion activa para tarjetas-vouchers, tags-etiquetas y adhesivos-stickers, calcula cotizaciones y valida costo/precio/neto+IVA.
- La integración requiere `TEST_DATABASE_URL` y bloquea igualdad con `DATABASE_URL`; no tiene fallback.
- `src/lib/checkout-orders.ts`, checkout Mercado Pago y cotización cripto: snapshot/trazas de checkout con origen de precio y referencias.
- `package.json`: `npm test`, `npm run test:crypto`, `npm run test:integration:pricing`; el prebuild corre tests unitarios.
- Workflow de configuradores: dispara con cambios en el test de humo.

## Base Neon aislada

- Proyecto Neon: `tienda-zap` (`square-king-88703182`).
- Rama aislada conocida usada para validación: `crypto-preview-isolated-20261020` (ID `br-fancy-recipe-anrw7k4v`), separada de `main`.
- Consulta de solo lectura realizada sobre esa rama el 2026-10-22: aparecen activos los tres configuradores esperados:
  - `adhesivos-stickers` v1.7 — motor `PROVIDER_FINISHED_COST`
  - `tags-etiquetas` v1.5 — motor `PROVIDER_FINISHED_COST`
  - `tarjetas-vouchers` v2.1 — motor `PROVIDER_FINISHED_COST`
- Los tres tienen `schema.fields` de tipo objeto y `pricing` de tipo objeto.
- Esta consulta SQL de solo lectura confirma presencia/estructura en DB, pero **no reemplaza ejecutar** `npm run test:integration:pricing` mediante Prisma y el motor TypeScript.
- Nunca usar `DATABASE_URL` de producción como `TEST_DATABASE_URL`. No copiar connection strings ni secretos a este archivo o a comentarios de PR.

## GitHub Actions — bloqueo observado

- En el HEAD `64bb728a...`, los workflows `Configurator contract tests` y `Client work files checks` fallaron casi instantáneamente. Se reintentaron ambos y volvieron a fallar sin pasos ejecutados ni URL de logs; el wrapper de jobs devuelve `steps=null`.
- En los runs previos del mismo PR se confirmó `runner_id=0`, runner vacío y `steps=[]`: GitHub Actions no está llegando a ejecutar los jobs. Esto no equivale a un fallo de tests.
- La suite unitaria y la integración DB sí pasaron en Vercel. Para cerrar CI, investigar por qué Actions no asigna runner; no desactivar checks ni hacer bypass de protección de rama.

## Siguiente secuencia

1. Revisar este handoff y consultar HEAD actual del PR (puede haber cambiado).
2. `TEST_DATABASE_URL` ya está configurada como variable sensible solo para Preview de esta rama y apunta a la rama Neon aislada `crypto-preview-isolated-20261020`; nunca usar la rama `main`.
3. `scripts/run-prebuild-tests.cjs` corre `npm test` siempre y `npm run test:integration:pricing` solo si existe `TEST_DATABASE_URL`. La Preview confirmó que la variable está presente y que pasaron los tres configuradores.
4. Investigar la causa de infraestructura de GitHub Actions sin desactivar workflows ni omitir checks.
5. Revisar status combinado, diff final y `mergeable`; actualizar descripción del PR.
6. Solo integrar PR #23 cuando CI esté ejecutándose de forma fiable o se haya acordado una alternativa verificable y segura. No desplegar cambios de configuración de cobros cripto ni ejecutar migraciones de producción en esta tarea.

## Restricciones que no cambian

- No mergear mientras la integración DB y la explicación del estado de CI sigan pendientes.
- No usar ni alterar la base de producción para pruebas.
- No activar pagos cripto reales.
- No ejecutar migraciones ni cambiar datos en producción.
- No exponer secretos/URLs de conexión en documentación, logs o comentarios.
