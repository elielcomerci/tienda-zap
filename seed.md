# Tienda ZAP — Seed v1.0

## Especificación definitiva · FASE D

**Estado:** Diseño cerrado
**Fuente de verdad:** FASES A, B y C + `matrizdeproductos.md` cerrada
**Objetivo:** generar una fotografía inicial, reproducible e idempotente de la definición comercial de Tienda ZAP.

---

# 1. Principio rector

El Seed v1.0 no debe inventar catálogo, precios, configuradores, packs ni relaciones comerciales.

Debe representar exactamente lo que ZAP decidió vender en las FASES A, B y C.

> **El seed no define el negocio. El seed ejecuta la definición del negocio.**

Por lo tanto:

* no agrega Product Bases;
* no agrega rubros;
* no inventa necesidades;
* no infiere relaciones comerciales;
* no inventa precios;
* no inventa materiales;
* no inventa fórmulas de producción;
* no inventa packs;
* no crea configuradores para productos `CONSULTAR`;
* no convierte capacidades internas de ZAP en ofertas comerciales automáticamente.

---

# 2. Arquitectura

```text
prisma/
├── seed.ts
└── seed/
    ├── types/
    │   └── index.ts
    │
    ├── data/
    │   ├── 01-admin.ts
    │   ├── 02-business-types.ts
    │   ├── 03-situations.ts
    │   ├── 04-needs.ts
    │   ├── 05-products.ts
    │   ├── 06-configurators/
    │   │   ├── impresos-packaging.ts
    │   │   ├── presencia-fisica.ts
    │   │   ├── textil.ts
    │   │   ├── digital.ts
    │   │   └── campanas.ts
    │   ├── 07-offer-matrix.ts
    │   ├── 08-packs.ts
    │   └── 09-quoter-config.ts
    │
    ├── loaders/
    │   ├── 01-admin.ts
    │   ├── 02-business-types.ts
    │   ├── 03-situations.ts
    │   ├── 04-needs.ts
    │   ├── 05-products.ts
    │   ├── 06-configurators.ts
    │   ├── 07-offer-matrix.ts
    │   ├── 08-packs.ts
    │   └── 09-quoter-config.ts
    │
    └── audit/
        └── seed-audit.ts
```

### Separación de responsabilidades

`data/`

Define **qué existe**.

`loaders/`

Define **cómo se persiste en Prisma**.

`audit/`

Verifica que el estado resultante sea exactamente el esperado.

---

# 3. Idempotencia

El Seed debe poder ejecutarse repetidamente sin duplicar entidades.

Las entidades maestras deben utilizar `upsert` mediante identificadores estables, principalmente `slug`.

Nunca depender de IDs generados por Prisma.

No utilizar IDs hardcodeados.

Ejemplo conceptual:

```ts
await prisma.product.upsert({
  where: { slug: product.slug },
  update: product.data,
  create: product.data,
})
```

La ejecución N veces debe producir el mismo estado lógico que la primera ejecución.

---

# 4. Variables de entorno

El administrador inicial se configura mediante:

```env
SEED_ADMIN_EMAIL=
SEED_ADMIN_PASSWORD=
```

El seed no debe almacenar credenciales reales dentro del repositorio.

Si las variables no están presentes, el comportamiento debe ser explícito y controlado; no debe inventarse un usuario o contraseña.

---

# 5. Rubros

Deben existir exactamente estos 7:

| Slug                   | Nombre                 |
| ---------------------- | ---------------------- |
| `gastronomia`          | Gastronomía            |
| `moda-showrooms`       | Moda & Showrooms       |
| `inmobiliarias`        | Inmobiliarias          |
| `belleza-salud`        | Belleza & Salud        |
| `comercios-retail`     | Comercios & Retail     |
| `eventos-experiencias` | Eventos & Experiencias |
| `wellness`             | Wellness               |

No crear rubros adicionales.

---

# 6. Situaciones

Se cargan exactamente las situaciones definidas en:

```text
matrizdeproductos.md
```

El seed debe preservar:

* slug;
* nombre;
* orden;
* estado;
* cualquier otro campo editorial ya definido por el modelo.

No crear situaciones por inferencia.

La matriz editorial es la fuente de verdad.

---

# 7. Necesidades

Se cargan exactamente las necesidades definidas en:

```text
matrizdeproductos.md
```

Se preservan:

* slug;
* nombre;
* orden;
* estado;
* relaciones necesarias.

No crear necesidades adicionales porque exista un Product Base que podría resolverlas.

---

# 8. Product Bases

