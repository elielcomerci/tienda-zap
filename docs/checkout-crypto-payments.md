# Checkout cripto de ZAP — implementación

## Objetivo

Agregar pagos con USDT, USDC y WLD al checkout existente sin modificar Mercado Pago ni los medios de pago actuales. El cliente firma desde su propia wallet; ZAP recibe en la dirección configurada y verifica el pago desde el servidor.

## Dirección receptora

`0x46da5941eF55e27256ED5802BF8521f75D0c6684`

Es una dirección pública de recepción. Nunca se debe pedir ni almacenar una clave privada o frase semilla de la wallet de recepción en el frontend.

## Decisión inicial de redes

| Red | Activos habilitados inicialmente | Decisión |
| --- | --- | --- |
| Base (8453) | USDC nativo de Circle | Red principal candidata para pagos en stablecoin. |
| Optimism (10) | USDC nativo de Circle, WLD oficial de World | Permite incluir WLD sin aceptar versiones bridged no verificadas. |
| Polygon PoS (137) | Ninguno en el primer corte | Mantener preparada la matriz, pero no exponer todavía una tercera red. |
| Optimism / Polygon | USDT deshabilitado inicialmente | Habilitar solo después de verificar el contrato canónico y el activo exacto que ZAP podrá liquidar/usar. |

La lista de `src/lib/crypto/networks.ts` es una allowlist explícita, no una lista de todos los tokens que una wallet pueda mostrar. No se deben aceptar símbolos o direcciones enviados por el navegador como fuente de verdad.

## Arquitectura y controles obligatorios

1. El servidor calcula la cotización ARS→cripto desde CriptoYa, valida respuesta y antigüedad, y guarda precio, origen, instante, vencimiento, importe ARS, token, red, contrato, decimales y cantidad entera exacta.
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

Matriz de redes/activos, cotización, persistencia, conexión de wallet, creación de transferencia, verificación on-chain, conciliación periódica, estados visibles, pruebas de idempotencia y documentación operativa.

### Etapa 2 — tesorería automática

Queda fuera del primer despliegue: swaps, conversión y transferencia automática a Ripio. Requiere un firmante operativo independiente de Rabby, custodia de claves de servidor, límites, gas, idempotencia, auditoría y estrategia de recuperación.

## Pendientes antes de producción

- Confirmar contrato canónico de USDT para cada red que se quiera habilitar.
- Definir fuente RPC primaria y secundaria por red, con límites y observabilidad.
- Definir la política de cotización CriptoYa (endpoint, volumen de referencia, campo ask/totalAsk y margen si corresponde) sin sumar un margen implícito.
- Versionar migraciones Prisma y probar la transición de pago en una base de prueba.
- Verificar la integración visual y móvil de WalletConnect con wallets reales.
- Probar transferencias correctas, red/token incorrecto, cantidad insuficiente, repetición de hash, RPC caído, expiración de cotización y reorg antes de habilitar pagos reales.
