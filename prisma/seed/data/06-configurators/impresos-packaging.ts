import { ConfiguratorVersionSeedData } from '../../types';

export const tarjetasVouchersConfigurator: ConfiguratorVersionSeedData = {
  productSlug: 'tarjetas-vouchers',
  schemaVersion: '1.0',
  status: 'ACTIVE',
  schema: {
    engine: 'IMPRESOS_PACKAGING',
    productSlug: 'tarjetas-vouchers',
    fields: {
      format: {
        label: 'Formato',
        type: 'select',
        required: true,
        default: '9x5',
        options: [
          { id: '9x5', label: '9×5 cm (Estándar)' },
          { id: '9x3', label: '9×3 cm (Mini / Turnero)' },
          { id: '9x10_plegada', label: '9×10 cm (Díptica / Plegada a 9×5)' },
          { id: '10x15', label: '10×15 cm (Postal / Grande)' },
        ],
      },
      material: {
        label: 'Material',
        type: 'select',
        required: true,
        default: 'ilustracion_350g',
        options: [
          { id: 'ilustracion_350g', label: 'Papel Ilustración 350g' },
          { id: 'ilustracion_300g', label: 'Papel Ilustración 300g' },
        ],
      },
      printing: {
        label: 'Impresión',
        type: 'select',
        required: true,
        default: '4_4',
        options: [
          { id: '4_0', label: 'Frente solo color (4/0)' },
          { id: '4_4', label: 'Frente y dorso color (4/4)' },
        ],
      },
      lamination: {
        label: 'Laminado',
        type: 'select',
        required: true,
        default: 'sin_laminar',
        options: [
          { id: 'sin_laminar', label: 'Sin laminar' },
          { id: 'mate', label: 'Laminado OPP Mate' },
          { id: 'brillo', label: 'Laminado OPP Brillo' },
        ],
      },
      laminationSides: {
        label: 'Caras de laminado',
        type: 'select',
        required: false,
        default: 'frente',
        options: [
          { id: 'frente', label: 'Frente' },
          { id: 'ambas', label: 'Ambas caras' },
        ],
      },
      additionalFinishings: {
        label: 'Terminaciones adicionales',
        type: 'multiselect',
        required: false,
        default: [],
        options: [
          { id: 'laca_uv_sectorizada', label: 'Laca UV Sectorizada' },
          { id: 'puntas_redondeadas', label: 'Puntas redondeadas' },
          { id: 'perforacion', label: 'Perforación / Ojalillo' },
        ],
      },
      quantity: {
        label: 'Cantidad',
        type: 'quantity_selector',
        required: true,
        default: 100,
        options: [
          { value: 100, label: '100 u.' },
          { value: 200, label: '200 u.' },
          { value: 300, label: '300 u.' },
          { value: 500, label: '500 u.' },
          { value: 1000, label: '1000 u.' },
        ],
      },
    },
  },
  compatibility: {
    uiRules: [
      {
        field: 'laminationSides',
        condition: { field: 'lamination', operator: 'neq', value: 'sin_laminar' },
        action: 'visible',
      },
    ],
    requiredProcesses: [
      {
        condition: { field: 'format', operator: 'eq', value: '9x10_plegada' },
        process: 'HENDIDO_CENTRAL',
      },
    ],
  },
  pricing: {
    engine: 'ProductQuoterConfig',
    adapter: {
      formatMapping: {
        '9x5': { sizeLabel: '9x5 cm', width: 9, height: 5 },
        '9x3': { sizeLabel: '9x3 cm', width: 9, height: 3 },
        '9x10_plegada': { sizeLabel: '9x10 cm', width: 9, height: 10 },
        '10x15': { sizeLabel: '10x15 cm', width: 10, height: 15 },
      },
      materialResolution: {
        ilustracion_350g: {
          '4_0': 'raw_mat_ilustracion_350g_4_0',
          '4_4': 'raw_mat_ilustracion_350g_4_4',
        },
        ilustracion_300g: {
          '4_0': 'raw_mat_ilustracion_300g_4_0',
          '4_4': 'raw_mat_ilustracion_300g_4_4',
        },
      },
      laminationResolution: {
        mate: {
          frente: 'fin_opp_mate_1c',
          ambas: 'fin_opp_mate_2c',
        },
        brillo: {
          frente: 'fin_opp_brillo_1c',
          ambas: 'fin_opp_brillo_2c',
        },
      },
      additionalFinishingsResolution: {
        laca_uv_sectorizada: 'fin_laca_uv_sectorizada',
        puntas_redondeadas: 'fin_puntas_redondeadas',
        perforacion: 'fin_perforacion',
      },
      processResolution: {
        HENDIDO_CENTRAL: 'fin_hendido_central',
      },
    },
  },
};

