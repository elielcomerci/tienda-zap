# Tienda ZAP — Arquitectura Comercial y Configuradores

**Versión:** 1.0
**Estado:** Fuente de verdad previa a FASE D — Prisma
**Alcance:** FASE A → FASE B → FASE C

---

# 0. Principio rector

La tienda ZAP no organiza su oferta solamente como un catálogo de productos.

La arquitectura comercial parte de:

**Rubro → Situación → Necesidad → Oferta**

y permite también una segunda entrada directa:

**Catálogo → Product Base → Configurador → Precio → Carrito**

La navegación por contexto ayuda al cliente a descubrir qué necesita.

El catálogo permite comprar directamente cuando ya sabe qué busca.

Ambos caminos terminan en la misma entidad comercial: **Product Base**.

---

# 1. Conceptos fundamentales

## 1.1 Rubro

Contexto comercial desde el cual se presenta la oferta.

Los siete rubros definidos son:

1. Gastronomía
2. Moda & Showrooms
3. Inmobiliarias
4. Belleza & Salud
5. Comercios & Retail
6. Eventos & Experiencias
7. Wellness

Un Product Base puede pertenecer a múltiples rubros.

No se duplica el producto para cada rubro.

---

## 1.2 Situación

Describe un contexto concreto dentro de un rubro.

La situación ayuda a que el cliente se reconozca antes de llegar a una necesidad concreta.

---

## 1.3 Necesidad

Es el problema, objetivo o necesidad comercial que origina la búsqueda.

La matriz de necesidades funciona como **fuente de verdad comercial**.

---

## 1.4 Product Base

Un Product Base representa una **familia comercial de productos o servicios**.

No es necesariamente un SKU ni una configuración final.

Ejemplo:

> Tarjetas & Vouchers

es un Product Base.

Una tarjeta de 9 × 5 cm, impresión 4/4, laminado mate y 500 unidades es una **configuración** de ese Product Base.

Un mismo Product Base puede estar relacionado con múltiples necesidades y rubros.

---

# 2. Regla de separación comercial

La matriz comercial y el inventario cumplen funciones diferentes.

### Matriz

Define:

> qué oferta debería existir para resolver las necesidades detectadas.

### Inventario

Define:

> qué productos, materiales, insumos y servicios están actualmente disponibles.

Por lo tanto:

**la matriz es la autoridad comercial.**

El inventario no limita la definición conceptual de la oferta.

Si aparece una necesidad sin una oferta adecuada, puede crearse un nuevo Product Base.

---

# 3. FASE A — Universo de Product Bases

La FASE A define el universo inicial de Product Bases.

## 3.1 Product Bases v1.0

### Impresos & Packaging

1. **Tarjetas & Vouchers**
2. **Flyers & Desplegables**
3. **Tags & Etiquetas**
4. **Adhesivos & Stickers**
5. **Fajas & Envoltorios**
6. **Bolsas & Contenedores**
7. **Cajas Personalizadas**
8. **Carpetas & Folders**
9. **Menús & Cartas**
10. **Individuales & Posavasos**

### Presencia Física

11. **Cartelería & Ploteo**
12. **Corpóreos & Marquesinas**
13. **Señalética & Placas**
14. **Expositores & Stands**

### Textil

15. **Indumentaria & Textil**

### Productos directos

16. **Objetos & Regalería**

### Digital

17. **Activos Web & Sitios**
18. **Asistentes & Bots**

### Campañas

19. **Anuncios & Campañas**

### Servicios / proyectos

20. **Producción Audiovisual**
21. **Sistema de Identidad**
22. **Operaciones & Consultoría**

---

# 4. Modalidades comerciales

Cada Product Base pertenece conceptualmente a una de tres modalidades.

## DIRECTO

Producto relativamente simple.

Puede comprarse sin un configurador complejo.

Ejemplo:

> Objetos & Regalería.

---

## CONFIGURABLE

