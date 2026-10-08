export interface QuoterOptionSeed {
  key: string;
  label: string;
  required?: boolean;
  hidden?: boolean;
  defaultSelected?: boolean;
  finishingId?: string | null;
  sortOrder?: number;
  allowedSizeLabels?: string[];
}

export interface QuoterOptionGroupSeed {
  key: string;
  name: string;
  selectionMode: 'SINGLE' | 'MULTIPLE';
  required?: boolean;
  sortOrder?: number;
  options: QuoterOptionSeed[];
}

export interface QuoterOptionConfigSeed {
  productSlug: string;
  groups: QuoterOptionGroupSeed[];
}

/**
 * Semántica comercial de las opciones del cotizador.
 *
 * Esta capa no define costos ni precios. Sólo define qué combinaciones son
 * seleccionables y qué operación de producción representa cada opción.
 *
 * Las operaciones de producción existentes siguen siendo la fuente de costo.
 * No se crean costos nuevos aquí.
 */
export const quoterOptionConfigs: QuoterOptionConfigSeed[] = [
  {
    productSlug: 'tarjetas-vouchers',
    groups: [
      {
        key: 'laminado',
        name: 'Laminado',
        selectionMode: 'SINGLE',
        required: true,
        sortOrder: 0,
        options: [
          { key: 'sin_laminar', label: 'Sin laminar', sortOrder: 0 },
          {
            key: 'opp_mate_frente',
            label: 'Laminado OPP Mate · Frente',
            finishingId: 'fin_opp_mate_1c',
            sortOrder: 1,
          },
          {
            key: 'opp_mate_ambas',
            label: 'Laminado OPP Mate · Ambas caras',
            finishingId: 'fin_opp_mate_2c',
            sortOrder: 2,
          },
          {
            key: 'opp_brillo_frente',
            label: 'Laminado OPP Brillo · Frente',
            finishingId: 'fin_opp_brillo_1c',
            sortOrder: 3,
          },
          {
            key: 'opp_brillo_ambas',
            label: 'Laminado OPP Brillo · Ambas caras',
            finishingId: 'fin_opp_brillo_2c',
            sortOrder: 4,
          },
        ],
      },
      {
        key: 'terminaciones',
        name: 'Terminaciones',
        selectionMode: 'MULTIPLE',
        required: false,
        sortOrder: 1,
        options: [
          {
            key: 'laca_uv_sectorizada',
            label: 'Laca UV sectorizada',
            finishingId: 'fin_laca_uv_sectorizada',
            sortOrder: 0,
          },
          {
            key: 'puntas_redondeadas',
            label: 'Puntas redondeadas',
            finishingId: 'fin_puntas_redondeadas',
            sortOrder: 1,
          },
          {
            key: 'perforacion',
            label: 'Perforación / Ojalillo',
            finishingId: 'fin_perforacion',
            sortOrder: 2,
          },
        ],
      },
      {
        key: 'procesos',
        name: 'Procesos',
        selectionMode: 'MULTIPLE',
        required: false,
        sortOrder: 2,
        options: [
          {
            key: 'hendido_central',
            label: 'Hendido central',
            hidden: true,
            finishingId: 'fin_hendido_central',
            allowedSizeLabels: ['9x10 cm'],
            sortOrder: 0,
          },
        ],
      },
    ],
  },
  {
    productSlug: 'flyers-desplegables',
    groups: [
      {
        key: 'plegado',
        name: 'Tipo de folleto',
        selectionMode: 'SINGLE',
        required: true,
        sortOrder: 0,
        options: [
          {
            key: 'plano',
            label: 'Flyer / Volante plano',
            sortOrder: 0,
          },
          {
            key: 'diptico',
            label: 'Díptico',
            finishingId: 'fin_doblado_diptico',
            allowedSizeLabels: ['10x15 cm', '10x20 cm', '15x21 cm'],
            sortOrder: 1,
          },
          {
            key: 'triptico',
            label: 'Tríptico',
            finishingId: 'fin_doblado_triptico',
            allowedSizeLabels: ['A4'],
            sortOrder: 2,
          },
        ],
      },
    ],
  },
  {
    productSlug: 'tags-etiquetas',
    groups: [
      {
        key: 'laminado',
        name: 'Laminado',
        selectionMode: 'SINGLE',
        required: true,
        sortOrder: 0,
        options: [
          {
            key: 'sin_laminar',
            label: 'Sin laminar',
            sortOrder: 0,
          },
          {
            key: 'opp_brillo_frente',
            label: 'Laminado OPP Brillo · Frente',
            finishingId: 'fin_opp_brillo_1c',
            sortOrder: 1,
          },
        ],
      },
      {
        key: 'terminaciones',
        name: 'Terminaciones',
        selectionMode: 'MULTIPLE',
        required: false,
        sortOrder: 1,
        options: [
          {
            key: 'puntas_redondeadas',
            label: 'Puntas redondeadas',
            finishingId: 'fin_puntas_redondeadas',
            sortOrder: 0,
          },
        ],
      },
      {
        key: 'procesos',
        name: 'Procesos',
        selectionMode: 'MULTIPLE',
        required: false,
        sortOrder: 2,
        options: [
          {
            key: 'perforacion',
            label: 'Perforación / Ojalillo',
            required: true,
            hidden: true,
            defaultSelected: true,
            finishingId: 'fin_perforacion',
            sortOrder: 0,
          },
        ],
      },
    ],
  },
];