export const flyersDesplegablesConfigurator: ConfiguratorVersionSeedData = {
  productSlug: 'flyers-desplegables',
  schemaVersion: '1.0',
  status: 'ACTIVE',
  schema: {
    engine: 'IMPRESOS_PACKAGING',
    productSlug: 'flyers-desplegables',
    fields: {
      foldingType: {
        label: 'Tipo de folleto',
        type: 'select',
        required: true,
        default: 'plano',
        options: [
          { id: 'plano', label: 'Flyer / Volante plano' },
          { id: 'diptico', label: 'Díptico (1 pliegue / 4 páginas)' },
          { id: 'triptico', label: 'Tríptico (2 pliegues / 6 páginas)' },
        ],
      },
      format: {
        label: 'Medida',
        type: 'select',
        required: true,
        default: '15x21',
        options: [
          { id: '10x10', label: '10×10 cm' },
          { id: '10x15', label: '10×15 cm' },
          { id: '15x21', label: '15×21 cm (A5)' },
          { id: 'a4', label: '21×30 cm (A4)' },
          { id: '10x20', label: '10×20 cm' },
        ],
      },
      material: {
        label: 'Papel',
        type: 'select',
        required: true,
        default: 'ilustracion_115g',
        options: [
          { id: 'obra_80g', label: 'Papel Obra 80g (Económico)' },
          { id: 'ilustracion_115g', label: 'Papel Ilustración 115g (Promocional)' },
          { id: 'ilustracion_150g', label: 'Papel Ilustración 150g (Óptimo / Mayor cuerpo)' },
        ],
      },
      printing: {
        label: 'Impresión',
        type: 'select',
        required: true,
        default: '4_0',
        options: [
          { id: '4_0', label: 'Frente solo color (4/0)' },
          { id: '4_4', label: 'Frente y dorso color (4/4)' },
        ],
      },
      quantity: {
        label: 'Cantidad',
        type: 'quantity_selector',
        required: true,
        default: 1000,
        options: [
          { value: 100, label: '100 u.' },
          { value: 200, label: '200 u.' },
          { value: 300, label: '300 u.' },
          { value: 500, label: '500 u.' },
          { value: 1000, label: '1.000 u.' },
          { value: 2500, label: '2.500 u.' },
          { value: 5000, label: '5.000 u.' },
        ],
      },
    },
  },
  compatibility: {
    allowedFormats: {
      plano: ['10x10', '10x15', '15x21', 'a4', '10x20'],
      diptico: ['15x21', '10x15', '10x20'],
      triptico: ['a4'],
    },
    requiredProcesses: [
      {
        condition: { field: 'foldingType', operator: 'eq', value: 'diptico' },
        process: 'DOBLADO_DIPTICO',
      },
      {
        condition: { field: 'foldingType', operator: 'eq', value: 'triptico' },
        process: 'DOBLADO_TRIPTICO',
      },
    ],
  },
  pricing: {
    engine: 'ProductQuoterConfig',
    adapter: {
      matrixFormatMapping: {
        plano: {
          '10x10': { sizeLabel: '10x10 cm', width: 10, height: 10 },
          '10x15': { sizeLabel: '10x15 cm', width: 10, height: 15 },
          '15x21': { sizeLabel: '15x21 cm', width: 15, height: 21 },
          'a4': { sizeLabel: 'A4', width: 21, height: 29.7 },
          '10x20': { sizeLabel: '10x20 cm', width: 10, height: 20 },
        },
        diptico: {
          '15x21': { sizeLabel: 'A4', width: 21, height: 29.7, closedLabel: 'Cerrado A5 (abierto A4)' },
          '10x15': { sizeLabel: '15x21 cm', width: 15, height: 21, closedLabel: 'Cerrado A6 (abierto A5)' },
          '10x20': { sizeLabel: '20x20 cm', width: 20, height: 20, closedLabel: 'Cerrado 10×20 (abierto 20×20 cm)' },
        },
        triptico: {
          'a4': { sizeLabel: 'A4', width: 21, height: 29.7, closedLabel: 'Cerrado 10×21 cm (abierto A4)' },
        },
      },
      materialResolution: {
        obra_80g: {
          '4_0': 'raw_mat_obra_80g_4_0',
          '4_4': 'raw_mat_obra_80g_4_4',
        },
        ilustracion_115g: {
          '4_0': 'raw_mat_ilustracion_115g_4_0',
          '4_4': 'raw_mat_ilustracion_115g_4_4',
        },
        ilustracion_150g: {
          '4_0': 'raw_mat_ilustracion_150g_4_0',
          '4_4': 'raw_mat_ilustracion_150g_4_4',
        },
      },
      processResolution: {
        DOBLADO_DIPTICO: 'fin_doblado_diptico',
        DOBLADO_TRIPTICO: 'fin_doblado_triptico',
      },
    },
  },
};