Producto con variables que pueden ser seleccionadas por el cliente y resueltas mediante reglas.

Ejemplos:

> Tarjetas & Vouchers
> Cartelería & Ploteo
> Indumentaria & Textil
> Activos Web & Sitios

---

## CONSULTAR

Producto o servicio cuya complejidad no permite una cotización reproducible mediante un configurador estándar.

Ejemplos:

> Producción Audiovisual
> Sistema de Identidad
> Operaciones & Consultoría

La modalidad `CONSULTAR` no representa una falla del sistema.

Es una salida comercial válida.

---

# 5. Clasificación completa v1.0

| #  | Product Base              | Modalidad                              | Motor              |
| -- | ------------------------- | -------------------------------------- | ------------------ |
| 01 | Tarjetas & Vouchers       | CONFIGURABLE                           | IMPRESOS_PACKAGING |
| 02 | Flyers & Desplegables     | CONFIGURABLE                           | IMPRESOS_PACKAGING |
| 03 | Tags & Etiquetas          | CONFIGURABLE                           | IMPRESOS_PACKAGING |
| 04 | Adhesivos & Stickers      | CONFIGURABLE                           | IMPRESOS_PACKAGING |
| 05 | Fajas & Envoltorios       | CONFIGURABLE                           | IMPRESOS_PACKAGING |
| 06 | Bolsas & Contenedores     | CONFIGURABLE                           | IMPRESOS_PACKAGING |
| 07 | Cajas Personalizadas      | CONFIGURABLE                           | IMPRESOS_PACKAGING |
| 08 | Carpetas & Folders        | CONFIGURABLE                           | IMPRESOS_PACKAGING |
| 09 | Menús & Cartas            | CONFIGURABLE                           | IMPRESOS_PACKAGING |
| 10 | Individuales & Posavasos  | CONFIGURABLE                           | IMPRESOS_PACKAGING |
| 11 | Cartelería & Ploteo       | CONFIGURABLE                           | PRESENCIA_FISICA   |
| 12 | Corpóreos & Marquesinas   | CONFIGURABLE                           | PRESENCIA_FISICA   |
| 13 | Señalética & Placas       | CONFIGURABLE                           | PRESENCIA_FISICA   |
| 14 | Expositores & Stands      | CONFIGURABLE                           | PRESENCIA_FISICA   |
| 15 | Indumentaria & Textil     | CONFIGURABLE                           | TEXTIL             |
| 16 | Objetos & Regalería       | DIRECTO                                | —                  |
| 17 | Activos Web & Sitios      | CONFIGURABLE                           | DIGITAL            |
| 18 | Asistentes & Bots         | CONFIGURABLE / CONSULTAR según alcance | DIGITAL            |
| 19 | Anuncios & Campañas       | CONFIGURABLE                           | CAMPAÑAS           |
| 20 | Producción Audiovisual    | CONSULTAR                              | —                  |
| 21 | Sistema de Identidad      | CONSULTAR                              | —                  |
| 22 | Operaciones & Consultoría | CONSULTAR                              | —                  |

---

# 6. Casos que NO son Product Bases independientes

## Análisis de Datos

No es un Product Base independiente.

Es una capacidad transversal que puede formar parte de:

* 17. Activos Web & Sitios
* 18. Asistentes & Bots
* 19. Anuncios & Campañas
* 22. Operaciones & Consultoría cuando forma parte de un diagnóstico integral

---

## Packs / Presets

No son productos duplicados.

Son composiciones de Product Bases existentes.

Un pack puede agrupar:

> Producto A + Producto B + Producto C

sin crear tres versiones nuevas de cada producto.

---

# 7. FASE B — Relación comercial

La FASE B conecta:

**Rubro ↔ Situación ↔ Necesidad ↔ Product Base**

El mismo Product Base puede resolver necesidades diferentes.

La misma necesidad puede resolverse mediante más de un Product Base.

La relación no debe generar duplicados.

---

