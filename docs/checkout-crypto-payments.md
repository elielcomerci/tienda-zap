# Checkout cripto de ZAP — implementación

## Estado de la implementación (2026-10-20)

- La opción de criptomonedas en checkout solo aparece con `NEXT_PUBLIC_CRYPTO_CHECKOUT_ENABLED=true`; permite elegir Base + USDC, Optimism + USDC o World Chain + WLD.
- La pantalla `/checkout/crypto` solicita una cotización, muestra el importe exacto y puede enviar la transferencia desde una wallet EIP-1193 inyectada.
- El estado del pago se consulta al servidor; la interfaz no marca una transferencia como pagada solo porque la wallet devolvió un hash.
- La prueba de esta rama usa una rama aislada de Neon y variables de Vercel limitadas a Preview. No activar cobros reales ni desplegar/activar el Worker de conciliación hasta completar las pruebas de extremo a extremo.

## Objetivo

Agregar pagos con USDT, USDC y WLD al checkout existente sin modificar Mercado Pago ni los medios de pago actuales. El cliente firma desde su propia wallet; ZAP recibe en la dirección configurada y verifica el pago desde el servidor.

## Dirección receptora

`0x46da5941eF55e27256ED5802BF8521f75D0c6684`

Es una dirección pública de recepción. Nunca se debe pedir ni almacenar una clave privada o frase semilla de la wallet de recepción en el frontend.

## Decisión inicial de redes

| Red | Activos habilitados inicialmente | Decisión |
| --- | --- | --- |
| Base (8453) | USDC nativo de Circle | Red principal candidata para pagos en stablecoin. |
| Optimism (10) | USDC nativo de Circle | Stablecoin adicional; WLD queda deshabilitado aquí en el primer corte. |
| World Chain (480) | WLD oficial de World | Red principal para aceptar WLD, con contrato publicado por World. |
| Polygon PoS (137) | Ninguno en el primer corte | Mantener preparada la matriz, pero no exponer todavía una tercera red. |
| Optimism / Polygon | USDT deshabilitado inicialmente | Habilitar solo después de verificar el contrato canónico y el activo exacto que ZAP podrá liquidar/usar. |

La lista de `src/lib/crypto/networks.ts` es una allowlist explícita, no una lista de todos los tokens que una wallet pueda mostrar. No se deben aceptar símbolos o direcciones enviados por el navegador como fuente de verdad.

## Arquitectura y controles obligatorios

1. El servidor consulta CriptoYa (`/api/{activo}/ARS/1`), descarta cotizaciones con más de 180 segundos, calcula la mediana de `totalBid` entre al menos dos fuentes y redondea la cantidad a unidades enteras hacia arriba. Guarda precio, origen, instante, vencimiento, importe ARS, token, red, contrato, decimales y cantidad exacta. Es una referencia de mercado, no una ejecución ni garantía de liquidación.
2. La orden existente se crea por el flujo actual y el pago cripto queda en un modelo separado relacionado con la orden.
3. El frontend conecta wallet con WalletConnect/Reown AppKit + Wagmi/viem, solicita la transferencia a la dirección receptora y muestra el hash enviado.
4. El backend no confía en el hash del navegador. Verifica chainId, recibo exitoso, contrato allowlisted, evento ERC-20 Transfer, destinatario, cantidad exacta y confirmaciones requeridas.
5. La conciliación periódica se ejecuta fuera de la sesión del cliente y reintenta errores RPC sin marcarlos como pago fallido.
6. La transición a pagado debe ser atómica e idempotente y reutilizar el flujo existente de confirmación de orden sin repetir emails, cupones, comisiones ni eventos.
7. Pagos insuficientes, excesivos, tardíos, ambiguos, en red incorrecta o de contrato no permitido se dejan pendientes de revisión; nunca se aprueban por aproximación.
8. Las migraciones Prisma deben quedar versionadas y reproducibles antes de tocar la base de producción. No usar `db push` como sustituto de una migración de producción.

## Estados visibles

- Preparando pago
- Esperando firma en la wallet
- Transacción enviada
- Transacción detectada
- Confirmando en la red
- Pago verificado
- Pedido confirmado

Todos los estados posteriores al envío deben provenir de datos verificados del backend. La interfaz puede refrescar frecuentemente; la conciliación del servidor debe seguir funcionando aunque el cliente cierre la página.