export const tagsEtiquetasConfigurator: ConfiguratorVersionSeedData = {
  productSlug: 'tags-etiquetas',
  schemaVersion: '1.0',
  // Promovido a ACTIVE — 10/10 casos E2E pasados.
  status: 'ACTIVE',
  schema: {
    engine: 'IMPRESOS_PACKAGING',
    productSlug: 'tags-etiquetas',
    fields: {
      format: {
        label: 'Formato (medida cerrada)',
        type: 'select',
        required: true,
        default: '9x5',
        options: [
          { id: '9x5',  label: '9×5 cm (Tag estándar)' },
          { id: '9x3',  label: '9×3 cm (Tag mini / precio)' },
          { id: '5x18', label: '5×18 cm (Tag vertical / colgante largo)' },
          { id: '9x10', label: '9×10 cm (Tag doble faz / mayor info)' },
        ],
      },
      printing: {
        label: 'Impresión',
        type: 'select',
        required: true,
        default: '4_4',
        options: [
          { id: '4_0', label: 'Frente solo color (4/0)' },
          { id: '4_4', label: 'Frente y dorso color (4/4)' },
        ],
      },
      lamination: {
        label: 'Laminado',
        type: 'select',
        required: true,
        default: 'sin_laminar',
        options: [
          { id: 'sin_laminar',      label: 'Sin laminar' },
          { id: 'opp_brillo_frente', label: 'Laminado OPP Brillo (Frente)' },
        ],
      },
      additionalFinishings: {
        label: 'Terminaciones adicionales',
        type: 'multiselect',
        required: false,
        default: [],
        options: [
          { id: 'puntas_redondeadas', label: 'Puntas redondeadas' },
        ],
      },
      quantity: {
        label: 'Cantidad',
        type: 'quantity_selector',
        required: true,
        default: 500,
        options: [
          { value: 500,  label: '500 u.' },
          { value: 1000, label: '1.000 u.' },
          { value: 2000, label: '2.000 u.' },
          { value: 3000, label: '3.000 u.' },
        ],
      },
    },
  },
  compatibility: {
    // La perforación es siempre obligatoria para tags; no se expone al cliente.
    // Se resuelve internamente como proceso requerido fijo.
    requiredProcesses: [
      {
        condition: { field: 'format', operator: 'exists', value: true },
        process: 'PERFORACION',
      },
    ],
  },
  pricing: {
    engine: 'ProductQuoterConfig',
    adapter: {
      formatMapping: {
        '9x5':  { sizeLabel: '9x5 cm',  width: 9,  height: 5  },
        '9x3':  { sizeLabel: '9x3 cm',  width: 9,  height: 3  },
        '5x18': { sizeLabel: '5x18 cm', width: 5,  height: 18 },
        '9x10': { sizeLabel: '9x10 cm', width: 9,  height: 10 },
      },
      // Tags solo en 350g — evidencia directa del catálogo (Tarjetas Clásicas).
      // 300g queda excluido por falta de evidencia comercial explícita para tags.
      materialResolution: {
        ilustracion_350g: {
          '4_0': 'raw_mat_ilustracion_350g_4_0',
          '4_4': 'raw_mat_ilustracion_350g_4_4',
        },
      },
      laminationResolution: {
        opp_brillo_frente: {
          frente: 'fin_opp_brillo_1c',
        },
      },
      additionalFinishingsResolution: {
        puntas_redondeadas: 'fin_puntas_redondeadas',
      },
      // PERFORACION siempre requerida por compatibilidad.requiredProcesses.
      // No se expone al cliente; se resuelve automáticamente aquí.
      processResolution: {
        PERFORACION: 'fin_perforacion',
      },
    },
  },
};