# 8. Principio de descubrimiento

La experiencia de descubrimiento sigue:

```text
RUBRO
  ↓
SITUACIÓN
  ↓
NECESIDAD
  ↓
OFERTA
  ↓
PRODUCT BASE
```

Ejemplo conceptual:

```text
Gastronomía
→ Quiero que mi local se vea mejor
→ Necesito mejorar la presencia física
→ Cartelería & Ploteo
```

El contexto comercial cambia.

El Product Base no.

---

# 9. FASE C — Configuradores

Los Product Bases configurables se agrupan en cinco motores conceptuales.

## Motores

1. `IMPRESOS_PACKAGING`
2. `PRESENCIA_FISICA`
3. `TEXTIL`
4. `DIGITAL`
5. `CAMPAÑAS`

No existe un sexto motor audiovisual.

Los productos complejos se mantienen como `CONSULTAR`.

---

# 10. Arquitectura general de un configurador

Todo configurador debe separar cuatro responsabilidades:

### Schema

Define:

> qué puede elegir el cliente.

### Compatibilidad

Define:

> qué combinaciones son válidas.

### Pricing / Output

Define:

> cómo una configuración válida se convierte en precio, presupuesto o consulta.

### Snapshot

Conserva:

> exactamente qué compró o configuró el cliente.

El frontend no es autoridad comercial.

El backend valida la configuración y calcula el resultado.

---

# 11. Motor 01 — IMPRESOS_PACKAGING

Cubre Product Bases 01–10.

## Núcleo conceptual

1. Formato
2. Material
3. Impresión
4. Terminación
5. Cantidad

No todas las variables aplican idénticamente a todos los productos.

Los atributos específicos pertenecen al Product Base.

---

## 11.1 Product Bases

### 01. Tarjetas & Vouchers

Variables posibles:

* formato
* material
* impresión
* terminación
* cantidad

---

### 02. Flyers & Desplegables

Variables posibles:

* formato
* plegado
* material
* impresión
* terminación
* cantidad

---

### 03. Tags & Etiquetas

Variables posibles:

* formato
* corte
* material
* impresión
* terminación
* accesorios
* cantidad

---

### 04. Adhesivos & Stickers

Variables posibles:

* formato
* soporte
* impresión
* corte
* laminado
* cantidad

---

### 05. Fajas & Envoltorios

Variables posibles:

* dimensiones
* modalidad de corte
* material
* impresión
* cierre
* terminación
* cantidad

---

### 06. Bolsas & Contenedores

Variables posibles:

* modelo
* dimensiones
* material
* impresión
* manijas / accesorios
* estructura
* cantidad

---

### 07. Cajas Personalizadas

Variables posibles:

* modelo
* dimensiones
* material
* impresión
* estructura
* terminación
* cantidad

---

### 08. Carpetas & Folders

Variables posibles:

* formato
* estructura
* material
* impresión
* bolsillo / troquel
* terminación
* cantidad

---

### 09. Menús & Cartas

Variables posibles:

* formato
* estructura
* material
* impresión
* encuadernación
* protección
* cantidad

---

### 10. Individuales & Posavasos

Variables posibles:

* producto
* formato
* material
* impresión
* corte
* terminación
* cantidad

---

## 11.2 Reglas conceptuales de compatibilidad

Ejemplos definidos para el motor:

* determinadas terminaciones requieren soportes compatibles;
* determinados cortes requieren soporte adecuado;
* determinados materiales limitan impresión y terminación;
* determinadas estructuras requieren hendido/plegado;
* determinadas combinaciones de material + impresión + terminación son inválidas.

Las reglas concretas de producción deben validarse contra el inventario y proceso real de ZAP antes de implementación.

---

## 11.3 Pricing

El precio debe poder considerar:

* preparación / setup
* material
* impresión
* terminaciones
* cantidad
* escalas de volumen
* otros costos productivos que correspondan

No se congela todavía una fórmula matemática definitiva.

