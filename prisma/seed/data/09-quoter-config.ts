import { FinishingCostType } from '@prisma/client';

export interface RawMaterialSeedItem {
  id: string;
  name: string;
  width: number;
  height: number;
  unit: string;
  tiers: Array<{
    minQty: number;
    maxQty: number | null;
    unitPrice: number;
  }>;
}

export interface FinishingOperationSeedItem {
  id: string;
  name: string;
  costType: FinishingCostType;
  tiers: Array<{
    minQty: number;
    maxQty: number | null;
    unitPrice: number;
  }>;
}

export interface ProductQuoterConfigSeedItem {
  productSlug: string;
  pricingMode: string;
  margin: number;
  bleed: number;
  profitMargin: number;
  minProfitMargin: number;
  maxProfitMargin: number;
  allowCustomSize: boolean;
  rawMaterialIds: string[];
  finishingIds: string[];
  sizePresets: Array<{ label: string; width: number; height: number; sortOrder: number }>;
  quantityPresets: Array<{ quantity: number; sortOrder: number }>;
}

export const sheetRawMaterials: RawMaterialSeedItem[] = [
  // Tarjetas & Vouchers
  {
    id: 'raw_mat_ilustracion_350g_4_4',
    name: 'Papel Ilustración 350g (4/4 - Frente y Dorso)',
    width: 32,
    height: 47,
    unit: 'PLIEGO',
    tiers: [
      { minQty: 1, maxQty: 10, unitPrice: 324.5 },
      { minQty: 11, maxQty: 50, unitPrice: 286.0 },
      { minQty: 51, maxQty: 100, unitPrice: 253.0 },
      { minQty: 101, maxQty: 500, unitPrice: 225.5 },
      { minQty: 501, maxQty: null, unitPrice: 203.5 },
    ],
  },
  {
    id: 'raw_mat_ilustracion_350g_4_0',
    name: 'Papel Ilustración 350g (4/0 - Frente)',
    width: 32,
    height: 47,
    unit: 'PLIEGO',
    tiers: [
      { minQty: 1, maxQty: 10, unitPrice: 203.5 },
      { minQty: 11, maxQty: 50, unitPrice: 181.5 },
      { minQty: 51, maxQty: 100, unitPrice: 159.5 },
      { minQty: 101, maxQty: 500, unitPrice: 143.0 },
      { minQty: 501, maxQty: null, unitPrice: 129.8 },
    ],
  },
  {
    id: 'raw_mat_ilustracion_300g_4_4',
    name: 'Papel Ilustración 300g (4/4 - Frente y Dorso)',
    width: 32,
    height: 47,
    unit: 'PLIEGO',
    tiers: [
      { minQty: 1, maxQty: 10, unitPrice: 295.0 },
      { minQty: 11, maxQty: 50, unitPrice: 260.0 },
      { minQty: 51, maxQty: 100, unitPrice: 230.0 },
      { minQty: 101, maxQty: 500, unitPrice: 205.0 },
      { minQty: 501, maxQty: null, unitPrice: 185.0 },
    ],
  },
  {
    id: 'raw_mat_ilustracion_300g_4_0',
    name: 'Papel Ilustración 300g (4/0 - Frente)',
    width: 32,
    height: 47,
    unit: 'PLIEGO',
    tiers: [
      { minQty: 1, maxQty: 10, unitPrice: 185.0 },
      { minQty: 11, maxQty: 50, unitPrice: 165.0 },
      { minQty: 51, maxQty: 100, unitPrice: 145.0 },
      { minQty: 101, maxQty: 500, unitPrice: 130.0 },
      { minQty: 501, maxQty: null, unitPrice: 118.0 },
    ],
  },
  // Flyers & Desplegables
  {
    id: 'raw_mat_obra_80g_4_0',
    name: 'Papel Obra 80g (4/0 - Frente)',
    width: 32,
    height: 47,
    unit: 'PLIEGO',
    tiers: [
      { minQty: 1, maxQty: 10, unitPrice: 140.0 },
      { minQty: 11, maxQty: 50, unitPrice: 125.0 },
      { minQty: 51, maxQty: 100, unitPrice: 110.0 },
      { minQty: 101, maxQty: 500, unitPrice: 95.0 },
      { minQty: 501, maxQty: null, unitPrice: 85.0 },
    ],
  },
  {
    id: 'raw_mat_obra_80g_4_4',
    name: 'Papel Obra 80g (4/4 - Frente y Dorso)',
    width: 32,
    height: 47,
    unit: 'PLIEGO',
    tiers: [
      { minQty: 1, maxQty: 10, unitPrice: 220.0 },
      { minQty: 11, maxQty: 50, unitPrice: 195.0 },
      { minQty: 51, maxQty: 100, unitPrice: 170.0 },
      { minQty: 101, maxQty: 500, unitPrice: 150.0 },
      { minQty: 501, maxQty: null, unitPrice: 135.0 },
    ],
  },
  {
    id: 'raw_mat_ilustracion_115g_4_0',
    name: 'Papel Ilustración 115g (4/0 - Frente)',
    width: 32,
    height: 47,
    unit: 'PLIEGO',
    tiers: [
      { minQty: 1, maxQty: 10, unitPrice: 160.0 },
      { minQty: 11, maxQty: 50, unitPrice: 140.0 },
      { minQty: 51, maxQty: 100, unitPrice: 125.0 },
      { minQty: 101, maxQty: 500, unitPrice: 110.0 },
      { minQty: 501, maxQty: null, unitPrice: 100.0 },
    ],
  },
  {
    id: 'raw_mat_ilustracion_115g_4_4',
    name: 'Papel Ilustración 115g (4/4 - Frente y Dorso)',
    width: 32,
    height: 47,
    unit: 'PLIEGO',
    tiers: [
      { minQty: 1, maxQty: 10, unitPrice: 250.0 },
      { minQty: 11, maxQty: 50, unitPrice: 220.0 },
      { minQty: 51, maxQty: 100, unitPrice: 195.0 },
      { minQty: 101, maxQty: 500, unitPrice: 175.0 },
      { minQty: 501, maxQty: null, unitPrice: 155.0 },
    ],
  },
  {
    id: 'raw_mat_ilustracion_150g_4_0',
    name: 'Papel Ilustración 150g (4/0 - Frente)',
    width: 32,
    height: 47,
    unit: 'PLIEGO',
    tiers: [
      { minQty: 1, maxQty: 10, unitPrice: 180.0 },
      { minQty: 11, maxQty: 50, unitPrice: 160.0 },
      { minQty: 51, maxQty: 100, unitPrice: 140.0 },
      { minQty: 101, maxQty: 500, unitPrice: 125.0 },
      { minQty: 501, maxQty: null, unitPrice: 115.0 },
    ],
  },
  {
    id: 'raw_mat_ilustracion_150g_4_4',
    name: 'Papel Ilustración 150g (4/4 - Frente y Dorso)',
    width: 32,
    height: 47,
    unit: 'PLIEGO',
    tiers: [
      { minQty: 1, maxQty: 10, unitPrice: 280.0 },
      { minQty: 11, maxQty: 50, unitPrice: 250.0 },
      { minQty: 51, maxQty: 100, unitPrice: 220.0 },
      { minQty: 101, maxQty: 500, unitPrice: 195.0 },
      { minQty: 501, maxQty: null, unitPrice: 175.0 },
    ],
  },
];