// ─── 4. Adhesivos & Stickers ──────────────────────────────────────────────────
// Base: Papel autoadhesivo obra / ilustración brillo 90g (lista-print p. 1).
// Modelo de pricing: STICKER_TABLE comercial versionada en pricing.matrix (lookup directo + modificadores).
// No inventa materias primas ni terminaciones en el motor físico; resuelve directamente precios de lista oficial.
export const adhesivosStickersConfigurator: ConfiguratorVersionSeedData = {
  productSlug: 'adhesivos-stickers',
  schemaVersion: '1.0',
  status: 'ACTIVE',
  schema: {
    engine: 'IMPRESOS_PACKAGING',
    productSlug: 'adhesivos-stickers',
    fields: {
      material: {
        label: 'Material',
        type: 'select',
        required: true,
        default: 'papel_autoadhesivo_90g',
        options: [
          { id: 'papel_autoadhesivo_90g', label: 'Papel Autoadhesivo 90g (Obra / Ilustración)' },
        ],
      },
      format: {
        label: 'Medida',
        type: 'select',
        required: true,
        default: '5x5',
        options: [
          { id: '3x3', label: '3×3 cm' },
          { id: '4x4', label: '4×4 cm' },
          { id: '5x5', label: '5×5 cm' },
          { id: '6x6', label: '6×6 cm' },
          { id: '7x7', label: '7×7 cm' },
          { id: '8x8', label: '8×8 cm' },
          { id: '9x9', label: '9×9 cm' },
          { id: '10x10', label: '10×10 cm' },
        ],
      },
      shape: {
        label: 'Forma de corte',
        type: 'select',
        required: true,
        default: 'circular',
        options: [
          { id: 'circular', label: 'Circular' },
          { id: 'cuadrado', label: 'Cuadrado / Rectangular' },
        ],
      },
      lamination: {
        label: 'Terminación',
        type: 'select',
        required: true,
        default: 'sin_laca',
        options: [
          { id: 'sin_laca', label: 'Sin laca' },
          { id: 'laca_uv_brillo', label: 'Laca UV Brillo (+15% recargo)' },
        ],
      },
      quantity: {
        label: 'Cantidad',
        type: 'quantity_selector',
        required: true,
        default: 500,
        options: [
          { value: 100, label: '100 unidades' },
          { value: 200, label: '200 unidades' },
          { value: 300, label: '300 unidades' },
          { value: 500, label: '500 unidades' },
          { value: 1000, label: '1.000 unidades' },
        ],
      },
    },
  },
  compatibility: {
    uiRules: [],
  },
  pricing: {
    engine: 'STICKER_TABLE',
    matrix: {
      papel_autoadhesivo_90g: {
        '3x3':   { '100': 2859,  '200': 5244,  '300': 5322,  '500': 8870,  '1000': 16566 },
        '4x4':   { '100': 4726,  '200': 4968,  '300': 8281,  '500': 13249, '1000': 24039 },
        '5x5':   { '100': 4968,  '200': 8281,  '300': 11593, '500': 19231, '1000': 36859 },
        '6x6':   { '100': 6625,  '200': 13249, '300': 17628, '500': 28846, '1000': 53806 },
        '7x7':   { '100': 7790,  '200': 14022, '300': 19673, '500': 31780, '1000': 59366 },
        '8x8':   { '100': 10906, '200': 21811, '300': 30266, '500': 48058, '1000': 88260 },
        '9x9':   { '100': 14022, '200': 25726, '300': 37833, '500': 56876, '1000': 110654 },
        '10x10': { '100': 14022, '200': 25726, '300': 37833, '500': 56876, '1000': 110654 },
      },
    },
    modifiers: {
      laca_uv_brillo: {
        type: 'PERCENTAGE',
        value: 15,
      },
    },
  },
};