## Etapas

### Etapa 1 — pago y conciliación

El reconciliador actual es una primera implementación que requiere revisión y pruebas de fallos/reintentos; no se considera todavía un servicio financiero listo para producción. Para respetar el límite de ejecución serverless, procesa hasta cuatro pagos por minuto y consulta los RPC en paralelo por pago.

Ya preparados: matriz de redes/activos, modelo Prisma y migración versionada, cotización CriptoYa, endpoints de cotización/registro de hash/estado, y ruta de conciliación del servidor que consulta recibos y eventos ERC-20, verifica importe exacto y espera 20 confirmaciones antes de marcar el pago verificado. Se agregó un Cloudflare Worker con Cron Trigger cada minuto para invocar el endpoint protegido; Vercel Hobby no admite esa frecuencia. Pendientes: conectar la wallet desde el checkout, validar con RPCs de prueba, probar la migración en una base de prueba, y endurecer/reprobar la finalización idempotente del pedido.

### Etapa 2 — tesorería automática

Queda fuera del primer despliegue: swaps, conversión y transferencia automática a Ripio. Requiere un firmante operativo independiente de Rabby, custodia de claves de servidor, límites, gas, idempotencia, auditoría y estrategia de recuperación.

## Banderas de activación

- `NEXT_PUBLIC_CRYPTO_CHECKOUT_ENABLED`: muestra u oculta el método cripto en el checkout.
- `NEXT_PUBLIC_CRYPTO_MAINNET_PAYMENTS_ENABLED`: muestra u oculta el botón que envía fondos desde la wallet.
- `CRYPTO_PAYMENTS_ENABLED`: permite o bloquea el registro de hashes y la conciliación en el servidor.

Mantener las tres desactivadas en producción hasta completar las pruebas de extremo a extremo. La opción visible no debe implicar que los cobros estén habilitados.

## Pendientes antes de producción

- Confirmar contrato canónico de USDT para cada red que se quiera habilitar.
- Verificar World Chain (chainId 480), RPC y explorador en entorno de prueba antes de producción.
- Configurar `CHECKOUT_RECONCILE_URL` y el secreto `CRON_SECRET` en el Worker de Cloudflare; configurar `CRON_SECRET` y RPCs `CRYPTO_RPC_URL_8453`, `CRYPTO_RPC_URL_10` y `CRYPTO_RPC_URL_480` en Vercel. Los endpoints RPC deben ser de confianza y permanecer solo en servidor.
- Desplegar el Worker con Wrangler y comprobar su Cron Trigger cada minuto en Cloudflare.
- Definir fuente RPC secundaria por red, con límites y observabilidad.
- Validar en pruebas que CriptoYa devuelve al menos dos cotizaciones frescas para cada activo (especialmente WLD); revisar si la referencia mediana de `totalBid` representa la política comercial deseada. No se agrega margen implícito.
- Aplicar la migración solo en una base de prueba y validar Prisma Client, creación de cotizaciones y transición de pago antes de producción.
- La primera integración del checkout usa wallets EIP-1193 inyectadas en el navegador; falta integrar WalletConnect para conectar wallets móviles sin navegador integrado y probar ambos flujos con wallets reales.
- Probar transferencias correctas, red/token incorrecto, cantidad insuficiente, repetición de hash, RPC caído, expiración de cotización y reorg antes de habilitar pagos reales.
- El reconciliador marca para revisión manual recibos revertidos, transferencias ambiguas, contratos/destinatarios no coincidentes o importes incorrectos; los errores RPC quedan reintentables.
- La confirmación de orden usa una lease de finalización recuperable. Antes de producción hay que probar interrupciones entre la verificación y los efectos secundarios (emails, cupones, comisiones y eventos), para cerrar la ventana de recuperación sin duplicados ni efectos omitidos.


### Canonical block verification

A payment is not eligible for automatic settlement based only on confirmation depth. Reconciliation stores the receipt block hash, compares it with the canonical block returned by the configured RPC, and repeats that comparison immediately before finalizing the order. Missing or mismatched block evidence moves the payment to manual review. RPC outages remain retryable and must not be treated as payment failure. Post-settlement reorganization monitoring remains a separate operational control; this check narrows the settlement race but cannot make a probabilistic-finality chain irreversible.
