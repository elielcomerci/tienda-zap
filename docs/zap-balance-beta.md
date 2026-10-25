# Saldo ZAP - arquitectura beta

## Decisiones confirmadas

- Token: ZAP ERC-20 en Base Sepolia, chain ID 84532, contrato 0x9C07555016096F6072Db004434861d2b5D4b49d1, 18 decimales.
- En Tienda, la valuación interna acordada es fija: 1 ZAP = 1 ARS. No se consulta cotización de mercado.
- El usuario puede mantener saldo en su cuenta Tienda y elige cuándo aplicarlo a una compra o servicio; nunca se descuenta automáticamente.
- NODO es un proyecto interno de ZAP. Esta funcionalidad se llama Saldo ZAP.
- Los depósitos se atribuyen mediante una dirección de depósito única por cuenta Tienda. La dirección Rabby proporcionada anteriormente no se debe usar como receptor compartido.
- Las transferencias a wallets propias serán retiros de custodia de ZAP, sujetos a verificación y controles. No hay transferencias entre clientes (P2P).
- No se promete conversión futura del saldo de Base Sepolia a tokens de Base Mainnet.

## Cómo se identifica cada depósito

1. La cuenta Tienda obtiene una dirección única de depósito, derivada por un servicio custodio seguro de ZAP.
2. El usuario envía el token ZAP de Base Sepolia a esa dirección.
3. El indexador del servidor verifica en un RPC de confianza: chain ID, contrato exacto, receipt exitoso y evento ERC-20 Transfer cuyo destinatario es la dirección de esa cuenta.
4. El movimiento se guarda primero como pendiente; al alcanzar la cantidad requerida de confirmaciones se acredita una sola vez.
5. La unicidad se protege por red, hash de transacción y log index. La dirección de depósito queda ligada permanentemente a la cuenta incluso si se deshabilita para depósitos nuevos.

El usuario no necesita conectar Rabby para recibir tokens. El saldo se ve en Tienda; la wallet propia se usa cuando solicita un retiro. Para transferir a su wallet, ZAP necesita firmar desde la dirección custodial, por lo que las claves deben protegerse fuera de la base de datos y fuera del navegador.

## Libro de saldo

- Libro de movimientos con créditos por depósitos confirmados y asignaciones auditadas; débitos solo tras una acción explícita del usuario.
- Valores exactos en decimal/unidades enteras, nunca float.
- Historial, reversas y conciliación persistente.
- Las asignaciones identifican operador y motivo.
- Las operaciones de consumo futuro llevan idempotencia y una confirmación clara del importe.

## Estado de la implementación

Ya están preparados el modelo inicial del ledger y la pantalla del saldo. También se agregó el modelo de direcciones por cuenta, pero todavía no se generan ni muestran direcciones: falta configurar el custodio y su derivación segura.

No se deben aceptar depósitos ni mostrar instrucciones de envío hasta completar:

- Estrategia de custodia y firma de retiros (KMS/HSM o proveedor custodial), controles de acceso, backups y recuperación.
- Derivación de direcciones por cuenta usando material público de derivación; las claves privadas nunca se guardan en PostgreSQL ni llegan al cliente.
- RPC de Base Sepolia, indexación/reintentos, profundidad de confirmaciones y conciliación/reorgs.
- Pruebas de punta a punta con transferencias pequeñas de testnet.
- Flujo de retiro a wallet propia con límites, confirmación y registros de auditoría.
- Revisión legal, contable y operativa antes de saldo utilizable fuera de pruebas.

## Rabby y visualización del token

Una dirección custodial de Tienda no aparece como cuenta del usuario en Rabby, porque el usuario no tiene sus claves. Rabby sirve como destino de un retiro posterior. Para ver tokens recibidos en una wallet propia, hay que seleccionar Base Sepolia y, si no aparece automáticamente, agregar el contrato ZAP como token personalizado.

## NFTs y futuro

Los NFTs quedan pendientes hasta definir contratos y reglas de custodia/uso. Base Mainnet usará configuración y contrato distintos; cualquier reconocimiento de saldos Sepolia se definirá aparte y no se promete ahora.
