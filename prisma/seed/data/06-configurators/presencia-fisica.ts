import { ConfiguratorVersionSeedData } from '../../types';
import { granFormatoCostCatalog } from './gran-formato-costos';

const presenciaSlugs = [
  'carteleria-ploteo',
  'corporeos-marquesinas',
  'senaletica-placas',
];

const presenciaDraftConfigurators: ConfiguratorVersionSeedData[] = presenciaSlugs.map((slug) => ({
  productSlug: slug,
  schemaVersion: '1.0',
  status: 'DRAFT',
  schema: {
    engine: 'PRESENCIA_FISICA',
    dimensions: ['tipo', 'medidas', 'soporte', 'grafica', 'estructura', 'instalacion'],
    steps: [
      { id: 'tipo', label: 'Tipo / Modelo', type: 'select', required: true, options: [] },
      { id: 'medidas', label: 'Medidas / Superficie', type: 'dimensions', required: true, options: [] },
      { id: 'soporte', label: 'Soporte / Material', type: 'select', required: true, options: [] },
      { id: 'grafica', label: 'Gráfica / Impresión', type: 'select', required: true, options: [] },
      { id: 'estructura', label: 'Estructura / Terminación', type: 'select', required: false, options: [] },
      { id: 'instalacion', label: 'Instalación / Entrega', type: 'select', required: false, options: [] },
    ],
  },
  compatibility: null,
  pricing: null,
}));

/**
 * Subfamilia publicable de Expositores & Stands con costo de producto terminado.
 * Solo expone dos modelos y dos tecnologías con celdas explícitas en la fuente.
 * No extrapola materiales, medidas ni métodos de impresión.
 */
export const expositoresStandsConfigurator: ConfiguratorVersionSeedData = {
  productSlug: 'expositores-stands',
  schemaVersion: '1.2',
  status: 'ACTIVE',
  schema: {
    engine: 'PRESENCIA_FISICA',
    productSlug: 'expositores-stands',
    fields: {
      model: {
        label: 'Modelo',
        type: 'select',
        required: true,
        default: 'double_90x190',
        options: [
          { id: 'double_90x190', label: 'Portabanner doble tensor 90 × 190 cm' },
          { id: 'rollup_85x200', label: 'Roll Up retráctil 85 × 200 cm' },
        ],
      },
      printing: {
        label: 'Impresión',
        type: 'select',
        required: true,
        default: 'latex',
        options: [
          { id: 'latex', label: 'Impresión látex' },
          { id: 'uv', label: 'Impresión UV' },
        ],
      },
      quantity: {
        label: 'Cantidad',
        type: 'quantity_selector',
        required: true,
        default: 1,
        options: [
          { value: 1, label: '1 unidad' },
          { value: 2, label: '2 unidades' },
          { value: 3, label: '3 unidades' },
          { value: 5, label: '5 unidades' },
          { value: 10, label: '10 unidades' },
        ],
      },
    },
  },
  compatibility: { uiRules: [] },
  pricing: {
    engine: 'PROVIDER_FINISHED_COST',
    commercialPricingPolicy: {
      version: 1,
      mode: 'MARKUP',
      percentage: 35,
      vatRatePercent: 21,
    },
    providerFinishedCostMatrix: {
      resolver: { type: 'PORTABANNER_FINISHED' },
      currency: 'ARS',
      taxIncluded: false,
      source: 'CATALOGO_GRAN_FORMATO_2026_07',
      portabanner: granFormatoCostCatalog.finishedProducts.portabannerPlusPrinting,
    },
  },
};

export const presenciaFisicaConfigurators: ConfiguratorVersionSeedData[] = [
  ...presenciaDraftConfigurators,
  expositoresStandsConfigurator,
];
