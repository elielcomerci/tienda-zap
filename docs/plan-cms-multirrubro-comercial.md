# Plan para convertir la base en CMS multirrubro comercial

Este documento separa dos objetivos:

- `tienda zap`: sitio actual de ZAP, orientado a imprenta/grafica, con catalogo real propio.
- Nuevo producto comercial: CMS/ecommerce multirrubro moderno, instalable y adaptable para indumentaria, ferreteria, almacen, pizzeria, servicios, imprenta u otros rubros.

La idea es no seguir forzando este repo para todos los casos. Este repo queda como implementacion vertical de ZAP. El CMS comercial deberia nacer en un repositorio especifico, tomando aprendizajes y componentes de esta base.

## Principio rector

El core no debe asumir imprenta.

Imprenta debe ser una vertical mas, igual que indumentaria, gastronomia, ferreteria o almacen. Todo comportamiento especifico debe vivir como modulo, plantilla o configuracion.

## Cambios necesarios para el CMS completo

### 1. Modelo multirrubro

Crear una capa de configuracion por tienda:

- datos comerciales;
- logo, colores, tipografia y dominio;
- moneda;
- unidades habilitadas;
- metodos de entrega;
- metodos de pago;
- rubro principal;
- modulos activos.

Modulos sugeridos:

- productos simples;
- variantes;
- stock;
- archivos de impresion/diseno;
- brief de diseno;
- mockup de indumentaria;
- cotizador por materiales;
- combos;
- cupones;
- seller/referidos;
- credito/financiacion;
- delivery/retiro;
- reservas/turnos;
- carta/menu gastronomico.

### 2. Productos universales

El producto debe soportar:

- unidad base: unidad, kg, g, litro, ml, cm3, metro, cm, m2, pack, caja, personalizado;
- variantes libres;
- atributos custom;
- precio fijo o calculado;
- stock opcional;
- imagenes por variante;
- archivos opcionales;
- brief opcional;
- tipo fisico, digital o servicio;
- reglas de compra minima/maxima;
- visibilidad por canal o rubro.

No deberia haber campos obligatorios ligados a grafica, papel, impresion o terminacion.

### 3. Plantillas de producto completas

Las plantillas no deberian ser solo opciones/variantes. Deberian poder crear un producto casi completo:

- nombre sugerido;
- categoria sugerida;
- descripcion base;
- unidad;
- opciones;
- variantes;
- imagen placeholder;
- reglas de stock;
- reglas de archivo;
- brief;
- cotizador;
- textos publicos;
- comportamiento de checkout.

Verticales iniciales:

- imprenta/grafica;
- indumentaria;
- ferreteria;
- almacen/kiosco;
- gastronomia/pizzeria;
- servicios profesionales.

Ejemplos:

- Remera personalizada: color, talle, tecnica, ubicacion, mockup, archivo/diseno listo.
- Producto por kilo: peso, pack, stock por unidad comercial.
- Producto por litro: presentacion, envase, sabor/aroma.
- Pizza: tamano, masa, gustos, adicionales, delivery/retiro.
- Ferreteria: medida, material, largo, pack, marca.
- Tarjeta personal: formato, papel, impresion, terminacion, cantidad.

### 4. Admin tipo CMS

El admin debe sentirse como un constructor, no como un panel tecnico.

Flujos necesarios:

- asistente para crear tienda;
- asistente para crear producto desde plantilla;
- editor visual de home;
- editor de categorias;
- editor de tema;
- gestor de menus/secciones;
- gestor de banners/campanas;
- configuracion de checkout;
- configuracion de notificaciones;
- permisos por rol.

Complejidad avanzada debe quedar oculta:

- nombres internos de opciones;
- reglas de cotizador;
- areas de impresion;
- IDs tecnicos;
- JSON/configuracion cruda.

### 5. Theming y constructor visual

El CMS comercial necesita sistema de tema:

- logo;
- paleta;
- tipografia;
- radio de bordes;
- estilo de botones;
- layout de home;
- secciones activas;
- cards de producto;
- header/footer;
- banners;
- paginas institucionales.

Deberia soportar presets:

- tienda compacta;
- restaurante/menu;
- indumentaria visual;
- grafica/cotizador;
- mayorista;
- servicios.

### 6. Multi-tenant o instancia por tienda

Definir estrategia antes de empezar:

Opcion A: multi-tenant en una sola app.

- Una base compartida con `tenantId`.
- Mejor para operar SaaS.
- Mas compleja en seguridad y aislamiento.

