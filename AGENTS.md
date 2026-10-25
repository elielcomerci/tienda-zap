# Directrices del proyecto

> Copiá este archivo a la raíz de cada repo (`CLAUDE.md`, o `AGENTS.md` si usás otra herramienta).
> Completá la sección "Contexto del proyecto" y borrá lo que no aplique.

## Contexto del proyecto

- **Nombre:** _
- **Qué hace:** _
- **Stack:** Next.js (App Router), TypeScript estricto, Prisma, Neon/PostgreSQL, Vercel (+ Cloudflare Workers/R2 si aplica)
- **Comandos:** `npm run dev` · `npm run build` · `npm run lint` · `npm run typecheck` · `npm test`
- **Idioma:** código, variables y commits en inglés; textos de UI en español rioplatense (voseo).

## Principios

1. **Simple antes que ingenioso.** La solución más directa que funcione y se pueda mantener.
2. **Cambios mínimos.** Tocá solo lo necesario para la tarea. No refactorices ni reformatees código ajeno al pedido.
3. **No inventes.** Si falta información (esquema, endpoint, variable de entorno), preguntá o buscá en el repo. Nunca asumas que existe.
4. **Reutilizá antes de crear.** Buscá si ya existe un helper, componente o tipo equivalente.
5. **Una sola fuente de verdad.** No dupliques lógica, constantes ni tipos; centralizalos.

## Antes de escribir código

- Leé los archivos relacionados y seguí las convenciones existentes.
- Si la tarea es grande o ambigua, proponé un plan corto y esperá confirmación.
- Verificá que el cambio no rompa otros consumidores (buscá usos antes de renombrar o borrar).

## TypeScript

- `strict: true`. Prohibido `any`; usá `unknown` + validación o tipos precisos.
- Evitá `as` y `!` salvo justificación en comentario.
- Derivá tipos del origen (`Prisma.XGetPayload`, `z.infer`) en vez de redeclararlos.
- Funciones pequeñas, con una sola responsabilidad y tipo de retorno explícito en las públicas.
- Nombres descriptivos: `getActiveSubscriptionsByTenant`, no `getData`.
- Sin código muerto, `console.log` olvidados ni comentarios que repitan el código. Comentá el **porqué**, no el qué.

## Next.js / React

- Server Components por defecto; `"use client"` solo cuando haga falta interacción.
- Lógica de negocio fuera de los componentes (`/lib`, `/services`).
- Estados de carga, error y vacío en toda vista que consuma datos.
- Accesibilidad básica: etiquetas, `alt`, foco visible, contraste, navegación por teclado.
- Componentes chicos y componibles; evitá props en cascada de más de 2 niveles.

## Base de datos (Prisma / Postgres)

- Toda migración en `prisma migrate`; nunca cambios manuales en producción.
- Índices en columnas usadas en `where`, `orderBy` y claves foráneas.
- Definí `onDelete` explícito en cada relación.
- Evitá N+1: usá `include`/`select` acotados; seleccioná solo los campos necesarios.
- Operaciones multi-paso en `$transaction`.
- Dinero en enteros (centavos) o `Decimal`, nunca `Float`.
- **Multi-tenant:** toda consulta filtra por `tenantId`. Sin excepciones.

## Seguridad

- Nunca commitear secretos. Variables en `.env` + validación al arrancar (zod).
- Validar **toda** entrada externa en el servidor (body, query, params, webhooks, uploads).
- Autenticación y autorización en cada ruta/acción, no solo en la UI.
- Sanitizar cualquier HTML/CSS provisto por usuarios (riesgo XSS). Prohibido `dangerouslySetInnerHTML` sin sanitizar.
- Verificar firma en webhooks. Rate limit en endpoints públicos y de login.
- No exponer errores internos ni stack traces al cliente.
- Principio de mínimo privilegio en tokens, roles y credenciales de DB.

## Manejo de errores y logs

- No tragar errores (`catch {}` vacío está prohibido).
- Errores esperados → respuesta controlada con código HTTP correcto; inesperados → log con contexto y mensaje genérico al usuario.
- Logs estructurados, sin datos sensibles (tokens, contraseñas, DNI, tarjetas).
- Operaciones externas (APIs, WhatsApp, pagos) con timeout, reintentos acotados e idempotencia.

## Performance

- Medir antes de optimizar.
- Paginación en toda lista que pueda crecer.
- Cachear con criterio (`revalidate`, tags) y definir cómo se invalida.
- Imágenes con `next/image`; evitar dependencias pesadas para tareas triviales.

## Testing

- Todo bug corregido lleva un test que lo reproduce.
- Priorizá tests de: lógica de negocio, cálculos (precios, impuestos, fechas), permisos y flujos críticos (pago, facturación, login).
- Tests determinísticos: sin depender de la hora real, red ni orden de ejecución.
- No mergear con tests, lint o typecheck en rojo.

## Git y PRs

- Commits chicos y atómicos, formato `tipo(alcance): descripción` (`feat`, `fix`, `refactor`, `chore`, `docs`, `test`).
- Un PR = un propósito. Descripción con: qué cambia, por qué, cómo probarlo.
- Nunca pushear directo a `main`. Nunca `--force` en ramas compartidas.
- Revisá tu propio diff antes de pedir revisión.

## Dependencias

- Agregar una dependencia solo si ahorra trabajo real; revisar mantenimiento, tamaño y licencia.
- Versiones fijadas vía lockfile. Actualizaciones en PRs separados.

## Documentación

- `README` con setup en menos de 5 minutos: instalar, variables de entorno, migrar, correr.
- Documentar decisiones no obvias (ADR corto o comentario con el porqué).
- Mantener `.env.example` actualizado.

## Definition of Done

Antes de dar una tarea por terminada:

- [ ] Funciona y cumple lo pedido (probado, no solo "compila")
- [ ] `typecheck`, `lint` y tests pasan
- [ ] Sin `any`, `console.log`, código muerto ni TODOs sin dueño
- [ ] Entradas validadas y permisos verificados
- [ ] Estados de carga/error/vacío cubiertos
- [ ] Migraciones e índices revisados
- [ ] Docs / `.env.example` actualizados si cambió algo
- [ ] Resumen final: qué se cambió, qué se probó y qué queda pendiente

## Cómo responder (para el asistente)

- Respuestas breves y directas. Sin explicaciones innecesarias.
- Mostrá solo el código afectado, con la ruta del archivo.
- Señalá riesgos o dudas concretas al final, en pocas líneas.
- Si hay una mejor alternativa a lo pedido, decilo antes de implementar.