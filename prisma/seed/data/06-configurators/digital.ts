import { ConfiguratorVersionSeedData } from '../../types';

export const digitalConfigurators: ConfiguratorVersionSeedData[] = [
  {
    productSlug: 'activos-web-sitios',
    schemaVersion: '1.0',
    status: 'DRAFT',
    schema: {
      engine: 'DIGITAL',
      dimensions: ['tipo', 'alcance', 'funcionalidades', 'integraciones', 'contenido', 'puesta_en_marcha', 'soporte'],
      steps: [
        { id: 'tipo', label: 'Tipo de Activo Web', type: 'select', required: true, options: [] },
        { id: 'alcance', label: 'Alcance y Secciones', type: 'select', required: true, options: [] },
        { id: 'funcionalidades', label: 'Funcionalidades Comerciales', type: 'multi_select', required: false, options: [] },
        { id: 'integraciones', label: 'Integraciones', type: 'multi_select', required: false, options: [] },
        { id: 'contenido', label: 'Producción de Contenido', type: 'select', required: false, options: [] },
        { id: 'puesta_en_marcha', label: 'Puesta en Marcha / Dominio', type: 'select', required: true, options: [] },
        { id: 'soporte', label: 'Plan de Soporte y Mantenimiento', type: 'select', required: false, options: [] },
      ],
    },
    compatibility: null,
    pricing: null,
  },
  {
    productSlug: 'asistentes-bots',
    schemaVersion: '1.0',
    status: 'DRAFT',
    schema: {
      engine: 'DIGITAL',
      dimensions: ['tipo', 'canal', 'objetivo', 'conocimiento', 'acciones', 'integraciones'],
      steps: [
        { id: 'tipo', label: 'Tipo de Asistente', type: 'select', required: true, options: [] },
        { id: 'canal', label: 'Canal Principal', type: 'select', required: true, options: [] },
        { id: 'objetivo', label: 'Objetivo Principal', type: 'select', required: true, options: [] },
        { id: 'conocimiento', label: 'Fuentes de Conocimiento', type: 'multi_select', required: false, options: [] },
        { id: 'acciones', label: 'Capacidades / Acciones', type: 'multi_select', required: false, options: [] },
        { id: 'integraciones', label: 'Integraciones de Sistema', type: 'multi_select', required: false, options: [] },
      ],
    },
    compatibility: null,
    pricing: null,
  },
];