// ─── 5. Carpetas & Folders ────────────────────────────────────────────────────
// Base: Carpetas corporativas con solapa pegada en Papel Ilustración 300g (lista-low.txt p. 14).
// Modelo de pricing: TIERED_UNIT_TABLE (escalas de cantidad x opciones comerciales fijadas celda por celda).
// Solapa blanca incluida en base; solapa impresa agrega recargo unitario por escala.
export const carpetasFoldersConfigurator: ConfiguratorVersionSeedData = {
  productSlug: 'carpetas-folders',
  schemaVersion: '1.0',
  status: 'ACTIVE',
  schema: {
    engine: 'IMPRESOS_PACKAGING',
    productSlug: 'carpetas-folders',
    fields: {
      format: {
        label: 'Formato',
        type: 'select',
        required: true,
        default: 'a4',
        options: [
          { id: 'a4', label: 'A4 (21×29,7 cm cerrado)' },
        ],
      },
      material: {
        label: 'Material',
        type: 'select',
        required: true,
        default: 'ilustracion_300g',
        options: [
          { id: 'ilustracion_300g', label: 'Papel Ilustración 300g' },
        ],
      },
      printing: {
        label: 'Impresión',
        type: 'select',
        required: true,
        default: '4_0',
        options: [
          { id: '4_0', label: 'Frente solo color (4/0 - Exterior)' },
          { id: '4_4', label: 'Frente y dorso color (4/4 - Exterior e interior)' },
        ],
      },
      lamination: {
        label: 'Terminación / Laminado',
        type: 'select',
        required: true,
        default: 'sin_laminar',
        options: [
          { id: 'sin_laminar', label: 'Sin laminar' },
          { id: 'laca_uv', label: 'Laca UV' },
          { id: 'opp_brillo', label: 'Laminado OPP Brillo' },
          { id: 'opp_mate', label: 'Laminado OPP Mate' },
        ],
      },
      flap: {
        label: 'Solapa',
        type: 'select',
        required: true,
        default: 'blanca',
        options: [
          { id: 'blanca', label: 'Solapa blanca pegada (incluida)' },
          { id: 'impresa', label: 'Solapa impresa a color (+ adicional)' },
        ],
      },
      quantity: {
        label: 'Cantidad',
        type: 'quantity_input',
        required: true,
        default: 50,
        min: 1,
        max: 1000,
      },
    },
  },
  compatibility: {
    uiRules: [],
  },
  pricing: {
    engine: 'TIERED_UNIT_TABLE',
    tieredUnitTable: {
      tiers: [
        {
          minQty: 1,
          maxQty: 1,
          prices: {
            '4_0': { sin_laminar: 1762, laca_uv: 1875, opp_brillo: 1897, opp_mate: 1919 },
            '4_4': { sin_laminar: 2391, laca_uv: 2503, opp_brillo: 2526, opp_mate: 2547 },
          },
          flapSurcharge: 255,
        },
        {
          minQty: 2,
          maxQty: 25,
          prices: {
            '4_0': { sin_laminar: 1423, laca_uv: 1519, opp_brillo: 1539, opp_mate: 1557 },
            '4_4': { sin_laminar: 1920, laca_uv: 2017, opp_brillo: 2036, opp_mate: 2054 },
          },
          flapSurcharge: 216,
        },
        {
          minQty: 26,
          maxQty: 50,
          prices: {
            '4_0': { sin_laminar: 1306, laca_uv: 1393, opp_brillo: 1410, opp_mate: 1427 },
            '4_4': { sin_laminar: 1760, laca_uv: 1846, opp_brillo: 1864, opp_mate: 1880 },
          },
          flapSurcharge: 201,
        },
        {
          minQty: 51,
          maxQty: 100,
          prices: {
            '4_0': { sin_laminar: 1194, laca_uv: 1271, opp_brillo: 1287, opp_mate: 1302 },
            '4_4': { sin_laminar: 1606, laca_uv: 1683, opp_brillo: 1698, opp_mate: 1713 },
          },
          flapSurcharge: 188,
        },
        {
          minQty: 101,
          maxQty: 300,
          prices: {
            '4_0': { sin_laminar: 1213, laca_uv: 1280, opp_brillo: 1294, opp_mate: 1307 },
            '4_4': { sin_laminar: 1627, laca_uv: 1694, opp_brillo: 1708, opp_mate: 1721 },
          },
          flapSurcharge: 174,
        },
        {
          minQty: 301,
          maxQty: 500,
          prices: {
            '4_0': { sin_laminar: 1103, laca_uv: 1161, opp_brillo: 1173, opp_mate: 1184 },
            '4_4': { sin_laminar: 1476, laca_uv: 1534, opp_brillo: 1546, opp_mate: 1557 },
          },
          flapSurcharge: 161,
        },
        {
          minQty: 501,
          maxQty: 1000,
          prices: {
            '4_0': { sin_laminar: 998, laca_uv: 1031, opp_brillo: 1037, opp_mate: 1043 },
            '4_4': { sin_laminar: 1333, laca_uv: 1365, opp_brillo: 1371, opp_mate: 1377 },
          },
          flapSurcharge: 147,
        },
      ],
    },
  },
};