El universo v1.0 contiene exactamente 23 Product Bases. El catálogo persiste además 8 ofertas directas de diseño como productos complementarios; no se cuentan como Product Bases.

|  # | Product Base              | Modalidad    | Engine             |
| -: | ------------------------- | ------------ | ------------------ |
| 01 | Tarjetas & Vouchers       | CONFIGURABLE | IMPRESOS_PACKAGING |
| 02 | Flyers & Desplegables     | CONFIGURABLE | IMPRESOS_PACKAGING |
| 03 | Tags & Etiquetas          | CONFIGURABLE | IMPRESOS_PACKAGING |
| 04 | Adhesivos & Stickers      | CONFIGURABLE | IMPRESOS_PACKAGING |
| 05 | Fajas & Envoltorios       | CONFIGURABLE | IMPRESOS_PACKAGING |
| 06 | Bolsas & Contenedores     | CONFIGURABLE | IMPRESOS_PACKAGING |
| 07 | Cajas Personalizadas      | CONSULTAR    | —                  |
| 08 | Carpetas & Folders        | CONFIGURABLE | IMPRESOS_PACKAGING |
| 09 | Menús & Cartas            | CONFIGURABLE | IMPRESOS_PACKAGING |
| 10 | Individuales & Posavasos  | CONFIGURABLE | IMPRESOS_PACKAGING |
| 11 | Cartelería & Ploteo       | CONFIGURABLE | PRESENCIA_FISICA   |
| 12 | Corpóreos & Marquesinas   | CONFIGURABLE | PRESENCIA_FISICA   |
| 13 | Señalética & Placas       | CONFIGURABLE | PRESENCIA_FISICA   |
| 14 | Expositores & Stands      | CONFIGURABLE | PRESENCIA_FISICA   |
| 15 | Indumentaria & Textil     | CONFIGURABLE | TEXTIL             |
| 16 | Objetos & Regalería       | DIRECTO      | —                  |
| 17 | Activos Web & Sitios      | CONFIGURABLE | DIGITAL            |
| 18 | Asistentes & Bots         | CONFIGURABLE | DIGITAL            |
| 19 | Anuncios & Campañas       | CONFIGURABLE | CAMPANAS           |
| 20 | Producción Audiovisual    | CONSULTAR    | —                  |
| 21 | Sistema de Identidad      | CONSULTAR    | —                  |
| 22 | Operaciones & Consultoría | CONSULTAR    | —                  |
| 23 | Sistema de Captación para Eventos | CONSULTAR | — |

Las ocho ofertas directas de diseño adicionales son: Diseño de Flyer / Volante, Diseño de Cartel / Afiche, Diseño Pack de piezas para redes (10), Diseño de Cartelería / Rótulos, Diseño de Menú Gastronómico, Diseño de Vidriera, Diseño de Etiquetas y Diseño de Papelería Corporativa. Se persisten como productos `DIRECTO` complementarios y se relacionan con las Product Bases correspondientes; no se agregan automáticamente a la matriz editorial.

El catálogo contiene, por tanto, **31 registros de producto activos: 23 Product Bases y 8 productos directos complementarios**.

---

# 9. Datos iniciales de Product

Cada Product Base debe cargarse con los campos comerciales que ya existen en el modelo:

```text
slug
name
whatIs
purpose
includes
configurable
consultationNote
modality
engine
priceFrom
active
order
```

## Precios

No se inventan precios.

Cuando no exista un precio comercial validado:

```ts
priceFrom: null
```

Nunca:

```ts
priceFrom: 0
```

ni se deben convertir fórmulas conceptuales en precios comerciales.

---

# 10. Modalidad y Engine

La relación obligatoria es:

### CONFIGURABLE

Debe tener `engine`.

### DIRECTO

Debe tener:

```ts
engine: null
```

### CONSULTAR

Debe tener:

```ts
engine: null
```

La combinación debe ser validada automáticamente durante la auditoría.

---

# 11. Engines

El universo de engines está cerrado en cinco:

```text
IMPRESOS_PACKAGING
PRESENCIA_FISICA
TEXTIL
DIGITAL
CAMPANAS
```

No crear un sexto engine.

---

# 12. ConfiguratorVersion

Los configuradores se cargan como versiones explícitas.

Versión inicial:

```text
schemaVersion = "1.0"
```

Estado inicial:

```text
DRAFT
```

No se activa automáticamente un configurador por el mero hecho de existir.

La estructura es:

```text
ConfiguratorVersion
├── productId
├── schemaVersion
├── status
├── schema
├── compatibility
└── pricing
```

---

# 13. Regla fundamental de los configuradores

