import { ConfiguratorVersionSeedData } from '../../types';

export const textilConfigurators: ConfiguratorVersionSeedData[] = [
  {
    productSlug: 'indumentaria-textil',
    schemaVersion: '1.0',
    status: 'DRAFT',
    schema: {
      engine: 'TEXTIL',
      dimensions: ['prenda', 'variante', 'color', 'personalizacion', 'talles', 'extras'],
      steps: [
        { id: 'prenda', label: 'Prenda Base', type: 'select', required: true, options: [] },
        { id: 'variante', label: 'Corte / Variante', type: 'select', required: true, options: [] },
        { id: 'color', label: 'Color', type: 'color_select', required: true, options: [] },
        {
          id: 'personalizacion',
          label: 'Personalización',
          type: 'customization_block',
          required: true,
          subfields: ['tecnica', 'ubicacion'],
        },
        {
          id: 'talles',
          label: 'Distribución de Talles',
          type: 'size_distribution',
          required: true,
          sizes: ['S', 'M', 'L', 'XL', 'XXL'],
        },
        { id: 'extras', label: 'Terminaciones Extras', type: 'multi_select', required: false, options: [] },
      ],
    },
    compatibility: null,
    pricing: null,
  },
];
