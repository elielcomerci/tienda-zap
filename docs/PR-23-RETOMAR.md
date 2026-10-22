# Handoff técnico — tienda-zap PR #23

Última actualización: 2026-10-22 (UTC)

## Objetivo de esta tanda

Cerrar el PR #23 con validación verificable del contrato de precios/configuradores, integración de precios contra una base Neon aislada, estado de GitHub Actions y build de Preview. No hacer merge hasta resolver los bloqueos de validación.

## Estado de GitHub

- Repositorio: `elielcomerci/tienda-zap`
- PR: https://github.com/elielcomerci/tienda-zap/pull/23
- Rama: `fix/test-harness-configurator-contract-20261020`
- Base: `main`
- HEAD conocido al escribir esta nota: `8230b3a5f75d4a996abcbd58e64d93e62b1b9e9b`
- La rama quedó alineada con `main` (sin commits atrasados); GitHub indicó `mergeable=true`, pero el PR continúa en borrador y abierto.
- Preview de Vercel que pasó build y pruebas unitarias: https://vercel.com/zapagenciacreativa/tienda-zap/Cz5fpqv7w14zcUSBpXuAtvYFVrTL
- Estado de esa Preview: READY. Next.js compiló y terminó la fase de TypeScript.
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

- En el HEAD `8230b3a5...`, los workflows `Configurator contract tests` y `Client work files checks` terminaron como failure casi instantáneamente, con `runner_id=0`, nombre de runner vacío y `steps=[]`.
- Eso indica que el job no llegó a ejecutar pasos; no es un resultado de tests fallidos. La suite de configuradores sí pasó en Vercel.
- Reintentar el job. Si vuelve a fallar sin runner/pasos, registrar el fallo como infraestructura de Actions y no como fallo de código; el merge debe seguir pendiente hasta decidir una validación equivalente aceptable.

## Siguiente secuencia

1. Revisar este handoff y consultar HEAD actual del PR (puede haber cambiado).
2. Confirmar que `TEST_DATABASE_URL` está configurada solo para Preview de esta rama y apunta a Neon `crypto-preview-isolated-20261020`, nunca a la rama `main`.
3. Hacer que el prebuild ejecute `npm run test:integration:pricing` únicamente cuando `TEST_DATABASE_URL` exista; si no existe, omitirla explícitamente y conservar `npm test`.
4. Disparar una nueva Preview y verificar el log `Resultado: 3 configuradores activos comprobados contra TEST_DATABASE_URL.`
5. Reintentar GitHub Actions; confirmar si runner se asigna y si todos los pasos pasan.
6. Revisar status combinado, diff final y `mergeable`; actualizar descripción del PR.
7. Solo entonces integrar PR #23. No desplegar cambios de configuración de cobros cripto ni ejecutar migraciones de producción en esta tarea.

## Restricciones que no cambian

- No mergear mientras la integración DB y la explicación del estado de CI sigan pendientes.
- No usar ni alterar la base de producción para pruebas.
- No activar pagos cripto reales.
- No ejecutar migraciones ni cambiar datos en producción.
- No exponer secretos/URLs de conexión en documentación, logs o comentarios.
