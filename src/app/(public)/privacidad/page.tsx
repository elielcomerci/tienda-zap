import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Política de privacidad',
  description: 'Cómo Tienda ZAP trata los datos personales cuando navegás, creás una cuenta o realizás una compra.',
  alternates: { canonical: '/privacidad' },
}

const sections = [
  {
    title: '1. Quién está detrás de la tienda',
    body: 'Tienda ZAP es operada por ZAP Agencia Creativa. Para consultas sobre privacidad y datos personales podés escribir a hola@zap.com.ar. La comunicación puede incluir información adicional sobre la persona o entidad responsable del tratamiento cuando corresponda.'
  },
  {
    title: '2. Qué información podemos recibir',
    body: 'Podemos tratar los datos que proporcionás al crear una cuenta, consultar por un producto o servicio, solicitar una propuesta, realizar una compra o comunicarte con nosotros. Según la operación, pueden incluir nombre, apellido, correo electrónico, teléfono, datos de facturación o entrega, identificación y el contenido de tu consulta. También se generan datos técnicos de navegación, como dirección IP, navegador, dispositivo y páginas visitadas.'
  },
  {
    title: '3. Para qué usamos esos datos',
    body: 'Usamos la información para administrar cuentas, responder consultas, preparar propuestas, procesar pedidos, coordinar entregas o trabajos, emitir documentación comercial, brindar soporte, prevenir usos indebidos y mejorar la tienda. Solo solicitamos los datos que resultan necesarios para cada gestión.'
  },
  {
    title: '4. Pagos y servicios de terceros',
    body: 'Cuando una operación requiere un medio de pago externo, los datos necesarios para procesar el pago son tratados por el proveedor elegido bajo sus propias condiciones y políticas. Tienda ZAP no necesita almacenar los datos completos de tarjetas para gestionar una consulta o pedido.'
  },
  {
    title: '5. Analítica y cookies',
    body: 'La tienda utiliza Google Analytics para medir visitas y entender cómo se utiliza. Estas herramientas pueden emplear cookies o tecnologías similares y recibir datos técnicos de navegación. Podés limitar o eliminar cookies desde la configuración de tu navegador; hacerlo puede afectar algunas funciones.'
  },
  {
    title: '6. Con quién podemos compartir información',
    body: 'Podemos recurrir a proveedores que prestan servicios de alojamiento, infraestructura, analítica, almacenamiento, comunicación, pagos, logística o soporte técnico. Solo reciben la información necesaria para cumplir esa función. También podremos comunicar datos cuando exista una obligación legal o sea necesario para proteger derechos y seguridad. No comercializamos bases de datos personales.'
  },
  {
    title: '7. Conservación y seguridad',
    body: 'Conservamos la información durante el tiempo necesario para gestionar la cuenta, el pedido o la relación comercial, cumplir obligaciones legales y resolver posibles reclamos. Aplicamos medidas razonables de seguridad y acceso limitado. Ningún sistema conectado a Internet puede garantizar seguridad absoluta.'
  },
  {
    title: '8. Tus derechos',
    body: 'Podés solicitar acceso, actualización, rectificación o supresión de tus datos, y realizar consultas sobre su tratamiento, escribiendo a hola@zap.com.ar. La solicitud debe permitir identificarte y describir qué necesitás. También podés acudir a la Agencia de Acceso a la Información Pública, autoridad de control de la Ley 25.326 en Argentina.'
  },
  {
    title: '9. Enlaces a otros sitios',
    body: 'La tienda puede incluir enlaces a plataformas de terceros, por ejemplo redes sociales o servicios de mensajería. Al salir de tienda.zap.com.ar, el tratamiento de datos queda sujeto a las políticas del servicio que visites.'
  },
  {
    title: '10. Cambios en esta política',
    body: 'Podemos actualizar esta política para reflejar cambios en la tienda, los servicios o las normas aplicables. La versión vigente estará publicada en esta página e indicará su última actualización.'
  }
]

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#FAF9F6] px-5 py-16 text-[#0F172A] md:py-24">
      <article className="mx-auto max-w-3xl">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Tienda ZAP</p>
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Política de privacidad</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-gray-600">Cómo tratamos la información cuando navegás, creás una cuenta o realizás una compra.</p>
        <p className="mt-3 text-xs text-gray-500">Última actualización: 1 de noviembre de 2026.</p>
        <div className="mt-12 space-y-9 border-t border-gray-200 pt-9">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-semibold tracking-tight">{section.title}</h2>
              <p className="mt-3 text-sm leading-7 text-gray-600">{section.body}</p>
            </section>
          ))}
        </div>
        <p className="mt-12 border-t border-gray-200 pt-6 text-sm text-gray-600">
          ¿Tenés una consulta sobre tus datos? <a className="font-medium text-[#0F172A] underline underline-offset-4" href="mailto:hola@zap.com.ar">hola@zap.com.ar</a>
        </p>
      </article>
    </main>
  )
}
