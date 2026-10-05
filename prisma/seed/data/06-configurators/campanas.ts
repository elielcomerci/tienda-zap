import { ConfiguratorVersionSeedData } from '../../types';

export const campanasConfigurators: ConfiguratorVersionSeedData[] = [
  {
    productSlug: 'anuncios-campanas',
    schemaVersion: '1.0',
    status: 'DRAFT',
    schema: {
      engine: 'CAMPANAS',
      dimensions: ['objetivo', 'canal', 'alcance', 'piezas', 'inversion_medios', 'duracion'],
      steps: [
        { id: 'objetivo', label: 'Objetivo de Campaña', type: 'select', required: true, options: [] },
        { id: 'canal', label: 'Canal / Plataforma', type: 'multi_select', required: true, options: [] },
        { id: 'alcance', label: 'Alcance Geográfico / Segmentación', type: 'select', required: true, options: [] },
        { id: 'piezas', label: 'Cantidad y Tipos de Piezas Gráficas', type: 'select', required: true, options: [] },
        { id: 'inversion_medios', label: 'Presupuesto Estimado en Medios', type: 'budget_tier', required: true, options: [] },
        { id: 'duracion', label: 'Duración / Ciclo de Optimización', type: 'select', required: true, options: [] },
      ],
    },
    compatibility: null,
    pricing: null,
  },
];
