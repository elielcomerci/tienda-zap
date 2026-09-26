/**
 * FASE E — Migración de taxonomy + conversionType completo
 *
 * Decisiones confirmadas por el usuario:
 *   taxonomy: 'cosas' | 'soluciones' | 'desarrollos'
 *   conversionType: 'buy' | 'configure' | 'contact'
 */

import { Pool } from 'pg'

const pool = new Pool({
  connectionString:
    'postgresql://neondb_owner:npg_R0JyeVjX1NSI@ep-super-butterfly-ane1zynb-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
})

type ProductUpdate = {
  slug: string
  taxonomy: 'cosas' | 'soluciones' | 'desarrollos'
  conversionType: 'buy' | 'configure' | 'contact'
}

const SOLUCIONES: ProductUpdate[] = [
  { slug: 'pack-belleza-agenda-llena',          taxonomy: 'soluciones', conversionType: 'configure' },
  { slug: 'pack-eventos-presencia-completa',    taxonomy: 'soluciones', conversionType: 'configure' },
  { slug: 'pack-gastronomia-local-activo',      taxonomy: 'soluciones', conversionType: 'configure' },
  { slug: 'pack-gym-inscripciones',             taxonomy: 'soluciones', conversionType: 'configure' },
  { slug: 'pack-inmobiliaria-captacion-total',  taxonomy: 'soluciones', conversionType: 'configure' },
  { slug: 'pack-moda-packaging-y-venta-online', taxonomy: 'soluciones', conversionType: 'configure' },
  { slug: 'pack-retail-vidriera-y-whatsapp',    taxonomy: 'soluciones', conversionType: 'configure' },
  { slug: 'pack-de-piezas-para-redes',          taxonomy: 'soluciones', conversionType: 'configure' },
  { slug: 'menu-qr-para-restaurantes',          taxonomy: 'soluciones', conversionType: 'configure' },
  { slug: 'whatsapp-comercial-configurado',     taxonomy: 'soluciones', conversionType: 'configure' },
]

const DESARROLLOS: ProductUpdate[] = [
  { slug: 'asistente-comercial-con-ia-para-whatsapp-2',      taxonomy: 'desarrollos', conversionType: 'contact' },
  { slug: 'desarrollo-sitio-web-corporativo-institucional',  taxonomy: 'desarrollos', conversionType: 'contact' },
  { slug: 'diseno-y-desarrollo-de-landing-page-optimizada',  taxonomy: 'desarrollos', conversionType: 'contact' },
  { slug: 'ecommerce-simple',                                taxonomy: 'desarrollos', conversionType: 'contact' },
  { slug: 'google-business',                                 taxonomy: 'desarrollos', conversionType: 'contact' },
  { slug: 'jingle-comercial-publicitario',                   taxonomy: 'desarrollos', conversionType: 'contact' },
  { slug: 'landing-de-captacion-inmobiliaria',               taxonomy: 'desarrollos', conversionType: 'contact' },
  { slug: 'optimizacion-para-buscadores',                    taxonomy: 'desarrollos', conversionType: 'contact' },
  { slug: 'ploteo-vehicular',                                taxonomy: 'desarrollos', conversionType: 'contact' },
]