El Seed solamente debe cargar contenido que esté conceptualmente cerrado.

No inventar dentro de `schema`:

* materiales no confirmados;
* gramajes;
* medidas productivas;
* mínimos;
* técnicas;
* terminaciones;
* costos;
* tiempos;
* fórmulas;
* rendimientos;
* reglas de fabricación.

Si el contrato del configurador todavía no tiene valores comerciales definitivos, se puede cargar la estructura contractual inicial sin inventar opciones.

---

# 14. Motor IMPRESOS_PACKAGING

Aplica a:

1. Tarjetas & Vouchers
2. Flyers & Desplegables
3. Tags & Etiquetas
4. Adhesivos & Stickers
5. Fajas & Envoltorios
6. Bolsas & Contenedores
7. Carpetas & Folders
9. Menús & Cartas
10. Individuales & Posavasos

Dimensiones conceptuales comunes:

```text
Formato
Material
Impresión
Terminación
Cantidad
```

Las dimensiones concretas son Product Base-specific.

No forzar un schema idéntico para los nueve productos.

---

# 15. Motor PRESENCIA_FISICA

Aplica a:

11. Cartelería & Ploteo
12. Corpóreos & Marquesinas
13. Señalética & Placas
14. Expositores & Stands

Dimensiones conceptuales:

```text
Tipo / modelo
Medidas
Soporte / material
Gráfica / impresión
Estructura / terminación
Instalación / entrega
```

En Expositores & Stands debe mantenerse abierta la posibilidad de derivar a `CONSULTAR` cuando la complejidad supere una combinación reproducible.

---

# 16. Motor TEXTIL

Aplica a:

15. Indumentaria & Textil

Dimensiones conceptuales:

```text
Prenda
Variante
Color
Personalización
Talles
Extras
```

La personalización contempla conceptualmente:

```text
Técnica
Ubicación
```

La distribución de talles debe poder representar cantidades:

```text
S: 5
M: 12
L: 18
XL: 5
```

No inventar catálogo de prendas, técnicas o colores.

---

# 17. Motor DIGITAL

Aplica a:

17. Activos Web & Sitios
18. Asistentes & Bots

## Activos Web & Sitios

```text
Tipo de activo
Alcance
Funcionalidades
Integraciones
Contenido
Puesta en marcha
Soporte
```

## Asistentes & Bots

```text
Tipo
Canal
Objetivo
Conocimiento / fuentes
Acciones
Integraciones
```

No vender “IA” como producto aislado.

No inventar integraciones.

---

# 18. Motor CAMPANAS

Aplica a:

19. Anuncios & Campañas

Dimensiones:

```text
Objetivo
Canal / medio
Alcance
Piezas / contenidos
Inversión en medios
Duración / gestión
```

Debe mantenerse separado:

```text
Honorarios ZAP
+
Inversión en medios
+
Product Bases adicionales
```

No implementar en el seed una regla genérica de porcentaje sobre inversión publicitaria.

---

# 19. Productos CONSULTAR

No tienen `ConfiguratorVersion`.

### 07. Cajas Personalizadas

```text
modality = CONSULTAR
engine = null
```

### 20. Producción Audiovisual

```text
modality = CONSULTAR
engine = null
```

### 21. Sistema de Identidad

```text
modality = CONSULTAR
engine = null
```

### 22. Operaciones & Consultoría

```text
modality = CONSULTAR
engine = null
```

### 23. Sistema de Captación para Eventos

```text
modality = CONSULTAR
engine = null
```

No crear configuradores ficticios para estos productos.

---

# 20. Objetos & Regalería

El Product Base 16 es:

```text
DIRECTO
engine = null
```

Es el único Product Base que conserva la infraestructura:

```text
ProductOption
ProductOptionValue
ProductVariant
ProductVariantOption
OrderItemOption
```

Las variantes y opciones solamente deben cargarse si existe un catálogo real validado.

No inventar variantes.

---

# 21. OfferMatrixEntry

Es la relación comercial central:

```text
BusinessType
+
Situation
+
Need
+
Product
```

Cada combinación válida de la matriz se representa mediante:

```text
OfferMatrixEntry
```

La matriz debe ser una transcripción literal de:

```text
matrizdeproductos.md
```

No se deben inferir relaciones automáticamente.

---

# 22. Regla editorial de inclusión

Para cada relación debe cumplirse:

> ¿Por qué alguien que tiene esta necesidad consideraría razonablemente esta oferta?

Si la respuesta es solamente:

> Porque también hacemos eso.

la relación no debe existir.

Si ninguna oferta razonable resuelve la necesidad:

```text
Hablar con ZAP
```

o:

```text
Operaciones & Consultoría
```

cuando corresponda.

---

# 23. Correcciones editoriales obligatorias

Las cuatro correcciones ya incorporadas a la matriz deben aparecer exactamente así en `OfferMatrixEntry`.

### 23.1 Gastronomía

Situación:

```text
Quiero vender más en el local
```

Necesidad:

```text
Necesito que una propuesta se vea
```

Debe incluir:

```text
Menús & Cartas
Individuales & Posavasos
```

---

### 23.2 Gastronomía

Situación:

```text
Estoy por abrir
```

Necesidad:

```text
Necesito que el local se vea terminado y reconocible
```

No debe incluir:

```text
Flyers & Desplegables
```

---

### 23.3 Moda & Showrooms

Situación:

```text
Estoy por abrir
```

Necesidad:

```text
Necesito preparar materiales de venta
```

No debe incluir:

```text
Indumentaria & Textil
```

---

### 23.4 Wellness

Situación:

```text
Quiero llenar horarios
```

Necesidad:

```text
Necesito comunicar horarios y disponibilidad
```

No debe incluir:

```text
Tarjetas & Vouchers
```

---

# 24. Packs

El modelo de Packs existe, pero el catálogo comercial de Packs todavía no está cerrado.

Por lo tanto:

```ts
packs = []
```

y:

```ts
packItems = []
```

en Seed v1.0.

No crear packs hipotéticos.

Cuando sean definidos comercialmente, cada Pack podrá contener:

```text
slug
name
description
images
pricingMode
fixedPrice
discountPercent
active
order
businessTypes
items
```

Y cada `PackItem`:

```text
productId
quantity
presets
order
```

---

# 25. Costeo / ProductQuoterConfig

El seed no debe destruir ni reemplazar datos reales de costeo.

La infraestructura existente:

```text
RawMaterial
FinishingOperation
tiers
ProductQuoterConfig
```

se preserva.

Solamente se cargan o actualizan datos que estén efectivamente validados.

No inventar:

* materiales;
* costos;
* tiers;
* desperdicio;
* rendimiento;
* tiempos;
* fórmulas.

El configurador comercial y el motor de costos son capas separadas.

---

# 26. Orden de ejecución

El `seed.ts` ejecutará:

```text
1. Admin
2. BusinessTypes
3. Situations
4. Needs
5. Products
6. ConfiguratorVersions
7. OfferMatrixEntries
8. Packs
9. QuoterConfig
10. Audit
```

Cada loader debe completar su responsabilidad antes de que comience el siguiente.

---

# 27. Auditoría post-seed

La auditoría es obligatoria.

Debe fallar el Seed si encuentra cualquier inconsistencia.

## 27.1 Rubros

Verificar:

```text
cantidad = 7
```

Pero además comparar los **slugs esperados**, no solamente el count.

Debe detectar:

```text
faltante
extra
duplicado
slug incorrecto
```

---

# 28. Auditoría de Product Bases

Verificar:

```text
cantidad = 23
```

y además comparar contra el universo cerrado de 23 slugs.

Debe detectar:

```text
faltante
extra
duplicado
```

Tener 22 filas no es suficiente.

---

# 29. Auditoría de modalidad / engine

Para cada Product:

```text
CONFIGURABLE → engine obligatorio
DIRECTO      → engine null
CONSULTAR   → engine null
```

Además verificar que el engine corresponda exactamente al Product Base esperado.

Ejemplo:

```text
Tarjetas & Vouchers → IMPRESOS_PACKAGING
Cartelería & Ploteo → PRESENCIA_FISICA
Indumentaria & Textil → TEXTIL
Activos Web & Sitios → DIGITAL
Anuncios & Campañas → CAMPANAS
```

---

# 30. Auditoría de ConfiguratorVersion

Verificar:

* no existen configuradores para `DIRECTO`;
* no existen configuradores para `CONSULTAR`;
* todo `CONFIGURABLE` esperado tiene su versión inicial;
* `schemaVersion = "1.0"`;
* no existen productos con configuradores de otro engine;
* no existen configuradores apuntando a productos inexistentes;
* no existen versiones duplicadas para el mismo `(productId, schemaVersion)`.

La auditoría no debe exigir `ACTIVE` en v1.0 si los configuradores todavía están en desarrollo.

El estado inicial esperado es:

```text
DRAFT
```

---

# 31. Auditoría de OfferMatrixEntry

Esta es la auditoría más importante.

No alcanza con:

```text
count()
```

La auditoría debe construir la clave lógica:

