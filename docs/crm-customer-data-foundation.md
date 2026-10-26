# CRM: base de datos común del cliente

## Objetivo de esta etapa

Construir una base compartida para la relación comercial entre ZAP Tienda y el equipo de ventas. Esta etapa **registra y relaciona datos**; no genera recomendaciones automáticas, perfiles inferidos ni análisis con IA. La forma de consumir los datos se define en una etapa posterior.

## Modelo y responsabilidades

- `BusinessAccount`: entidad comercial común para un negocio o cliente atendido por ZAP.
- `User`: identidad de acceso y cliente registrado, cuando existe.
- `BusinessContact`: personas y canales de contacto de una cuenta.
- `SellerLead`: proceso comercial del vendedor. Ahora puede vincularse a `BusinessAccount`; los leads existentes se vinculan automáticamente solo cuando los datos existentes apuntan a una única cuenta.
- `Order` / `OrderItem`: fuente original para compras y productos. No se copian a una tabla paralela de eventos en esta etapa.
- `ConsultRequest`: fuente original para consultas, con snapshot del contexto enviado por el cliente.
- `CustomerConversation`: texto original importado (por ejemplo, una conversación de WhatsApp pegada manualmente), fecha opcional, referencia, cuenta, autor de la importación y hash para evitar duplicados.
- `CustomerTimelineEvent`: envoltorio neutral para registrar eventos nuevos y referencias a su fuente original. Se utiliza al importar conversaciones; no reemplaza las tablas originales ni duplica pedidos.
- `SellerLeadEvent`: historial de cambios del proceso de prospecto, que se conserva por compatibilidad.

## Importación de WhatsApp

1. El usuario con permisos elige una cuenta comercial que puede gestionar.
2. Pega el texto copiado desde WhatsApp y puede indicar una fecha y una referencia.
3. Se conserva el texto original; no se resume, clasifica ni envía a un proveedor externo.
4. Un hash SHA-256 impide importar exactamente el mismo texto más de una vez para la misma cuenta.
5. Se registra el evento de importación en la línea de vida.
6. El acceso queda limitado a Administración y a vendedores activos con una relación autorizada con la cuenta.

El límite actual es de 100.000 caracteres por importación. La pantalla advierte que se deben registrar únicamente conversaciones que el usuario esté autorizado a almacenar.

## Resolución de identidad

- La migración solo enlaza leads existentes con una cuenta si el usuario convertido o los contactos existentes permiten una coincidencia inequívoca.
- La creación de leads intenta encontrar una única cuenta por usuario/email/teléfono. Si encuentra varias cuentas o una cuenta asignada a otro vendedor, deja el lead sin vincular antes que mezclar historiales de personas o negocios diferentes.
- No se usa coincidencia difusa por nombre. Los casos ambiguos requieren revisión humana.
- La identidad canónica aquí es comercial (cuenta/negocio), no una afirmación de que todos los contactos de ese negocio sean la misma persona.

## Fuentes disponibles y límites

- Pedidos: existen pedidos, artículos, cantidades, precios, estado y fechas. Antes de inferir frecuencia o gasto se deben definir qué estados cuentan como compra válida y cómo tratar cancelaciones, reembolsos y pedidos invitados.
- Consultas: se guardan producto, contacto, mensaje y snapshot de contexto/respuestas; todavía no hay una relación estructural directa con `BusinessAccount` en todos los flujos.
- Prospectos: se guardan estado, notas, fecha de próximo contacto e historial de eventos.
- Navegación, productos vistos y abandono de carrito: no se debe asumir que hay telemetría propia completa hasta auditar e instrumentar esos eventos.
- WhatsApp: el texto fuente se almacena, pero todavía no se extraen mensajes individuales, intención, objeciones, resultado comercial ni calidad de respuesta.

## Fuera de alcance (etapa posterior)

- Análisis de lenguaje natural o IA.
- Detección automática de patrones y recomendaciones.
- Puntuación automática de leads o propensión a comprar.
- Evaluación de respuestas que funcionan mejor o peor.
- Sincronización automática con WhatsApp.
- Dashboards predictivos.

La siguiente etapa podrá definir un contrato de lectura estable para consultar la línea de vida y exportar eventos estructurados sin acoplar el modelo de datos a un proveedor de IA específico.