// ─── Stubs DRAFT para los 4 productos restantes ──────────────────────────────
const remainingImpresosSlugs = [
  'fajas-envoltorios',
  'bolsas-contenedores',
  'menus-cartas',
  'individuales-posavasos',
];

const remainingConfigurators: ConfiguratorVersionSeedData[] = remainingImpresosSlugs.map((slug) => ({
  productSlug: slug,
  schemaVersion: '1.0',
  status: 'DRAFT',
  schema: {
    engine: 'IMPRESOS_PACKAGING',
    dimensions: ['formato', 'material', 'impresion', 'terminacion', 'cantidad'],
    steps: [
      { id: 'formato',   label: 'Formato / Dimensiones',  type: 'select',          required: true,  options: [] },
      { id: 'material',  label: 'Material / Gramaje',     type: 'select',          required: true,  options: [] },
      { id: 'impresion', label: 'Impresión / Caras',      type: 'select',          required: true,  options: [] },
      { id: 'terminacion', label: 'Terminación / Laminado', type: 'select',        required: false, options: [] },
      { id: 'cantidad',  label: 'Cantidad',               type: 'quantity_stepper', required: true, options: [] },
    ],
  },
  compatibility: null,
  pricing: null,
}));

export const impresosPackagingConfigurators: ConfiguratorVersionSeedData[] = [
  tarjetasVouchersConfigurator,
  flyersDesplegablesConfigurator,
  tagsEtiquetasConfigurator,
  adhesivosStickersConfigurator,
  carpetasFoldersConfigurator,
  ...remainingConfigurators,
];


