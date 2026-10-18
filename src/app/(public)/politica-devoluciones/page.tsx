import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Política de devoluciones | Tienda ZAP',
  description:
    'Cómo gestionamos reclamos por fallas, errores de producción y productos personalizados en Tienda ZAP.',
  alternates: { canonical: '/politica-devoluciones' },
}

export default function PoliticaDevolucionesPage() {
  return (
    <article className="mx-auto w-full max-w-3xl px-5 py-12 md:px-8 md:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
        Tienda ZAP
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-gray-950 md:text-4xl">
        Política de devoluciones
      </h1>
      <p className="mt-5 text-lg leading-8 text-gray-600">
        Fabricamos y preparamos productos según las especificaciones de cada pedido.
        Si cometemos un error o el producto presenta una falla, nos hacemos cargo.
      </p>

      <div className="mt-10 space-y-9 text-base leading-7 text-gray-700">
        <section>
          <h2 className="text-xl font-semibold text-gray-950">1. Productos personalizados</h2>
          <p className="mt-3">
            Tarjetas, etiquetas, flyers, talonarios y demás piezas producidas con
            textos, archivos, medidas o indicaciones particulares se preparan para
            cada cliente. Por esa razón, no aceptamos devoluciones por cambio de
            opinión, arrepentimiento o por un error en los datos, textos, archivos
            o especificaciones que el cliente nos haya enviado o aprobado.
          </p>
          <p className="mt-3">
            Antes de confirmar el pedido, revisá cuidadosamente nombres, teléfonos,
            direcciones, textos, medidas, cantidades y archivos. Cuando enviamos una
            prueba para aprobación, esa revisión forma parte del proceso.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-950">2. Errores o fallas atribuibles a ZAP</h2>
          <p className="mt-3">
            Si el producto entregado tiene una falla de fabricación, está dañado
            o no coincide con las especificaciones confirmadas por escrito y el
            error es responsabilidad de ZAP, evaluaremos el caso y ofreceremos una
            solución adecuada, que podrá incluir la reposición o reimpresión sin
            costo, o el reintegro que corresponda.
          </p>
          <p className="mt-3">
            No necesitás aceptar un producto defectuoso ni renunciás a los derechos
            que te reconoce la legislación aplicable por haber aprobado una prueba.
            La aprobación no cubre errores de producción que se aparten de lo
            efectivamente aprobado.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-950">3. Cómo hacer un reclamo</h2>
          <p className="mt-3">
            Escribinos a <a className="font-medium text-gray-950 underline underline-offset-4" href="mailto:hola@zap.com.ar">hola@zap.com.ar</a> con
            el número de pedido, una descripción del inconveniente y fotografías
            claras del producto y del defecto. Conservá el producto y su embalaje
            hasta que te indiquemos cómo continuar.
          </p>
          <p className="mt-3">
            Revisaremos la información y te responderemos para acordar los pasos
            siguientes. Si el problema es atribuible a ZAP, coordinaremos la
            solución y asumiremos los costos razonables de devolución o reposición
            que correspondan.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-950">4. Características de impresión</h2>
          <p className="mt-3">
            Los colores pueden verse distintos según la pantalla, el archivo y el
            proceso de impresión. Las variaciones propias del soporte o del proceso
            no constituyen por sí solas una falla; revisaremos cualquier diferencia
            relevante frente a las especificaciones acordadas.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-950">5. Derechos del consumidor</h2>
          <p className="mt-3">
            Esta política no limita las garantías legales ni los derechos que sean
            aplicables en cada operación. Para los productos confeccionados según
            especificaciones del cliente o claramente personalizados, la normativa
            argentina contempla una excepción al derecho de revocar la compra por
            arrepentimiento. Esa excepción no elimina los derechos que correspondan
            ante defectos, incumplimientos o errores atribuibles al proveedor.
          </p>
        </section>
      </div>

      <div className="mt-12 border-t border-gray-200 pt-6">
        <p className="text-sm leading-6 text-gray-600">
          ¿Tenés una consulta sobre un pedido? Escribinos a{' '}
          <a className="font-medium text-gray-950 underline underline-offset-4" href="mailto:hola@zap.com.ar">
            hola@zap.com.ar
          </a>.
        </p>
        <Link href="/productos" className="mt-5 inline-flex text-sm font-semibold text-gray-950 underline underline-offset-4">
          Volver a la tienda
        </Link>
      </div>
    </article>
  )
}