export const sheetFinishingOperations: FinishingOperationSeedItem[] = [
  {
    id: 'fin_opp_mate_1c',
    name: 'Laminado OPP Mate (Frente)',
    costType: 'PER_SHEET',
    tiers: [
      { minQty: 1, maxQty: 10, unitPrice: 380 },
      { minQty: 11, maxQty: 50, unitPrice: 350 },
      { minQty: 51, maxQty: 100, unitPrice: 322 },
      { minQty: 101, maxQty: 500, unitPrice: 294 },
      { minQty: 501, maxQty: null, unitPrice: 276 },
    ],
  },
  {
    id: 'fin_opp_mate_2c',
    name: 'Laminado OPP Mate (Ambas caras)',
    costType: 'PER_SHEET',
    tiers: [
      { minQty: 1, maxQty: 10, unitPrice: 680 },
      { minQty: 11, maxQty: 50, unitPrice: 630 },
      { minQty: 51, maxQty: 100, unitPrice: 580 },
      { minQty: 101, maxQty: 500, unitPrice: 530 },
      { minQty: 501, maxQty: null, unitPrice: 495 },
    ],
  },
  {
    id: 'fin_opp_brillo_1c',
    name: 'Laminado OPP Brillo (Frente)',
    costType: 'PER_SHEET',
    tiers: [
      { minQty: 1, maxQty: 10, unitPrice: 328 },
      { minQty: 11, maxQty: 50, unitPrice: 302 },
      { minQty: 51, maxQty: 100, unitPrice: 280 },
      { minQty: 101, maxQty: 500, unitPrice: 254 },
      { minQty: 501, maxQty: null, unitPrice: 238 },
    ],
  },
  {
    id: 'fin_opp_brillo_2c',
    name: 'Laminado OPP Brillo (Ambas caras)',
    costType: 'PER_SHEET',
    tiers: [
      { minQty: 1, maxQty: 10, unitPrice: 590 },
      { minQty: 11, maxQty: 50, unitPrice: 545 },
      { minQty: 51, maxQty: 100, unitPrice: 500 },
      { minQty: 101, maxQty: 500, unitPrice: 450 },
      { minQty: 501, maxQty: null, unitPrice: 420 },
    ],
  },
  {
    id: 'fin_laca_uv_sectorizada',
    name: 'Laca UV Sectorizada',
    costType: 'PER_SHEET',
    tiers: [
      { minQty: 1, maxQty: 10, unitPrice: 136 },
      { minQty: 11, maxQty: 50, unitPrice: 126 },
      { minQty: 51, maxQty: 100, unitPrice: 116 },
      { minQty: 101, maxQty: 500, unitPrice: 106 },
      { minQty: 501, maxQty: null, unitPrice: 99 },
    ],
  },
  {
    id: 'fin_puntas_redondeadas',
    name: 'Puntas Redondeadas',
    costType: 'PER_UNIT',
    tiers: [
      { minQty: 1, maxQty: 100, unitPrice: 8 },
      { minQty: 101, maxQty: 500, unitPrice: 6 },
      { minQty: 501, maxQty: null, unitPrice: 4.5 },
    ],
  },
  {
    id: 'fin_perforacion',
    name: 'Perforación / Ojalillo',
    costType: 'PER_UNIT',
    tiers: [
      { minQty: 1, maxQty: 100, unitPrice: 5 },
      { minQty: 101, maxQty: 500, unitPrice: 3.5 },
      { minQty: 501, maxQty: null, unitPrice: 2.5 },
    ],
  },
  {
    id: 'fin_hendido_central',
    name: 'Hendido Central (Trazado)',
    costType: 'PER_SHEET',
    tiers: [
      { minQty: 1, maxQty: 50, unitPrice: 15 },
      { minQty: 51, maxQty: 200, unitPrice: 12 },
      { minQty: 201, maxQty: null, unitPrice: 9 },
    ],
  },
  // Operaciones de Doblado para Folletos
  {
    id: 'fin_doblado_diptico',
    name: 'Doblado Díptico (1 pliegue)',
    costType: 'PER_UNIT',
    tiers: [
      { minQty: 1, maxQty: 1000, unitPrice: 7.17 },
      { minQty: 1001, maxQty: 2500, unitPrice: 5.16 },
      { minQty: 2501, maxQty: null, unitPrice: 4.66 },
    ],
  },
  {
    id: 'fin_doblado_triptico',
    name: 'Doblado Tríptico (2 pliegues)',
    costType: 'PER_UNIT',
    tiers: [
      { minQty: 1, maxQty: 1000, unitPrice: 8.96 },
      { minQty: 1001, maxQty: 2500, unitPrice: 6.45 },
      { minQty: 2501, maxQty: null, unitPrice: 5.8 },
    ],
  },
];

