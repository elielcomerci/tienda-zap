/**
 * Catálogo maestro de costos — GRAN FORMATO
 *
 * Fuentes:
 * - CATÁLOGO DE MATERIALES Y PRECIOS — actualización 23/07/2026
 * - CATÁLOGO DE IMPRESIONES — actualización 06/07/2026
 *
 * IMPORTANTE:
 * - Son costos de producción/proveedor, no precios de venta ZAP.
 * - Fuentes sin IVA.
 * - Se preserva la semántica de origen: MATERIAL, IMPRESIÓN, PROCESO,
 *   MATERIAL+PROCESO o PRODUCTO_TERMINADO.
 * - No se suman automáticamente líneas que ya incluyan material + proceso.
 * - Herramientas, máquinas y consumibles generales no se modelan como
 *   costo directo de producto en esta etapa.
 */

export type GranFormatCostKind =
  | 'MATERIAL'
  | 'IMPRESION'
  | 'PROCESO'
  | 'MATERIAL_PROCESO'
  | 'PRODUCTO_TERMINADO';

export const granFormatoCostCatalog = {
  metadata: {
    currency: 'ARS',
    taxIncluded: false,
    materialsSourceDate: '2026-07-23',
    printingSourceDate: '2026-07-06',
    generalMinimum: '1/2 metro lineal salvo excepción indicada por la fuente',
    cuttingMinimum: '1 metro lineal por color + material',
    note: 'Los importes son costos fuente. No son precios de venta ZAP.',
  },

  materials: {
    vinylsOracalRitramaArla: {
      kind: 'MATERIAL' as const,
      minimum: '0.5m',
      rollDiscount: 10,
      items: {
        oracal_100_colors_63: 4500,
        oracal_100_colors_126: 9000,
        oracal_100_white_black_63: 3200,
        oracal_100_white_black_126: 6400,
        oracal_651_metallic_63: 7200,
        oracal_651_metallic_126: 14400,
        oracal_651_colors_63: 6300,
        oracal_651_colors_126: 12600,
        oracal_651_white_black_63: 5400,
        oracal_651_white_black_126: 10800,
        oracal_6510_fluo_63: 24200,
        oracal_8300_translucent_63: 18500,
        oracal_670ra_white_black_152: 16650,
        oracal_670ra_colors_152: 19000,
        ritrama_l100_colors_61: 2000,
        ritrama_l100_colors_122: 4000,
        ritrama_m300_matte_61: 2600,
        ritrama_m300_matte_122: 5200,
        ritrama_o400_white_black_63: 3700,
        ritrama_o400_white_black_126: 7400,
        arla_wood_marble_122: 12000,
        arla_econ: 8500,
        arla_frosted_cuts_forms: 7000,
        arla_black_textured_microchannels_61: 6400,
      },
    },

    vinylsAffixUnicalMccalLg: {
      kind: 'MATERIAL' as const,
      items: {
        affix_metallic_brushed_61: 3900,
        affix_frosted_61: 2850,
        affix_frosted_122: 5700,
        affix_frosted_152: 7150,
        affix_carbon_fiber_152: 12000,
        affix_promo_gloss_colors_61: 1650,
        affix_promo_gloss_white_black_122: 3300,
        affix_fluorescent_61: 3450,
        affix_holographic_glitter_clear_61: 6500,
        affix_rainbow_suncatcher_61: 8400,
        affix_reflective_nonprintable_62: 5700,
        affix_photoluminescent_61: 18700,
        affix_photoluminescent_122: 37400,
        unical_dpi_white_clear_gloss_matte_sublimable_60: 5550,
        unical_frosted_promo_61: 2200,
        unical_frosted_promo_122: 4400,
        mccal_cosserie_translucent_61: 2500,
        mccal_1000_eco_white_black_61: 1650,
        mccal_1000_eco_white_black_122: 3300,
        mccal_frosted_61: 4700,
        mccal_frosted_122: 9400,
        mccal_frosted_152: 11700,
        mccal_polyester_colors_holographic_61: 8400,
        lg_gray_frosted_61: 8800,
        lg_gray_frosted_122: 17700,
      },
    },

    carwrapAndLaminates: {
      kind: 'MATERIAL' as const,
      items: {
        solarcheck_3d_carbon_152: 25000,
        solarcheck_6d_carbon_152: 27000,
        solarcheck_black_roof_152: 12600,
        laminate_affix_mcjet_dpi_ultraflex: 2300,
        laminate_ritrama_gloss_matte: 3750,
        oraguard_215: 15250,
        oraguard_270: 32250,
        high_transit_matte_diagonal: 6100,
        ritrama_motos_atv_plasticone_300mic: 33450,
        ritrama_optima_gloss_matte: 9600,
      },
    },

    thermoTextile: {
      kind: 'MATERIAL' as const,
      minimum: '0.5m',
      items: {
        transfer_gray_gold_fluo_metallic_silver_tornasol_50: 5200,
        transfer_roll_50: 4500,
        reflective_white_gray_50: 9650,
        reflective_white_gray_roll: 8100,
        holographic_reflective_50: 8500,
        holographic_reflective_roll: 7200,
        flex_silver_matte_50: 12500,
        flex_silver_matte_roll: 10200,
        glitter_50: 14200,
        glitter_roll: 11900,
        perforated_white_v_51_48: 13500,
        perforated_white_v_roll: 11200,
        teflon_cloth_60x40: 9300,
        teflon_cloth_40x40: 6200,
        positioning_tape_adere_60: 39400,
        positioning_tape_adere_30: 19700,
        positioning_tape_adere_20: 13100,
        positioning_tape_adere_10: 6550,
        positioning_tape_affix_60: 27900,
        positioning_tape_affix_30: 13950,
        positioning_tape_affix_20: 9300,
        positioning_tape_affix_10: 4650,
      },
    },

    filmsSecurityMagnets: {
      kind: 'MATERIAL' as const,
      minimum: '0.5m',
      items: {
        nexgard_security_120mic_152_roll30: 19000,
        nexgard_security_120mic_roll: 15000,
        silver15_152: 19000,
        silver15_roll: 15000,
        st70_35_15_06_152: 7900,
        st70_35_15_06_roll: 6300,
        magnet_030_62: 5700,
        magnet_035_62: 5700,
        magnet_040_62: 5700,
        magnet_030_roll: 4500,
        magnet_040_roll: 4500,
        adhesive_magnet_030_62: 9100,
        adhesive_magnet_040_62: 9100,
        adhesive_magnet_030_roll: 7600,
        adhesive_magnet_040_roll: 7600,
        vehicular_magnet_070: 21600,
        vehicular_pvc_090_promo: 24700,
      },
    },

    rods: {
      kind: 'MATERIAL' as const,
      items: {
        '55cm': 1900,
        '65cm': 2050,
        '75cm': 2450,
        '85cm': 2800,
        '95cm': 3100,
        '105cm': 3450,
        plastic_caps: 120,
      },
    },

    platesPolyfan: {
      kind: 'MATERIAL' as const,
      items: {
        white_20mm_60x125: 11150,
        white_30mm_60x125: 17600,
        white_40mm_60x125: 23300,
        white_50mm_60x125: 28200,
        black_20mm_60x125: 9500,
        black_30mm_60x125: 14900,
      },
      packs: {
        white_20mm: { units: 25, price: 215000 },
        white_30mm: { units: 16, price: 215000 },
        white_40mm: { units: 12, price: 215000 },
        white_50mm: { units: 10, price: 215000 },
        black_20mm: { units: 25, price: 215000 },
        black_30mm: { units: 16, price: 215000 },
      },
      packDiscount: 10,
    },

    paiHighImpact: {
      kind: 'MATERIAL' as const,
      sheets: {
        '0.5mm': { full_200x100: 10290, full_244x122: 30870, half_100x60: 3150, small_50x60: 1785 },
        '1mm': { full_200x100: 20580, full_244x122: 61750, half_100x60: 6300, small_50x60: 3570 },
        '1.5mm': { full_200x100: 30870, full_244x122: 92600, half_100x60: 9500, small_50x60: 5350 },
        '2mm': { full_200x100: 41150, full_244x122: 123500, half_100x60: 12600, small_50x60: 7150 },
        '3mm': { full_200x100: 61750, full_244x122: 185250, half_100x60: 18900, small_50x60: 10700 },
      },
      bicapa: {
        '1mm': { full_200x100: 14800, half_100x60: 5050 },
        '2mm': { full_200x100: 29600, half_100x60: 10100 },
        '3mm': { full_200x100: 44400, half_100x60: 15100 },
      },
    },

    pvcFoamPromo: {
      kind: 'MATERIAL' as const,
      items: {
        white_3mm_244x122: 17740,
        white_3mm_122x122: 10645,
        white_3mm_81x122: 7100,
        black_3mm_244x122: 20385,
        black_3mm_122x122: 12230,
        black_3mm_81x122: 8150,
        white_5mm_244x122: 35295,
        white_5mm_122x122: 21180,
        white_5mm_81x122: 14120,
        black_5mm_244x122: 38500,
        black_5mm_122x122: 23100,
        black_5mm_81x122: 15400,
        white_10mm_244x122: 70590,
        black_10mm_244x122: 77000,
        white_18mm_244x122: 129950,
        white_22mm_244x122: 158830,
      },
    },

    foamboardCorrugatedPet: {
      kind: 'MATERIAL' as const,
      items: {
        foamboard_5mm_244x122: 25400,
        foamboard_5mm_70x100: 5500,
        foamboard_5mm_50x70: 3100,
        corrugated_2_2mm_200x100: 9750,
        corrugated_2_2mm_70x100: 3400,
        corrugated_2_2mm_50x70: 1750,
        pet_plus_clear_0_5mm_122x244: 21900,
        pet_plus_clear_1mm_122x244: 44700,
        pet_plus_clear_2mm_122x244: 93900,
      },
    },

    acrylic: {
      kind: 'MATERIAL' as const,
      currency: 'USD_BNA_SELL',
      volumeDiscount: { from500: 5, above1000: 10 },
      crystal: {
        '2mm': { full_244x122: 67.5, half_122x122: 42.5 },
        '3mm': { full_244x122: 104.4, half_122x122: 65.7 },
        '4mm': { full_244x122: 139.5, half_122x122: 87.3 },
        '5mm': { full_244x122: 175.5, half_122x122: 109.8 },
        '6mm': { full_244x122: 229.5, half_122x122: 143.1 },
        '8mm': { full_244x122: 306, half_122x122: 190.8 },
      },
      opalTranslucent: {
        '2mm': { full_244x122: 67.5, half_122x122: 42.5 },
        '3mm': { full_244x122: 104.4, half_122x122: 65.7 },
        '4mm': { full_244x122: 139.5, half_122x122: 87.3 },
        '5mm': { full_244x122: 175.5, half_122x122: 109.8 },
        '6mm': { full_244x122: 229.5, half_122x122: 143.1 },
        '8mm': { full_244x122: 306, half_122x122: 190.8 },
      },
      special: {
        black_2mm_full: 101.7,
        black_3mm_full: 117,
        silver_mirror_2mm_full: 114.3,
        gold_mirror_3mm_full: 171,
      },
    },

    metalex: {
      kind: 'MATERIAL' as const,
      items: {
        silver_brushed_60x120: 26,
        gold_brushed_60x120: 26,
        silver_brushed_40x60: 9.5,
        gold_brushed_40x60: 9.5,
      },
    },

    eyelets: {
      kind: 'MATERIAL' as const,
      matrix: {
        '22_8mm': 12700,
        '24_10mm': 14850,
        '26_13mm': 19250,
      },
      perThousand: {
        nickel_22: 18400,
        nickel_22_with_washers: 20450,
        nickel_24: 28000,
        nickel_24_with_washers: 31000,
        nickel_26: 48100,
        nickel_26_with_washers: 53500,
      },
    },
  },

  printing: {
    vinylPremiumUv: {
      kind: 'IMPRESION' as const,
      standard: {
        widths: ['1.06m','1.26m','1.37m','1.52m'],
        whiteInk: 11800,
        lacquer: 9600,
        whiteAndLacquer: 13300,
      },
      clearMatteGlossWhiteInk: 10800,
      special: {
        frosted: { whiteInk: 20800, lacquer: 16900 },
        metallic: { whiteInk: 15800, lacquer: 19500 },
        iridescent: { whiteInk: 26500, lacquer: 32600 },
        reflective: { whiteInk: 16100, lacquer: 19800, width: '1.20m' },
        suncatcher: { whiteInk: 16250, lacquer: 20000 },
        photoluminescent: { whiteInk: 24400, lacquer: 30100 },
      },
      fullHalfCutMin1m2: {
        pm80WhiteClear: { whiteInk: 26800, whiteAndLacquer: 32900 },
        matteGlossClear: { whiteInk: 29100, whiteAndLacquer: 35800 },
        metallicIridescent: { whiteInk: 36900, whiteAndLacquer: 45400 },
        reflective: { whiteInk: 48800, whiteAndLacquer: 60100, width: '1.20m' },
        suncatcher: { whiteInk: 39800, whiteAndLacquer: 48900 },
      },
    },

    lona: {
      kind: 'IMPRESION' as const,
      widths: ['0.91m','1.00m','1.27m','1.52m','2.00m','2.50m','3.20m'],
      items: {
        front_8oz: { dpi720: 6000, uv: 7200, noPrint: 2200 },
        front_13oz: { dpi720: 6800, uv: 8200, latex: 15000, noPrint: 2450 },
        front_matte: { dpi720: 6800, uv: 8200, latex: 15000, noPrint: 2450 },
        back: { dpi720: 8500, uv: 10200, noPrint: 3350 },
        blackout: { dpi720: 10100, uv: 12200, latex: 23600, noPrint: 7160 },
        blackout_bifaz: { dpi720: 15700, uv: 18900 },
        mesh: { dpi720: 9600, uv: 11600, noPrint: 5680 },
      },
    },

    vinilosSolventUvLatex: {
      kind: 'IMPRESION' as const,
      items: {
        ritrama_pm80_brillo: { solvent: 5000, uv720: 5500, uv1440: 6400, latex: 7400, noPrint: 2300 },
        ritrama_pm80_base_gris: { solvent: 5700, uv720: 5400, uv1440: 7000, latex: 8100, noPrint: 2500 },
        promotional_clear: { solvent: 5000, uv720: 5500, uv1440: 6400, latex: 7400, noPrint: 2300 },
        ritrama_matte_gloss_clear: { solvent: 6600, uv720: 7600, uv1440: 6000, latex: 8300, noPrint: 3750 },
        ritrama_matte_base_gris: { solvent: 8400, uv720: 9100, uv1440: 7350, latex: 6500, noPrint: 4000 },
        optima_p75_vehicular: { solvent: 14100, uv720: 16300, uv1440: 18000, latex: 20500, noPrint: 12400 },
        lg_2710_base_gris: { solvent: 14000, noPrint: 7900 },
        orajet_3164: { solvent: 11400, uv720: 13000, uv1440: 9250, latex: 10100, noPrint: 7300 },
        oracal_670_white: { solvent: 16100, uv720: 18500 },
        orajet_3651: { solvent: 19100, uv720: 21400, uv1440: 23000, latex: 26100, noPrint: 15100 },
        microperforated: { solvent: 11500, uv1440: 9000, noPrint: 5050 },
        frosted: { solvent: 11400, uv720: 13000 },
        metallic_iridescent: { print: 24400, noPrint: 12400, unit: 'LINEAR_M' },
        suncatcher_rainbow: { print: 24400, unit: 'LINEAR_M' },
        photoluminescent: { print: 27850, noPrint: 16400, unit: 'LINEAR_M' },
        reflective: { print: 20400, noPrint: 9700, unit: 'LINEAR_M_1_24M' },
      },
    },

    textilesDtfUvSublimation: {
      kind: 'IMPRESION' as const,
      items: {
        transfer_promo: { latex: 5600, noPrint: 3800, width: '0.5m' },
        sublimation: { upTo10m: 3800, over10m: 2800, usefulWidth: '1.55m' },
        dtf_polyurethane: { upTo10m: 8500, from10to19m: 7500, from20m: 6000, usefulWidth: '0.58m' },
        dtf_express: { regular: 11000, reduced: 9800 },
      },
    },

    specials: {
      kind: 'IMPRESION' as const,
      items: {
        dtf_uv: { oneMeter: 18000, from10m: 14000, usefulWidth: '0.57m' },
        nonwoven_pvc_backlight_curtains: { uv: 27000, noPrint: 13250 },
        backlight_film: { uv: 13700, noPrint: 7500 },
        photo_paper_255g: { uv: 14700, noPrint: 7400 },
        canvas: { uv: 21900, noPrint: 5250 },
        flag_fabric: { uv: 26800, noPrint: 13650 },
        ecocuir: { uv: 21600, noPrint: 13400 },
        blueback_115g: { dpi720: 7800, uv: 9750, noPrint: 3500 },
      },
    },

    printedAndCut: {
      kind: 'MATERIAL_PROCESO' as const,
      halfCut1440: {
        ritrama_pm80_clear: { uv1440: 10800, latex: 12500 },
        ritrama_gray_base: { uv1440: 11900, latex: 13200 },
        promotional_clear: { uv1440: 10800, latex: 12500 },
        orajet_3164: { uv1440: 16800, latex: 14700 },
        orajet_3651: { uv1440: 21200, uvOther: 26700, latex: 30000 },
        transfer_50: 7500,
        frosted_m2: { uv1440: 16100, latex: 20200 },
        metallic_iridescent_linear: 37600,
        suncatcher_linear: 42600,
        reflective_linear: { uv1440: 23600, latex: 28300 },
        photoluminescent: 31850,
      },
      fullCutMin1m: {
        ritrama_pm80_clear_uv1440: 20600,
        metallic_iridescent: 28300,
        suncatcher: 30600,
        reflective: 37600,
      },
    },
  },

  processes: {
    cutting: {
      kind: 'PROCESO' as const,
      plotter63cmPerLinearM: 7600,
      plotter130cmPerLinearM: 14000,
      thermotransfer50cmPerLinearM: 7600,
      minimum: '1m/color',
    },
    finishingPostPrint: {
      kind: 'PROCESO' as const,
      trimVinylLonaPerM: 1000,
      trimPlatesPerM: 1340,
      panelingSewingPocketReinforcementPerM: 2500,
      panelingExternalPerM: 4000,
      installedEyelet: 650,
      mountingLaminatingPerM2: 2500,
      externalLaminatePerM2: 4700,
    },
    laminateMaterialAndApplication: {
      kind: 'MATERIAL_PROCESO' as const,
      items: {
        affix_mcjet_promo_ultraflex: 4800,
        ritrama_gloss_matte: 6250,
        orajet_3164: 9850,
        oraguard_215: 17750,
        oraguard_270: 34750,
        highTransit_ritrama: 8600,
        plastic_300mic: 35950,
        optima_vehicular_gloss_matte: 12100,
      },
      note: 'Incluye material + aplicación. No debe sumarse nuevamente a material o aplicación.',
    },
  },

  finishedProducts: {
    portabannerPlusPrinting: {
      kind: 'PRODUCTO_TERMINADO' as const,
      note: 'Precio fuente combinado: estructura + impresión. No sumar estructura nuevamente.',
      frontMaterial: 'FRONT_13OZ',
      items: {
        simple_60x150: { structure: 16500, latex: 24700, ecosolvent: 28500, uv: 23500 },
        double_90x190: { structure: 32000, latex: 44800, ecosolvent: 47000, uv: 54700 },
        eco_double_90x190: { structure: 20900, latex: 43000, ecosolvent: 33900, uv: 36100 },
        simple_90x190: { structure: 21000, latex: 36500, uv: 44700 },
        eco_simple_90x190: { structure: 16000, latex: 40100, uv: 31500 },
        vertical_double_150x200: { structure: 49000, latex: 72600, ecosolvent: 75850, uv: 90500 },
        three_200x200: { structure: 75000, latex: 110200, uv: 104900 },
        eco_three_200x200: { structure: 59000, latex: 97200, uv: 92100 },
        four_300x200: { structure: 92000, latex: 141400, uv: 137400 },
        eco_four_300x200: { structure: 67000, latex: 125000, uv: 116900 },
        rollup_85x200: { structure: 26600, latex: 53400, uv: 43500, assembly: 3000 },
        fly_banner_50x260: { structure: 32000, latex: 98600 },
        drop_banner_60x250: { structure: 32000, latex: 98600 },
        drop_banner_gota_eco_73x220: { structure: 18000, latex: 59800 },
        cross_base: { standalone: 15000, combo: 9700 },
      },
    },
  },

  notes: [
    'PORTABANNER + IMPRESIÓN ya es una tarifa combinada/terminada.',
    'LAMINADO (Material + Aplicación) ya incluye ambos componentes.',
    'IMPRESO Y CORTE contiene combinaciones de material + impresión + corte según línea; no debe descomponerse sin una auditoría de equivalencia.',
    'La fuente de materiales y la de impresión son complementarias, no acumulativas por defecto.',
    'Los productos deben usar el costo de mayor valor cuando dos fuentes describen exactamente la misma combinación real.',
    'No se inventan equivalencias entre anchos, materiales, tecnologías o terminaciones que la fuente no declara.',
    'Las herramientas, máquinas y consumibles generales quedan fuera del costo directo hasta definir una política explícita de prorrateo.',
  ],
} as const;

export default granFormatoCostCatalog;
