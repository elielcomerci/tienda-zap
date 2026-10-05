import { ConfiguratorVersionSeedData } from '../../types';

const presenciaSlugs = [
  'carteleria-ploteo',
  'corporeos-marquesinas',
  'senaletica-placas',
  'expositores-stands',
];

export const presenciaFisicaConfigurators: ConfiguratorVersionSeedData[] = presenciaSlugs.map((slug) => ({
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
