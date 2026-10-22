# Handoff técnico — tienda-zap PR #23

Última actualización: 2026-10-22 (UTC), después del merge

## Objetivo de esta tanda

El PR #23 ya fue integrado mediante squash. Este handoff conserva la validación, la incidencia de GitHub Actions y la limpieza pendiente de la variable temporal de Preview.

## Estado de GitHub

- Repositorio: `elielcomerci/tienda-zap`
- PR: https://github.com/elielcomerci/tienda-zap/pull/23
- Rama: `fix/test-harness-configurator-contract-20261020`
- Base: `main`
- HEAD del PR antes del merge: `864dceed8fe5fe63e13628f6608deec69c50150a`.
- Commit de squash integrado en `main`: `c4a4cfd5baa9ba2833d5f2cd5e9e6f107f47a3df`.
- Estado final: PR #23 cerrado y merged el 2026-10-22. `main` apunta al commit de squash indicado arriba.
- Preview del último HEAD probado: https://vercel.com/zapagenciacreativa/tienda-zap/HPBgDaDhHZfZ2roNpM9ZCDz93dkv
- Estado final de la Preview: READY. Next.js compiló y terminó la fase de TypeScript; `npm test` y la integración DB aislada pasaron.
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
- Además de la consulta de solo lectura, `npm run test:integration:pricing` se ejecutó mediante Prisma y el motor TypeScript en el prebuild de Vercel y pasó para los tres configuradores.
- Nunca usar `DATABASE_URL` de producción como `TEST_DATABASE_URL`. No copiar connection strings ni secretos a este archivo o a comentarios de PR.

## GitHub Actions — bloqueo observado

- En el HEAD `64bb728a...`, los workflows `Configurator contract tests` y `Client work files checks` fallaron casi instantáneamente. Se reintentaron ambos y volvieron a fallar sin pasos ejecutados ni URL de logs; el wrapper de jobs devuelve `steps=null`.
- En los runs previos del mismo PR se confirmó `runner_id=0`, runner vacío y `steps=[]`: GitHub Actions no está llegando a ejecutar los jobs. Esto no equivale a un fallo de tests.
- La suite unitaria y la integración DB sí pasaron en Vercel. Para cerrar CI, investigar por qué Actions no asigna runner; no desactivar checks ni hacer bypass de protección de rama.

## Decisión de validación y cierre

- GitHub Actions fue reintentado y volvió a fallar sin asignar runner (`runner_id=0`, `steps=[]`). No se desactivaron workflows ni se hizo bypass de protecciones.
- Como alternativa explícita, el prebuild de Vercel ejecutó y pasó `npm test` y `npm run test:integration:pricing` con `TEST_DATABASE_URL` apuntando a la rama Neon aislada. Vercel quedó READY y CodeRabbit dio success.
- La rama está alineada con `main` (`behind_by=0`) y GitHub indica `mergeable=true`.
- PR #23 integrado por squash. El commit en `main` es `c4a4cfd5baa9ba2833d5f2cd5e9e6f107f47a3df`.
- La variable sensible `TEST_DATABASE_URL` se creó solo para Preview de la rama `fix/test-harness-configurator-contract-20261020` y apunta a la rama Neon aislada `crypto-preview-isolated-20261020`. La integración no se usa en producción. La herramienta disponible en esta sesión no ofrece operación de borrado de variables Vercel: **pendiente retirar manualmente `TEST_DATABASE_URL` en Vercel → Project Settings → Environment Variables**, filtrando por esa rama. No copiar ni mostrar su valor.

## Restricciones que no cambian

- No se omitieron checks ni se forzó el merge: GitHub Actions no asignó runner, y la validación alternativa verde quedó documentada.
- No usar ni alterar la base de producción para pruebas.
- No activar pagos cripto reales.
- No ejecutar migraciones ni cambiar datos en producción.
- No exponer secretos/URLs de conexión en documentación, logs o comentarios.