export const initialQuoterConfigs: ProductQuoterConfigSeedItem[] = [
  {
    productSlug: 'tarjetas-vouchers',
    pricingMode: 'SHEET_NESTING',
    margin: 1.0,
    bleed: 0.15,
    profitMargin: 150,
    minProfitMargin: 120,
    maxProfitMargin: 180,
    allowCustomSize: false,
    rawMaterialIds: [
      'raw_mat_ilustracion_350g_4_4',
      'raw_mat_ilustracion_350g_4_0',
    ],
    finishingIds: [
      'fin_opp_mate_1c',
      'fin_opp_mate_2c',
      'fin_opp_brillo_1c',
      'fin_opp_brillo_2c',
      'fin_laca_uv_sectorizada',
      'fin_puntas_redondeadas',
      'fin_perforacion',
      'fin_hendido_central',
    ],
    sizePresets: [
      { label: '9x5 cm', width: 9, height: 5, sortOrder: 0 },
    ],
    quantityPresets: [
      { quantity: 100, sortOrder: 0 },
      { quantity: 200, sortOrder: 1 },
      { quantity: 300, sortOrder: 2 },
      { quantity: 500, sortOrder: 3 },
      { quantity: 1000, sortOrder: 4 },
    ],
  },
  {
    productSlug: 'flyers-desplegables',
    pricingMode: 'SHEET_NESTING',
    margin: 0.5,
    bleed: 0.1,
    profitMargin: 150,
    minProfitMargin: 120,
    maxProfitMargin: 180,
    allowCustomSize: false,
    rawMaterialIds: [
      'raw_mat_obra_80g_4_0',
      'raw_mat_obra_80g_4_4',
      'raw_mat_ilustracion_115g_4_0',
      'raw_mat_ilustracion_115g_4_4',
      'raw_mat_ilustracion_150g_4_0',
      'raw_mat_ilustracion_150g_4_4',
    ],
    finishingIds: [
      'fin_doblado_diptico',
      'fin_doblado_triptico',
    ],
    sizePresets: [
      { label: '10x10 cm', width: 10, height: 10, sortOrder: 0 },
      { label: '10x15 cm', width: 10, height: 15, sortOrder: 1 },
      { label: '10x20 cm', width: 10, height: 20, sortOrder: 2 },
      { label: '15x21 cm', width: 15, height: 21, sortOrder: 3 },
      { label: '20x20 cm', width: 20, height: 20, sortOrder: 4 },
      { label: 'A4', width: 21, height: 29.7, sortOrder: 5 },
    ],
    quantityPresets: [
      { quantity: 100, sortOrder: 0 },
      { quantity: 200, sortOrder: 1 },
      { quantity: 300, sortOrder: 2 },
      { quantity: 500, sortOrder: 3 },
      { quantity: 1000, sortOrder: 4 },
      { quantity: 2500, sortOrder: 5 },
      { quantity: 5000, sortOrder: 6 },
    ],
  },
  // ─── Tags & Etiquetas ────────────────────────────────────────────────────────
  // Base: Tarjetas Clásicas 350g (lista-print.txt pp. 11-13).
  // Reutiliza raw materials y finishings existentes; no crea nuevos registros.
  // Deuda técnica: los tiers de fin_perforacion divergen de la tarifa real del
  //   catálogo (AGUJEREADOS $3.225/500u vs $2.5/u × 500 = $1.250 del quoter).
  //   Se documenta aquí y se resuelve en sprint independiente.
  {
    productSlug: 'tags-etiquetas',
    pricingMode: 'SHEET_NESTING',
    margin: 1.0,
    bleed: 0.15,
    profitMargin: 150,
    minProfitMargin: 120,
    maxProfitMargin: 180,
    allowCustomSize: false,
    rawMaterialIds: [
      'raw_mat_ilustracion_350g_4_0',
      'raw_mat_ilustracion_350g_4_4',
    ],
    finishingIds: [
      'fin_opp_brillo_1c',
      'fin_puntas_redondeadas',
      'fin_perforacion',
    ],
    sizePresets: [
      { label: '9x5 cm',  width: 9,  height: 5,  sortOrder: 0 },
      { label: '9x3 cm',  width: 9,  height: 3,  sortOrder: 1 },
      { label: '5x18 cm', width: 5,  height: 18, sortOrder: 2 },
      { label: '9x10 cm', width: 9,  height: 10, sortOrder: 3 },
    ],
    quantityPresets: [
      { quantity: 500,  sortOrder: 0 },
      { quantity: 1000, sortOrder: 1 },
    ],
  },
];