---

# 12. Motor 02 — PRESENCIA_FISICA

Cubre Product Bases 11–14.

## Núcleo conceptual

1. Tipo / modelo
2. Medidas
3. Soporte / material
4. Gráfica / impresión
5. Estructura / terminación
6. Instalación / entrega

No todos los Product Bases utilizan las seis dimensiones.

---

## 12.1 Cartelería & Ploteo

Puede contemplar:

* tipo
* ancho
* alto
* material
* gráfica
* terminación
* instalación

El sistema puede calcular superficie a partir de las medidas.

---

## 12.2 Corpóreos & Marquesinas

Puede contemplar:

* tipo
* dimensiones
* material
* espesor / volumen
* terminación
* estructura
* iluminación
* instalación

La iluminación solo debe aparecer cuando exista realmente como opción productiva.

---

## 12.3 Señalética & Placas

Puede contemplar:

* tipo
* medidas
* material
* gráfica
* fijación
* cantidad
* instalación

---

## 12.4 Expositores & Stands

Puede contemplar:

* tipo
* medidas
* estructura
* gráfica
* accesorios
* armado
* entrega
* instalación

Tiene un límite natural de configuración.

Un proyecto que requiera diseño estructural, ingeniería o una composición altamente personalizada puede derivar a `CONSULTAR`.

---

## 12.5 Pricing

No existe una fórmula universal.

Puede utilizarse:

* superficie
* unidad
* dimensiones
* componentes
* estructura
* accesorios
* instalación

según el Product Base.

---

# 13. Motor 03 — TEXTIL

Cubre Product Base 15.

## Núcleo

1. Prenda
2. Variante
3. Color
4. Personalización
5. Talles
6. Extras

---

## 13.1 Prenda

Define qué se compra:

* remera
* buzo
* campera
* chomba
* gorra
* delantal
* uniforme
* etc.

La lista definitiva depende de la oferta real.

---

## 13.2 Personalización

Debe separar:

### Técnica

Ejemplo conceptual:

* estampado
* bordado
* sublimación
* vinilo textil

### Ubicación

Ejemplo:

* frente
* dorso
* frente + dorso
* manga

Las técnicas disponibles deben depender del producto.

---

## 13.3 Talles

La cantidad debe poder distribuirse por talle.

Ejemplo:

```text
S  → 5
M  → 12
L  → 18
XL → 5
```

El backend calcula:

```text
cantidad total = 40
```

El snapshot conserva la distribución original.

---

## 13.4 Pricing

Puede depender de:

* prenda
* técnica
* ubicaciones
* cantidad
* extras
* volumen

La fórmula definitiva queda para la implementación comercial.

---

# 14. Motor 04 — DIGITAL

Cubre Product Bases 17–18.

## Núcleo general

1. Tipo de activo
2. Alcance
3. Funcionalidades
4. Integraciones
5. Contenido
6. Puesta en marcha / soporte

---

# 15. Activos Web & Sitios

Puede contemplar:

* tipo de sitio
* alcance
* funcionalidades
* integraciones
* contenido
* publicación
* servicios asociados

Ejemplos conceptuales:

* landing
* sitio institucional
* catálogo
* tienda
* micrositio

No debe intentar cotizar automáticamente cualquier desarrollo a medida.

---

# 16. Asistentes & Bots

Puede contemplar:

1. tipo
2. canal
3. objetivo
4. conocimiento / fuentes
5. acciones
6. integraciones

La lógica comercial parte de:

> **qué tiene que hacer el asistente**

y no simplemente de:

> “usar IA”.

---

# 17. Regla DIGITAL — Configurable vs Consultar

Es configurable cuando existe una combinación reproducible de:

* tipo
* alcance
* funcionalidades
* integraciones
* contenido

Pasa a consulta cuando requiere:

* arquitectura específica
* desarrollo a medida
* integraciones no estándar
* lógica empresarial compleja
* múltiples sistemas
* requerimientos fuera del schema existente