```text
businessTypeSlug
|
situationSlug
|
needSlug
|
productSlug
```

para cada relación esperada y para cada relación existente.

Después comparar ambos conjuntos.

Debe detectar:

```text
MISSING
EXTRA
DUPLICATE
```

Resultado esperado:

```text
DB ↔ matriz editorial = coincidencia exacta
```

---

# 32. Auditoría de relaciones

Las FK ya garantizan integridad referencial en base de datos.

Por lo tanto, no se utilizará una consulta conceptual del tipo:

```ts
{ businessType: { is: null } }
```

para detectar huérfanos en relaciones obligatorias.

La auditoría comprobará la integridad mediante:

* FK de Prisma/PostgreSQL;
* existencia de los IDs referenciados;
* comparación contra las entidades esperadas;
* validación de las claves lógicas.

Para relaciones opcionales, sí se verificará que cualquier ID presente apunte a una entidad válida.

---

# 33. Auditoría de Packs

En v1.0:

```text
Pack = 0
PackItem = 0
```

Si aparecen Packs inesperados, la auditoría debe informarlo.

Cuando los Packs sean incorporados al catálogo definitivo, se actualizará el dataset y la auditoría correspondiente.

---

# 34. Auditoría de ProductQuoterConfig

No debe inventarse un número esperado de configuraciones si todavía no está cerrado el costeo.

La auditoría solamente debe verificar:

* integridad referencial;
* ausencia de configuraciones inválidas;
* coherencia con Product Bases existentes;
* preservación de datos previamente validados.

---

# 35. Resultado de auditoría

Si existen errores:

```text
throw new Error(...)
```

El proceso debe terminar con código de error.

Si todo coincide:

```text
🎉 Seed audit passed.
```

y mostrar un resumen similar a:

```text
Rubros:              7 / 7
Situaciones:         OK
Necesidades:         OK
Product Bases:       23 / 23
Productos de catálogo: 31 / 31
Configuradores:      OK
Offer Matrix:        EXACT MATCH
Packs:               0
Costeo:              OK
Orphans:             0
Unexpected active records: 0

FASE D SEED v1.0: OK
```

---

# 36. Prueba de idempotencia

Una vez implementado el Seed debe ejecutarse como mínimo dos veces consecutivas.

Primera ejecución:

```text
DB inicial → Seed → estado esperado
```

Segunda ejecución:

```text
estado esperado → Seed → mismo estado
```

La segunda ejecución no debe generar:

* duplicados;
* nuevas relaciones;
* nuevas versiones;
* nuevos rubros;
* nuevos productos;
* nuevos packs.

---

# 37. Secuencia de validación

El orden técnico posterior a la implementación será:

```text
1. Implementar archivos
2. Revisar diff
3. npx prisma validate
4. npx prisma format
5. npx prisma generate
6. db push / reset en DEV
7. ejecutar seed
8. ejecutar audit
9. ejecutar seed nuevamente
10. ejecutar audit nuevamente
11. comparar DB ↔ matriz
12. revisar resultado final
```

No ejecutar en producción directamente.

---

# 38. Límite de FASE D

FASE D queda conceptualmente cerrada cuando:

* schema está validado;
* seed está implementado;
* seed es idempotente;
* auditoría pasa;
* matriz y DB coinciden exactamente;
* existen exactamente 7 rubros;
* existen exactamente 23 Product Bases;
* existen exactamente 31 registros de producto activos, incluidas 8 ofertas directas de diseño complementarias;
* no existen entidades comerciales fuera del universo definido;
* configuradores respetan modalidad + engine;
* no existen packs ficticios;
* no existen precios ficticios;
* no existen relaciones inferidas;
* la segunda ejecución produce el mismo estado lógico.

---

# 39. Regla final

La base de datos resultante debe poder responder:

> **“¿Qué vende ZAP, para quién, en qué situación, para qué necesidad y bajo qué modalidad?”**

sin depender de lógica oculta en el frontend ni de relaciones heredadas del modelo anterior.

La respuesta debe estar representada por:

```text
BusinessType
      ↓
Situation
      ↓
Need
      ↓
OfferMatrixEntry
      ↓
Product Base
      ↓
Modality
      ↓
ConfiguratorVersion
```

y, cuando corresponda:

```text
Product Base
      ↓
Configurator
      ↓
Configuration
      ↓
Price / Quote
```

El Seed v1.0 no debe resolver todavía aquello que deliberadamente quedó para fases posteriores.

**Su función es dejar la base limpia, coherente, reproducible y fiel a la definición comercial cerrada.**