const COSAS: ProductUpdate[] = [
  { slug: 'backdrop-para-eventos',                 taxonomy: 'cosas', conversionType: 'configure' },
  { slug: 'cartel-intercambiable',                 taxonomy: 'cosas', conversionType: 'configure' },
  { slug: 'cartel-lona-impresion-uv',              taxonomy: 'cosas', conversionType: 'configure' },
  { slug: 'cartel-venta-alquiler',                 taxonomy: 'cosas', conversionType: 'configure' },
  { slug: 'cartel-rigido-para-local',              taxonomy: 'cosas', conversionType: 'configure' },
  { slug: 'posters-por-medida',                    taxonomy: 'cosas', conversionType: 'configure' },
  { slug: 'tu-cartel-visible',                     taxonomy: 'cosas', conversionType: 'configure' },
  { slug: 'vinilo-para-vidriera',                  taxonomy: 'cosas', conversionType: 'configure' },
  { slug: 'banners-y-portabanners',                taxonomy: 'cosas', conversionType: 'configure' },
  { slug: 'roll-up-listo-para-evento',             taxonomy: 'cosas', conversionType: 'configure' },
  { slug: 'display-caballete',                     taxonomy: 'cosas', conversionType: 'configure' },
  { slug: 'exhibidor',                             taxonomy: 'cosas', conversionType: 'configure' },
  { slug: 'flyer-volante-simple',                  taxonomy: 'cosas', conversionType: 'configure' },
  { slug: 'folleto',                               taxonomy: 'cosas', conversionType: 'configure' },
  { slug: 'menu-gastronomico-impreso',             taxonomy: 'cosas', conversionType: 'configure' },
  { slug: 'gigantografias',                        taxonomy: 'cosas', conversionType: 'configure' },
  { slug: 'imanes',                                taxonomy: 'cosas', conversionType: 'configure' },
  { slug: 'delantales-cheff-personalizados',       taxonomy: 'cosas', conversionType: 'configure' },
  { slug: 'remera-personalizada',                  taxonomy: 'cosas', conversionType: 'configure' },
  { slug: 'block-anotador-personalizado',          taxonomy: 'cosas', conversionType: 'configure' },
  { slug: 'bolsa-de-papel-personalizada',          taxonomy: 'cosas', conversionType: 'configure' },
  { slug: 'bolsas-de-friselina-personalizadas',    taxonomy: 'cosas', conversionType: 'configure' },
  { slug: 'pin-publicitario',                      taxonomy: 'cosas', conversionType: 'configure' },
  { slug: 'senaletica-interior',                   taxonomy: 'cosas', conversionType: 'configure' },
  { slug: 'etiquetas-para-packaging',              taxonomy: 'cosas', conversionType: 'configure' },
  { slug: 'stickers-troquelados',                  taxonomy: 'cosas', conversionType: 'configure' },
  { slug: 'tarjetas-personales-estandar',          taxonomy: 'cosas', conversionType: 'configure' },
  { slug: 'tarjetas-personales-premium',           taxonomy: 'cosas', conversionType: 'configure' },
  { slug: 'credenciales-para-eventos',             taxonomy: 'cosas', conversionType: 'configure' },
  { slug: 'etiquetas-colgantes-para-indumentaria', taxonomy: 'cosas', conversionType: 'configure' },
  { slug: 'tarjetas-de-turnos',                    taxonomy: 'cosas', conversionType: 'configure' },
  { slug: 'voucher-gift-card',                     taxonomy: 'cosas', conversionType: 'configure' },
  { slug: 'carpeta-corporativa',                   taxonomy: 'cosas', conversionType: 'configure' },
  { slug: 'carpetas-a4',                           taxonomy: 'cosas', conversionType: 'configure' },
  { slug: 'calendario',                            taxonomy: 'cosas', conversionType: 'buy' },
]

const OCULTAR = ['asistente-comercial-con-ia-para-whatsapp'] // duplicado, no borrar

async function main() {
  const allUpdates = [...SOLUCIONES, ...DESARROLLOS, ...COSAS]
  console.log(`\n Fase E - clasificando ${allUpdates.length} productos...\n`)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    for (const p of allUpdates) {
      const res = await client.query(
        `UPDATE "Product" SET taxonomy = $1, "conversionType" = $2 WHERE slug = $3 RETURNING name`,
        [p.taxonomy, p.conversionType, p.slug]
      )
      if (res.rowCount === 0) {
        console.warn(`  WARN no encontrado: ${p.slug}`)
      } else {
        const icon = p.taxonomy === 'cosas' ? 'C' : p.taxonomy === 'soluciones' ? 'S' : 'D'
        console.log(`  [${icon}/${p.conversionType}] ${res.rows[0].name}`)
      }
    }

    for (const slug of OCULTAR) {
      const res = await client.query(
        `UPDATE "Product" SET active = false WHERE slug = $1 RETURNING name`,
        [slug]
      )
      if (res.rowCount && res.rowCount > 0) {
        console.log(`  [OCULTO] ${res.rows[0].name}`)
      } else {
        console.warn(`  WARN duplicado no encontrado: ${slug}`)
      }
    }

    await client.query('COMMIT')
    console.log('\n OK Transaccion completada.\n')

    // Verificacion final
    const { rows: final } = await client.query(`
      SELECT taxonomy, "conversionType", COUNT(*) AS total
      FROM "Product"
      WHERE slug != 'venta-manual'
      GROUP BY taxonomy, "conversionType"
      ORDER BY taxonomy, "conversionType"
    `)
    console.log('Resumen:')
    for (const r of final) {
      console.log(`  ${r.taxonomy ?? 'sin-clasificar'} / ${r.conversiontype ?? 'null'} = ${r.total}`)
    }

    const { rows: sinTax } = await client.query(`
      SELECT name, slug FROM "Product"
      WHERE taxonomy IS NULL AND slug != 'venta-manual'
    `)
    if (sinTax.length > 0) {
      console.log(`\nWARN ${sinTax.length} sin taxonomy:`)
      sinTax.forEach(r => console.log(`  - ${r.name} (${r.slug})`))
    } else {
      console.log('\nOK Todos los productos comerciales tienen taxonomy.')
    }

  } catch (err) {
    await client.query('ROLLBACK')
    console.error('ROLLBACK:', err)
    throw err
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch(e => { console.error(e); process.exit(1) })