---

# 18. Costos recurrentes digitales

El modelo debe distinguir:

**precio inicial**

de:

**costo recurrente**.

Ejemplos posibles:

* hosting
* mantenimiento
* servicios externos
* operación

No deben mezclarse automáticamente con el precio inicial de desarrollo.

---

# 19. Motor 05 — CAMPAÑAS

Cubre Product Base 19.

## Núcleo

1. Objetivo
2. Canal / medio
3. Alcance
4. Piezas / contenidos
5. Inversión en medios
6. Duración / gestión

---

# 20. Objetivo

Debe ser una variable inicial.

Ejemplos conceptuales:

* reconocimiento
* alcance
* tráfico
* consultas
* leads
* ventas
* lanzamiento
* promoción
* remarketing

La lista definitiva dependerá de la oferta real.

---

# 21. Canal

Puede contemplar medios disponibles para ZAP.

El canal condiciona:

* formatos
* piezas
* configuraciones
* compatibilidades

No se debe asumir que cualquier plataforma estará disponible.

---

# 22. Servicio ZAP vs inversión publicitaria

Deben ser conceptos independientes.

### Servicio ZAP

Puede incluir:

* estrategia
* concepto
* creatividad
* producción
* configuración
* gestión
* optimización
* reportes

### Inversión en medios

Es:

> dinero destinado a las plataformas / medios.

No debe confundirse con margen ni honorarios de ZAP.

---

# 23. Productos adicionales

Una campaña puede necesitar otros Product Bases.

Ejemplo:

```text
Anuncios & Campañas
+
Activos Web & Sitios
+
Producción Audiovisual
```

No se crean duplicados como:

> “Landing para campaña”

o:

> “Video para campaña”.

Se reutilizan los Product Bases existentes.

---

# 24. FASE C — Resultado consolidado

| Motor              | Product Bases | Lógica                                                          |
| ------------------ | ------------- | --------------------------------------------------------------- |
| IMPRESOS_PACKAGING | 01–10         | formato → material → impresión → terminación → cantidad         |
| PRESENCIA_FISICA   | 11–14         | tipo → medidas → soporte → gráfica → estructura → instalación   |
| TEXTIL             | 15            | prenda → variante → color → personalización → talles → cantidad |
| —                  | 16            | DIRECTO                                                         |
| DIGITAL            | 17–18         | tipo → alcance → funcionalidades → integraciones → contenido    |
| CAMPAÑAS           | 19            | objetivo → canal → alcance → piezas → pauta → gestión           |
| —                  | 20–22         | CONSULTAR                                                       |

---

# 25. Configuración vs consulta

Regla transversal:

> **Si podemos describir una oferta mediante un conjunto reproducible de variables y reglas, se configura.**

> **Si primero necesitamos descubrir qué hay que construir, producir o resolver, se consulta.**

El configurador nunca debe inventar una precisión que ZAP no puede sostener comercialmente.

---

# 26. Pricing — principio transversal

El precio no debe ser responsabilidad del frontend.

La arquitectura conceptual es:

```text
Configuración
     ↓
Validación
     ↓
Pricing / Output
     ↓
Precio / Presupuesto / Consulta
```

El cálculo puede variar por motor y Product Base.

No se debe forzar una única fórmula de pricing para toda la tienda.

---

# 27. Compatibility Rules

Las reglas de compatibilidad pertenecen al dominio comercial/técnico del configurador.

Ejemplos:

```text
Producto
→ Material válido
→ Impresión válida
→ Terminación válida
```

o:

```text
Producto
→ Canal
→ Formato
→ Integración
```

El frontend puede ocultar opciones incompatibles, pero:

> **el backend siempre vuelve a validar.**

Nunca se confía en la interfaz para garantizar una configuración válida.

---

# 28. Configuration Snapshot

Cada compra configurable debe conservar el estado exacto de la configuración.