Opcion B: instancia por cliente.

- Repo/app desplegable por tienda.
- Mas simple para personalizar.
- Mejor si se vende como implementacion administrada.

Para una primera version comercial, conviene instancia por cliente o multi-tenant simple con aislamiento estricto desde el inicio.

### 7. Suscripciones y licenciamiento

El CMS debe validar si una tienda tiene suscripcion activa.

La validacion deberia vivir fuera de la tienda, en un servicio central de licencias/suscripciones.

#### API propuesta: chequear suscripcion activa

Endpoint desde la tienda hacia el servicio central:

```http
POST /api/licenses/check
Content-Type: application/json
Authorization: Bearer <server_license_secret>
```

Body:

```json
{
  "storeId": "store_123",
  "domain": "cliente.com",
  "installationId": "inst_abc",
  "appVersion": "1.0.0"
}
```

Respuesta activa:

```json
{
  "active": true,
  "status": "ACTIVE",
  "plan": "PRO",
  "expiresAt": "2026-06-23T00:00:00.000Z",
  "features": [
    "products",
    "variants",
    "coupons",
    "mockups",
    "seller",
    "custom_domain"
  ],
  "limits": {
    "products": 1000,
    "storageMb": 10240,
    "admins": 5
  }
}
```

Respuesta inactiva:

```json
{
  "active": false,
  "status": "PAST_DUE",
  "plan": "PRO",
  "expiresAt": "2026-05-20T00:00:00.000Z",
  "features": [],
  "limits": {
    "products": 0,
    "storageMb": 0,
    "admins": 1
  },
  "message": "La suscripcion no esta activa."
}
```

Estados sugeridos:

- `TRIAL`;
- `ACTIVE`;
- `PAST_DUE`;
- `CANCELED`;
- `SUSPENDED`;
- `EXPIRED`.

#### Uso dentro de la tienda

La tienda deberia chequear licencia:

- al iniciar sesion en admin;
- antes de guardar productos;
- antes de procesar checkout, si el plan esta suspendido;
- en tareas cron;
- con cache corto para no depender de red en cada request.

Cache recomendado:

- guardar ultima respuesta valida por 15 a 60 minutos;
- permitir modo gracia si el servicio central esta caido;
- bloquear cambios administrativos si la licencia vencio hace mas de X dias;
- nunca exponer `server_license_secret` al cliente/browser.

#### Endpoint interno opcional en cada tienda

```http
GET /api/subscription/status
```

Respuesta:

```json
{
  "active": true,
  "status": "ACTIVE",
  "plan": "PRO",
  "checkedAt": "2026-05-23T12:00:00.000Z"
}
```

Este endpoint sirve para que el admin muestre banners como:

- prueba gratis activa;
- pago pendiente;
- tienda suspendida;
- limite de productos alcanzado.

### 8. Seguridad y operacion

Antes de comercializar:

- roles claros: owner, admin, seller, operador;
- auditoria de acciones;
- backups;
- limites de upload;
- validacion de archivos;
- logs de errores;
- rate limit en endpoints sensibles;
- proteccion de webhooks;
- separacion de secrets por tienda;
- monitoreo de pagos y checkout.

### 9. Migracion desde este repo

Partes reutilizables:

- modelo de productos y variantes;
- carrito;
- checkout;
- ordenes;
- cupones;
- seller;
- mockup de indumentaria;
- cotizador;
- uploads;
- panel admin como referencia.

Partes a desacoplar:

- textos y branding ZAP;
- categorias de imprenta;
- supuestos de archivos graficos;
- auditorias y seeds especificos;
- combos propios de ZAP;
- integraciones comerciales particulares.

### 10. Roadmap sugerido

1. Crear repo nuevo del CMS comercial.
2. Definir modelo `Store/Tenant`.
3. Extraer core de productos, variantes, carrito y ordenes.
4. Crear sistema de modulos activables.
5. Crear plantillas completas por vertical.
6. Crear theming basico.
7. Implementar API de suscripcion/licencia.
8. Crear demo multirrubro.
9. Documentar instalacion y onboarding.
10. Recién despues migrar clientes reales.

## Criterio de listo

El CMS comercial esta listo para vender cuando se pueda crear una tienda nueva sin tocar codigo y configurar:

- una indumentaria;
- una ferreteria;
- un almacen;
- una pizzeria;
- una imprenta;

con productos, variantes, checkout, pedidos y administracion funcionando desde el panel.
