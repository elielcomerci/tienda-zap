# Alta de NODO ZAP desde el área de clientes

## Flujo local implementado

1. Una persona con sesión de cliente abre `/perfil/nodo/configuracion` sin tener una cuenta fiscal vinculada.
2. Tienda consulta `POST /api/nodo/onboarding/padron`. El endpoint verifica la sesión, aplica el límite por cliente y reenvía la CUIT al endpoint interno de padrón del Worker usando `PUBLIC_PADRON_BACKEND_SECRET` solo en el servidor.
3. Para verificar los datos registrales del cliente durante el alta, la tienda consulta el padrón en producción (ARCA PROD) usando exclusivamente la identidad de plataforma configurada en el Worker. Esta habilitación se limita a `POST /internal/public/padron/consultas`: no cambia el ambiente TEST del cliente ni habilita sus consultas fiscales privadas, emisión, anulación u otras operaciones en PROD. El Worker permite autocompletar razón social y estado registral; no se exponen domicilio ni la respuesta SOAP completa. La consulta no usa el certificado ni el tenant fiscal del cliente.
4. La ruta de padrón firma la razón social devuelta por el Worker con una prueba de 10 minutos vinculada a la sesión y la CUIT. Al confirmar, `POST /api/nodo/onboarding` valida esa prueba y usa el nombre firmado; si se optó por carga manual, usa el valor ingresado.
5. El alta crea un tenant con el plan FREE, guarda su clave de API cifrada en Tienda y vincula la primera CUIT en TEST.
5. La asociación empieza como `PENDING`. El alta no crea ni activa certificados, no delega servicios en ARCA y no habilita la emisión.

## Controles

- Tras cargar el certificado propio de la cuenta y autorizar `wsfe` en ARCA/WSASS, el cliente puede llamar `POST /v1/contributors/{cuit}/wsfe/connection-check?environment=TEST|PROD` desde el panel. Valida WSAA y consulta puntos de venta en WSFE sin emitir. Solo una respuesta funcional de WSFE activa `canEmit` y `canViewHistory` para ese tenant, CUIT y ambiente; `canVoid` y `canQueryPadron` siguen independientes.

- La clave del Worker y la clave de padrón no llegan al navegador.
- La operación requiere un usuario `CUSTOMER` activo.
- `accountProvisioning` mantiene el alta cerrada hasta que ZAP la habilite.
- El slug del tenant deriva de un hash estable del usuario, de modo que un reintento tras perder la respuesta puede recuperar el tenant ya creado.
- Tienda cifra la clave del tenant antes de persistirla y nunca la devuelve en la respuesta.
- El Worker sigue aplicando sus límites de solicitudes y sus reglas de autorización por tenant y CUIT.

## Configuración necesaria en Tienda

- `FISCAL_WORKER_URL`
- `PUBLIC_PADRON_BACKEND_SECRET` (debe coincidir con el secreto dedicado del Worker)
- `FISCAL_WORKER_PROVISIONING_SECRET`
- `FISCAL_WORKER_INTERNAL_SECRET`
- `FISCAL_CREDENTIALS_ENCRYPTION_KEY`
- `AUTH_SECRET` o `NEXTAUTH_SECRET`

## Pendiente antes de habilitar

- Los cupos de comprobantes, padrón y otros requests son incluidos, no cortes: al superarlos el Worker mantiene la operación y registra `overage`. Tienda muestra las tres categorías por separado, pero no calcula cargos hasta definir tarifa y regularización. El rate limit por minuto es independiente.

- Probar `connection-check` con un certificado de homologación autorizado y confirmar que valida sin emitir y que el permiso queda limitado a tenant, CUIT y ambiente.
- Confirmar que `PUBLIC_PADRON_BACKEND_SECRET` coincide entre Vercel Production y Cloudflare Workers production. Si no se puede confirmar, rotarlo en ambos servicios y desplegar el Worker. Mantener habilitado únicamente `PUBLIC_PADRON_ENABLED` para esta ruta; las operaciones privadas de cada cliente conservan sus controles independientes.
- Ejecutar una prueba controlada de la consulta compartida de padrón en producción y del alta completa en homologación. La consulta de producción usa la identidad de plataforma y requiere que su tenant, CUIT representada y autorización/certificado de ARCA PROD estén operativos.
- Resolver conciliación cuando el Worker crea el tenant y Tienda no alcanza a guardar la cuenta. El slug estable permite recuperar el tenant, pero puede dejar una clave inicial desconocida hasta que se cree otra.
- Se permite que el mismo contribuyente aparezca en varias cuentas Tienda. Cada cuenta crea su tenant y asociación propios; el Worker filtra trabajos y permisos por tenant, y los certificados registran el tenant que los cargó. Cada cuenta debe cargar su propio certificado vigente y completar su propia autorización de ARCA para el servicio y ambiente que usará. Un certificado de otra cuenta no satisface este requisito ni se comparte. Una asociación por sí sola no concede autorización ni habilita emisión o consultas fiscales privadas.
- El padrón público devuelve hoy solo razón social y estado registral. No completa domicilio ni condición IVA; extender esos datos requiere revisar el contrato y el allowlist de privacidad del endpoint.
- Revisar cuotas y continuidad. Los excedentes de comprobantes, padron y requests de otros servicios se registran sin corte; las tarifas y la regularizacion siguen pendientes.
- `PUBLIC_PADRON_BACKEND_SECRET` no está detectado en los archivos `.env*` locales de `tienda-zap`; debe estar configurado en el entorno donde se ejecuten las rutas para que la consulta funcione.