Conceptualmente:

```json
{
  "motor": "...",
  "productBaseSlug": "...",
  "schemaVersion": "1.0",
  "selections": {},
  "pricingCalculated": {},
  "artworkSubmitted": {}
}
```

El snapshot es histórico.

No debe depender de que el producto siga teniendo exactamente el mismo schema en el futuro.

Esto permite reconstruir:

> qué configuró y compró el cliente en ese momento.

---

# 29. Versionado

Los configuradores deben tener versión.

Ejemplo:

```text
schemaVersion: 1.0
```

Si el schema cambia sustancialmente:

```text
1.1
2.0
```

etc.

Una orden histórica conserva su versión original.

---

# 30. Archivos / Artwork

Cuando un producto requiere archivo del cliente, el archivo forma parte del estado de la configuración/pedido.

La arquitectura debe distinguir:

* configuración
* archivo entregado
* resultado calculado

No se deben inventar URLs, SKUs ni identificadores productivos en esta fase.

---

# 31. Qué NO está definido todavía

Antes de Prisma todavía quedan deliberadamente abiertos:

### Inventario real

* materiales concretos
* gramajes
* soportes
* técnicas
* terminaciones
* precios
* mínimos
* escalas reales

### Reglas productivas

* compatibilidades exactas
* restricciones de fabricación
* desperdicio / merma
* rendimientos
* matrices
* tiempos
* costos reales

### Pricing definitivo

Las fórmulas vistas hasta ahora son **modelos conceptuales**.

No representan todavía reglas productivas reales.

### UI

Todavía no se define:

* layout final
* componentes
* pasos exactos
* textos de interfaz
* comportamiento visual

Eso pertenece a una etapa posterior.

---

# 32. Qué queda congelado

A esta altura se considera cerrado conceptualmente:

## A — Product Base universe

**22 Product Bases v1.0.**

## B — Comercial

Relación:

**Rubro → Situación → Necesidad → Product Base**

La matriz es fuente de verdad comercial.

## C — Motores

Cinco motores:

```text
IMPRESOS_PACKAGING
PRESENCIA_FISICA
TEXTIL
DIGITAL
CAMPAÑAS
```

con Product Bases asignados.

## Modalidades

```text
DIRECTO
CONFIGURABLE
CONSULTAR
```

## Arquitectura de configuración

```text
SCHEMA
COMPATIBILITY
PRICING / OUTPUT
SNAPSHOT
```

---

# 33. Qué NO debe hacerse en FASE D

Al pasar a Prisma no se debe:

* reabrir la definición de los 22 Product Bases sin una contradicción real;
* crear un Product Base por cada rubro;
* duplicar productos para cada necesidad;
* crear un Product Base para Análisis de Datos;
* crear un motor audiovisual;
* convertir todos los servicios en configuradores;
* poner reglas de negocio exclusivamente en frontend;
* congelar precios inventados;
* convertir ejemplos ilustrativos en inventario real;
* agregar campos especulativos sin comportamiento que los justifique.

---

# 34. FASE D — objetivo

La siguiente fase es traducir esta arquitectura comercial a un modelo de datos que permita:

1. representar Product Bases;
2. relacionarlos con rubros, situaciones y necesidades;
3. identificar su modalidad comercial;
4. identificar su motor cuando corresponda;
5. representar schemas configurables;
6. representar opciones;
7. representar reglas de compatibilidad;
8. representar pricing;
9. conservar snapshots históricos;
10. mantener el sistema extensible sin duplicar entidades.

La implementación debe respetar la arquitectura comercial definida acá.

**Prisma no debe redefinir el negocio.**

---

# 35. Principio final

La tienda ZAP no necesita un configurador para todo.

Necesita saber con precisión:

> **qué puede vender directamente, qué puede configurar, qué puede calcular y qué necesita conversar con ZAP.**

La arquitectura v1.0 queda preparada para pasar de la definición comercial a la definición técnica.
