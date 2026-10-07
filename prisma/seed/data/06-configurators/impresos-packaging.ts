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
    // Costo real de proveedor: tarjetas terminadas, listas para entregar.
    // No representa precio de venta ZAP ni una materia prima.
    // Costo maestro de proveedor: producto terminado, sin IVA.
    // Una sola fuente de verdad: no se conservan listas alternativas.
    // Cuando existe más de un costo para la misma combinación, queda el mayor.
    providerFinishedCostMatrix: {
      currency: 'ARS',
      taxIncluded: false,
      paymentCondition: 'PAGO_ANTICIPADO',
      // Impresión digital para producción on-demand.
      // Estos costos son de proveedor terminado, sin IVA, y no son precios de venta ZAP.
      // La lista de 350g ya trae aplicado el recargo del 10%; no debe volver a calcularse.
      digitalOndemand: {
        source: 'DIGITAL_ONDEMAND',
        taxIncluded: false,
        paperSurcharges: {
          ilustracion_350g: 10,
        },
        cards: {
          ilustracion_350g: {
            note: 'Tarjetas — Papel Ilustración 350g. Recargo del 10% ya incluido en los importes de la lista.',
            quantities: {
              '100': {
                '4_0': { sin_laminar: 5210, laca_uv: 7009, laminado_brillo: 7009, laminado_mate: 7009 },
                '4_4': { sin_laminar: 8213, laca_uv: 9034, laminado_brillo: 9034, laminado_mate: 9856 },
              },
              '200': {
                '4_0': { sin_laminar: 8143, laca_uv: 10216, laminado_brillo: 10247, laminado_mate: 10435 },
                '4_4': { sin_laminar: 12361, laca_uv: 13487, laminado_brillo: 13487, laminado_mate: 14989 },
              },
              '300': {
                '4_0': { sin_laminar: 11596, laca_uv: 13735, laminado_brillo: 13968, laminado_mate: 14123 },
                '4_4': { sin_laminar: 17029, laca_uv: 18423, laminado_brillo: 18423, laminado_mate: 20126 },
              },
              '500': {
                '4_0': { sin_laminar: 19219, laca_uv: 31530, laminado_brillo: 32037, laminado_mate: 32797 },
                '4_4': { sin_laminar: 39930, laca_uv: 42465, laminado_brillo: 42972, laminado_mate: 47534 },
              },
              '1000': {
                '4_0': { sin_laminar: 36475, laca_uv: 39350, laminado_brillo: 39925, laminado_mate: 41404 },
                '4_4': { sin_laminar: 49863, laca_uv: 52738, laminado_brillo: 53313, laminado_mate: 59719 },
              },
            },
          },
          ilustracion_300g: {
            note: 'Tarjetas personales / postales — Papel Ilustración 300g. Cuando la fuente no indica medida, se interpreta como formato estándar 9x5 cm.',
            quantities: {
              '100': {
                '4_0': { sin_laminar: 13031, laca_uv: 14374, laminado_brillo: 14703, laminado_mate: 14703 },
                '4_4': { sin_laminar: 17591, laca_uv: 17591, laminado_brillo: 17591, laminado_mate: 21534 },
              },
              '200': {
                '4_0': { sin_laminar: 23485, laca_uv: 26634, laminado_brillo: 26724, laminado_mate: 27263 },
                '4_4': { sin_laminar: 32800, laca_uv: 32800, laminado_brillo: 32800, laminado_mate: 40357 },
              },
              '300': {
                '4_0': { sin_laminar: 32792, laca_uv: 36383, laminado_brillo: 37101, laminado_mate: 37580 },
                '4_4': { sin_laminar: 45797, laca_uv: 45797, laminado_brillo: 45797, laminado_mate: 55372 },
              },
              '500': {
                '4_0': { sin_laminar: 50663, laca_uv: 55920, laminado_brillo: 56971, laminado_mate: 58548 },
                '4_4': { sin_laminar: 70823, laca_uv: 70823, laminado_brillo: 70823, laminado_mate: 86594 },
              },
              '1000': {
                '4_0': { sin_laminar: 94443, laca_uv: 103643, laminado_brillo: 105483, laminado_mate: 110214 },
                '4_4': { sin_laminar: 132243, laca_uv: 132243, laminado_brillo: 132243, laminado_mate: 163784 },
              },
            },
          },
        },
        finishing: {
          agujereado_3mm: {
            '100': 1350,
            '200': 1800,
            '300': 2700,
            '500': 3225,
            '1000': 4500,
            additionalPerThousand: 1778,
          },
          puntas_redondeadas: {
            '100': 1350,
            '200': 1800,
            '300': 2700,
            '500': 3225,
            '1000': 4500,
            additionalPerThousand: 1778,
          },
          express_48h: { surchargePercent: 30 },
          express_24h: { surchargePercent: 50 },
        },
      },
      tiers: {
        clasicas: {
          delivery: '7_8_DIAS',
          finishes: {
            sin_laminar: {
              printing: {
                '4_0': {
                  '9x5': { '500': 21000, '1000': 35211 },
                },
                '4_4': {
                  '9x5': { '500': 27264, '1000': 45477, '3000': 35000, '5000': 34000 },
                },
              },
            },
            opp_brillo: {
              printing: {
                '4_0': {
                  '9x3': { '500': 11090, '1000': 15842 },
                  '9x5': { '500': 24173, '1000': 40316 },
                  '9x10': { '500': 32621, '1000': 46602 },
                  '5x18': { '500': 32621, '1000': 46602 },
                  '9x15': { '500': 49536, '1000': 70766 },
                  '10x15': { '500': 66681, '1000': 111228 },
                  '10x18': { '500': 64236, '1000': 91765 },
                  '15x20': { '500': 111557, '1000': 159367 },
                  '15x30': { '500': 158475, '1000': 226393 },
                },
                '4_1': {
                  '9x3': { '500': 14485, '1000': 18403 },
                  '9x5': { '500': 22150, '1000': 29342 },
                  '9x10': { '500': 41280, '1000': 54656 },
                  '5x18': { '500': 41280, '1000': 54656 },
                  '9x15': { '500': 62826, '1000': 81697 },
                  '10x15': { '500': 66853, '1000': 91765 },
                  '10x18': { '500': 83164, '1000': 109600 },
                  '15x20': { '500': 133304, '1000': 181804 },
                  '15x30': { '500': 200359, '1000': 275008 },
                },
                '4_4': {
                  '9x3': { '500': 12882, '1000': 20693 },
                  '9x5': { '500': 31541, '1000': 51989 },
                  '9x10': { '500': 38259, '1000': 58971 },
                  '5x18': { '500': 38259, '1000': 58971 },
                  '9x15': { '500': 57188, '1000': 89752 },
                  '10x15': { '500': 81685, '1000': 136276 },
                  '10x18': { '500': 76720, '1000': 118806 },
                  '15x20': { '500': 127263, '1000': 190434 },
                  '15x30': { '500': 192506, '1000': 286227 },
                },
              },
            },
          },
        },
        premium: {
          delivery: '12_DIAS',
          finishes: {
            opp_mate: {
              printing: {
                '4_4': {
                  '9x3': { '500': 21176, '1000': 30014 },
                  '9x5': { '500': 31000, '1000': 53000, '3000': 38000, '5000': 37000 },
                  '9x10': { '500': 47900, '1000': 69033 },
                  '5x18': { '500': 47900, '1000': 69033 },
                  '9x15': { '500': 70353, '1000': 101350 },
                  '10x15': { '500': 73346, '1000': 122295 },
                  '10x18': { '500': 95159, '1000': 136966 },
                  '15x20': { '500': 143914, '1000': 207318 },
                  '15x30': { '500': 203576, '1000': 293279 },
                },
                '4_0': {
                  '9x5': { '500': 43573, '1000': 61233 },
                  '10x15': { '500': 98500, '1000': 154473 },
                },
              },
            },
          },
        },
        deluxe: {
          delivery: '15_DIAS',
          finishes: {
            opp_mate_laca_uv_sectorizada: {
              printing: {
                '4_4': {
                  sectorizedSides: {
                    frente: {
                      '9x5': { '500': 31000, '1000': 39000, '3000': 38000, '5000': 37000 },
                    },
                    frente_y_dorso: {
                      '9x5': { '500': 35000, '1000': 44000, '3000': 43000, '5000': 42000 },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
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
    // Costo real de proveedor: offset 4/4, producto terminado, empaquetado y con caja.
    // No representa precio de venta ZAP ni una materia prima; es costo de producción tercerizada.
    providerFinishedCostMatrix: {
      source: 'PROMO_DIRECTA_OFFSET',
      currency: 'ARS',
      taxIncluded: false,
      paymentCondition: 'PAGO_ANTICIPADO',
      delivery: 'NORMAL_5_7_DIAS',
      includes: ['IMPRESION_OFFSET_4_4', 'TERMINACION', 'EMPAQUETADO', 'CAJA'],
      validity: 'JUNIO_JULIO_2026',
      matrix: {
        obra_80g: {
          '10x15': { '1000': 23000, '2500': 46000, '5000': 50000 },
          '15x20': { '1000': 46000, '2500': 92000, '5000': 100000 },
          '20x30': { '1000': 92000, '2500': 184000, '5000': 200000 },
          '30x40': { '1000': 184000, '2500': 368000, '5000': 400000 },
        },
        ilustracion_115g: {
          '10x15': { '1000': 25000, '2500': 50000, '5000': 70000 },
          '15x20': { '1000': 50000, '2500': 100000, '5000': 140000 },
          '20x30': { '1000': 100000, '2500': 200000, '5000': 280000 },
          '30x40': { '1000': 200000, '2500': 400000, '5000': 560000 },
        },
        ilustracion_150g: {
          '10x15': { '1000': 32000, '2500': 64000, '5000': 85000 },
          '15x20': { '1000': 64000, '2500': 128000, '5000': 170000 },
          '20x30': { '1000': 128000, '2500': 256000, '5000': 340000 },
          '30x40': { '1000': 256000, '2500': 512000, '5000': 680000 },
        },
      // Impresión digital on-demand — Ricoh Pro C9200.
      // Lista económica/promocional, sin IVA.
      // No se mezcla con la matriz offset: es un canal de producción distinto.
      digitalOndemand: {
        source: 'DIGITAL_ON_DEMAND_RICOH_PRO_C9200',
        taxIncluded: false,
        deliverySurcharges: {
          express_3_4_dias: 15,
          super_express_48h: 30,
          ya_24h: 50,
        },
        fullColor: {
          'ilustracion_150g': {
            '10x10': {
              '100': { '4_0': 8782, '4_4': 12974 },
              '200': { '4_0': 16442, '4_4': 24359 },
              '300': { '4_0': 24159, '4_4': 35802 },
              '500': { '4_0': 38268, '4_4': 56743 },
              '1000': { '4_0': 71872, '4_4': 106648 },
            },
            '10x15': {
              '100': { '4_0': 11633, '4_4': 17222 },
              '200': { '4_0': 22143, '4_4': 32855 },
              '300': { '4_0': 30916, '4_4': 45872 },
              '500': { '4_0': 47876, '4_4': 71060 },
              '1000': { '4_0': 89610, '4_4': 133080 },
            },
            '15x21': {
              '100': { '4_0': 23986, '4_4': 35630 },
              '200': { '4_0': 45160, '4_4': 67154 },
              '300': { '4_0': 63752, '4_4': 94802 },
              '500': { '4_0': 99559, '4_4': 148075 },
              '1000': { '4_0': 198888, '4_4': 295920 },
            },
            'a4': {
              '100': { '4_0': 45103, '4_4': 67097 },
              '200': { '4_0': 84754, '4_4': 126154 },
              '300': { '4_0': 119184, '4_4': 177402 },
              '500': { '4_0': 198543, '4_4': 295575 },
              '1000': { '4_0': 370461, '4_4': 551586 },
            },
          },
          'ilustracion_80g_115g': {
            '10x10': {
              '100': { '4_0': 7637, '4_4': 11282 },
              '200': { '4_0': 14297, '4_4': 21182 },
              '300': { '4_0': 21008, '4_4': 31133 },
              '500': { '4_0': 33277, '4_4': 49342 },
              '1000': { '4_0': 62497, '4_4': 92737 },
            },
            '10x15': {
              '100': { '4_0': 10116, '4_4': 14976 },
              '200': { '4_0': 19255, '4_4': 28570 },
              '300': { '4_0': 26884, '4_4': 39889 },
              '500': { '4_0': 41632, '4_4': 61792 },
              '1000': { '4_0': 77922, '4_4': 115722 },
            },
            '15x21': {
              '100': { '4_0': 20858, '4_4': 30983 },
              '200': { '4_0': 39270, '4_4': 58395 },
              '300': { '4_0': 55437, '4_4': 82437 },
              '500': { '4_0': 86573, '4_4': 128761 },
              '1000': { '4_0': 172946, '4_4': 257321 },
            },
            'a4': {
              '100': { '4_0': 39220, '4_4': 58345 },
              '200': { '4_0': 73699, '4_4': 109699 },
              '300': { '4_0': 103638, '4_4': 154263 },
              '500': { '4_0': 172646, '4_4': 257021 },
              '1000': { '4_0': 322140, '4_4': 479640 },
            },
          },
        },
        grayscale: {
          'ilustracion_150g': {
            '10x10': {
              '100': { '1_0': 2846, '1_1': 3852 },
              '200': { '1_0': 5229, '1_1': 7130 },
              '300': { '1_0': 7670, '1_1': 10464 },
              '500': { '1_0': 12784, '1_1': 17479 },
              '1000': { '1_0': 23982, '1_1': 32850 },
            },
            '10x15': {
              '100': { '1_0': 3718, '1_1': 5060 },
              '200': { '1_0': 6974, '1_1': 9545 },
              '300': { '1_0': 10286, '1_1': 14087 },
              '500': { '1_0': 15950, '1_1': 21862 },
              '1000': { '1_0': 29861, '1_1': 40989 },
            },
            '15x21': {
              '100': { '1_0': 7497, '1_1': 10292 },
              '200': { '1_0': 14822, '1_1': 20411 },
              '300': { '1_0': 20994, '1_1': 28911 },
              '500': { '1_0': 32875, '1_1': 45295 },
              '1000': { '1_0': 65520, '1_1': 90360 },
            },
            'a4': {
              '100': { '1_0': 14765, '1_1': 20354 },
              '200': { '1_0': 27742, '1_1': 38299 },
              '300': { '1_0': 39162, '1_1': 54066 },
              '500': { '1_0': 65175, '1_1': 90015 },
              '1000': { '1_0': 130120, '1_1': 179800 },
            },
          },
          'ilustracion_80g_115g': {
            '10x10': {
              '100': { '1_0': 2475, '1_1': 3350 },
              '200': { '1_0': 4547, '1_1': 6200 },
              '300': { '1_0': 6670, '1_1': 9100 },
              '500': { '1_0': 11117, '1_1': 15199 },
              '1000': { '1_0': 20854, '1_1': 28565 },
            },
            '10x15': {
              '100': { '1_0': 3233, '1_1': 4400 },
              '200': { '1_0': 6064, '1_1': 8300 },
              '300': { '1_0': 8945, '1_1': 12249 },
              '500': { '1_0': 13869, '1_1': 19010 },
              '1000': { '1_0': 25966, '1_1': 35643 },
            },
            '15x21': {
              '100': { '1_0': 6520, '1_1': 8950 },
              '200': { '1_0': 12889, '1_1': 17749 },
              '300': { '1_0': 18255, '1_1': 25140 },
              '500': { '1_0': 28587, '1_1': 39387 },
              '1000': { '1_0': 56974, '1_1': 78574 },
            },
            'a4': {
              '100': { '1_0': 12839, '1_1': 17699 },
              '200': { '1_0': 24124, '1_1': 33304 },
              '300': { '1_0': 34054, '1_1': 47014 },
              '500': { '1_0': 56674, '1_1': 78274 },
              '1000': { '1_0': 113147, '1_1': 156347 },
            },
          },
        },
        note: 'La fuente digital agrupa Papel 80g y 115g Ilustración en una misma tarifa; no se inventa una diferencia de costo entre ambos.',
      }
      },
    },
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

// ─── Papelería digital on-demand: membretes y sobres ──────────────────────────
// Lista Print, pág. 20. Impresión digital on-demand, sin IVA.
// Esta fuente se conserva como costo de proveedor terminado; no modifica ni
// reemplaza ninguna matriz anterior.
//
// Membretes: A4, Papel Obra 80g.
// Sobres: Papel Obra 63g, blanco, impresión 4/0.
// La impresión de sobres no cubre el 100% de la cara.
export const papeleriaDigitalOndemandMembretesSobresProviderCostMatrix = {
  source: 'LISTA_PRINT_PAG_20',
  currency: 'ARS',
  taxIncluded: false,
  sourceType: 'DIGITAL_ON_DEMAND',
  printer: 'RICOH_PRO_C9200',
  membretes: {
    material: 'obra_80g',
    format: 'a4',
    printing: {
      '1_0': { '100': 748, '200': 692, '300': 654, '500': 617, '1000': 580 },
      '4_0': { '100': 844, '200': 774, '300': 727, '500': 680, '1000': 633 },
    },
  },
  sobres: {
    material: 'obra_63g',
    color: 'blanco',
    printing: '4_0',
    note: 'La impresión no puede cubrir el 100% de la cara del sobre.',
    sizes: {
      '22.9x32.4': { label: 'Sobre bolsa A4', '100': 795, '200': 732, '300': 690, '500': 648, '1000': 606 },
      '27x37': { label: 'Sobre bolsa', '100': 520, '200': 498, '300': 484, '500': 469, '1000': 455 },
      '25x35.3': { label: 'Sobre bolsa Oficio', '100': 748, '200': 692, '300': 654, '500': 617, '1000': 580 },
      '12x23.5': { label: 'Sobre inglés', '100': 844, '200': 774, '300': 727, '500': 680, '1000': 633 },
    },
  },
};

// ─── 5. Carpetas & Folders ────────────────────────────────────────────────────
// Base: Carpetas corporativas con solapa pegada en Papel Ilustración 300g (lista-low.txt p. 14).
// Modelo de pricing: TIERED_UNIT_TABLE (escalas de cantidad x opciones comerciales fijadas celda por celda).
// Solapa blanca incluida en base; solapa impresa agrega recargo unitario por escala.
const carpetasDigital300gTiers = [
  { minQty: 1, maxQty: 1, prices: { '4_0': { sin_laminar: 2602, laca_uv: 2739, opp_brillo: 2766, opp_mate: 2792 }, '4_4': { sin_laminar: 3493, laca_uv: 3630, opp_brillo: 3657, opp_mate: 3683 } }, flapSurcharge: 647 },
  { minQty: 2, maxQty: 25, prices: { '4_0': { sin_laminar: 1825, laca_uv: 1943, opp_brillo: 1966, opp_mate: 1989 }, '4_4': { sin_laminar: 2433, laca_uv: 2550, opp_brillo: 2574, opp_mate: 2596 } }, flapSurcharge: 417 },
  { minQty: 26, maxQty: 50, prices: { '4_0': { sin_laminar: 1647, laca_uv: 1753, opp_brillo: 1774, opp_mate: 1794 }, '4_4': { sin_laminar: 2190, laca_uv: 2296, opp_brillo: 2317, opp_mate: 2337 } }, flapSurcharge: 367 },
  { minQty: 51, maxQty: 100, prices: { '4_0': { sin_laminar: 1478, laca_uv: 1571, opp_brillo: 1590, opp_mate: 1608 }, '4_4': { sin_laminar: 1960, laca_uv: 2054, opp_brillo: 2073, opp_mate: 2091 } }, flapSurcharge: 322 },
  { minQty: 101, maxQty: 300, prices: { '4_0': { sin_laminar: 1338, laca_uv: 1420, opp_brillo: 1437, opp_mate: 1453 }, '4_4': { sin_laminar: 1770, laca_uv: 1852, opp_brillo: 1869, opp_mate: 1885 } }, flapSurcharge: 285 },
  { minQty: 301, maxQty: 500, prices: { '4_0': { sin_laminar: 1186, laca_uv: 1257, opp_brillo: 1271, opp_mate: 1284 }, '4_4': { sin_laminar: 1564, laca_uv: 1635, opp_brillo: 1649, opp_mate: 1662 } }, flapSurcharge: 247 },
  { minQty: 501, maxQty: 1000, prices: { '4_0': { sin_laminar: 1118, laca_uv: 1157, opp_brillo: 1165, opp_mate: 1172 }, '4_4': { sin_laminar: 1469, laca_uv: 1508, opp_brillo: 1516, opp_mate: 1523 } }, flapSurcharge: 199 },
] as const;

export const carpetasFoldersConfigurator: ConfiguratorVersionSeedData = {
  productSlug: 'carpetas-folders',
  schemaVersion: '1.0',
  status: 'ACTIVE',
  schema: {
    engine: 'IMPRESOS_PACKAGING',
    productSlug: 'carpetas-folders',
    fields: {
      format: { label: 'Formato', type: 'select', required: true, default: 'a4', options: [{ id: 'a4', label: 'A4 (21×29,7 cm cerrado)' }] },
      material: { label: 'Material', type: 'select', required: true, default: 'ilustracion_300g', options: [
        { id: 'ilustracion_300g', label: 'Papel Ilustración 300g' },
        { id: 'ilustracion_350g', label: 'Papel Ilustración 350g' },
      ] },
      printing: { label: 'Impresión', type: 'select', required: true, default: '4_0', options: [
        { id: '4_0', label: 'Frente solo color (4/0)' },
        { id: '4_1', label: 'Frente color + dorso negro (4/1)' },
        { id: '4_4', label: 'Frente y dorso color (4/4)' },
      ] },
      lamination: { label: 'Terminación / Laminado', type: 'select', required: true, default: 'sin_laminar', options: [
        { id: 'sin_laminar', label: 'Sin laminar' }, { id: 'laca_uv', label: 'Laca UV' }, { id: 'opp_brillo', label: 'Laminado OPP Brillo' }, { id: 'opp_mate', label: 'Laminado OPP Mate' },
      ] },
      flap: { label: 'Solapa', type: 'select', required: true, default: 'blanca', options: [
        { id: 'blanca', label: 'Solapa blanca pegada (incluida)' }, { id: 'impresa', label: 'Solapa impresa a color' },
      ] },
      quantity: { label: 'Cantidad', type: 'quantity_input', required: true, default: 50, min: 1, max: 1000 },
    },
  },
  compatibility: { uiRules: [] },
  pricing: {
    engine: 'TIERED_UNIT_TABLE',
    tieredUnitTable: { tiers: carpetasDigital300gTiers },
    providerFinishedCostMatrix: {
      currency: 'ARS', taxIncluded: false, paymentCondition: 'PAGO_ANTICIPADO',
      digital_300g: { material: 'ilustracion_300g', format: 'a4', tiers: carpetasDigital300gTiers },
      offset_350g: {
        material: 'ilustracion_350g', format: 'a4_oficio', delivery: '14_DIAS',
        clasicas_opp_brillo: {
          '4_0': { '500': 793912, '1000': 1162731 },
          '4_1': { '500': 847732, '1000': 1239617 },
          '4_4': { '500': 900356, '1000': 1314794 },
        },
        premium_opp_mate: {
          '4_0': { '500': 754652, '1000': 1100271 },
          '4_4': { '500': 1006202, '1000': 1467028 },
        },
        deluxe_opp_mate_sectorizado_uv: {
          '4_0': { '500': 1325534, '1000': 1694667 },
          '4_4': { '500': 1485200, '1000': 1894000 },
        },
      },
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




// Costos Digital On-Demand: DTF, cuadernos e imanes.
// Fuente: Lista Print / abril 2026. Costos de proveedor terminado, sin IVA.

export const digitalOndemandDtfProviderCostMatrix = {
  source: 'LISTA_PRINT_ABRIL_2026',
  currency: 'ARS',
  taxIncluded: false,
  printer: 'RICOH_PRO_C9200',
  dtfUv: { printableArea: '29x45', printerWidthCm: 30, sourcePrice: 8800, priceUnit: 'FUENTE_NO_ESPECIFICA', date: '2026-04' },
  dtfTextil: {
    widthCm: 58,
    minimumLinearMeters: 0.5,
    upToOneLinearMeter: 22000,
    overOneLinearMeter: { pricingMode: 'PROPORCIONAL_AL_METRO', sourceText: '275 275000', resolved: false },
    date: '2026-04',
  },
} as const;

export const digitalOndemandCuadernosProviderCostMatrix = {
  source: 'LISTA_PRINT',
  currency: 'ARS',
  taxIncluded: false,
  printer: 'RICOH_PRO_C9200',
  minimumQuantity: 2,
  escolar: { binding: 'ABROCHADO', cover: 'FULLCOLOR_CMYK_300G', formats: { a5: { '24_pag': 1140, '48_pag': 1620 }, a4: { '24_pag': 2160, '48_pag': 3180 } } },
  universitario: { binding: ['RING_WIRE', 'BINDER_TIPO_LIBRO'], cover: 'FULLCOLOR_CMYK_300G', formats: { a5: { '100_pag': 2760, '160_pag': 3480 }, a4: { '100_pag': 4080, '160_pag': 4880 } } },
  agendas2026: { minimumQuantity: 2, format: 'A5', priceProvided: false },
} as const;

export const digitalOndemandImanesTroqueladoProviderCostMatrix = {
  source: 'LISTA_PRINT',
  currency: 'ARS',
  taxIncluded: false,
  printer: 'RICOH_PRO_C9200',
  planchaImanSinMontar: { sheet: '31x46cm', thicknessMm: 0.3, printableArea: '30x46cm', printing: '4_0', cut: 'LINEAL_UNICAMENTE', sheetPrice: 1500, quantityTiers: { '1': 3642, '2_25': 3011, '26_50': 2853, '51_100': 2695, '101_300': 2537, '301_500': 2379 } },
  papelAutoadhesivo: { sourceFormat: 'A3_PLUS_32x47', printableArea: '30x46cm', printing: '4_0', cut: 'TROQUELADO_DIGITAL', quantityTiers: { '1': 3129, '2_25': 2560, '26_50': 2418, '51_100': 2276, '101_300': 2133, '301_500': 1991 }, note: 'La diferencia de area corresponde a las pinzas de la impresora.' },
} as const;
