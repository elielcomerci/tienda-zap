/**
 * Helpers for the first Precios ZAP admin editor.
 *
 * Only numeric leaves that represent supplier costs are editable. Numeric
 * metadata (quantity bounds, dimensions, percentages and delivery rules) is
 * deliberately excluded, even when nested inside a provider matrix.
 */
const NON_COST_SEGMENTS = new Set([
  'papersurcharges',
  'surchargepercent',
  'deliverysurcharges',
  'taxincluded',
  'currency',
  'paymentcondition',
  'source',
  'resolver',
  'note',
  'delivery',
  'validity',
  'includes',
  'minqty',
  'maxqty',
  'minquantity',
  'maxquantity',
  'quantity',
  'qty',
  'width',
  'height',
  'margin',
  'profitmargin',
  'minprofitmargin',
  'maxprofitmargin',
  'markup',
  'markuppercent',
  'marginpercent',
  'taxrate',
  'vatrate',
  'percentage',
  'percent',
  'version',
  'schemaversion',
  'days',
  'leadtimedays',
  'deliverydays',
  'validitydays',
]);

export type ProviderCostRow = { path: string[]; label: string; value: number };

export function isEditableProviderCostPath(path: string[]): boolean {
  return Array.isArray(path)
    && path.length >= 3
    && path[0] === 'providerFinishedCostMatrix'
    && !path.slice(1).some((segment) => NON_COST_SEGMENTS.has(segment.toLowerCase()));
}

const HIDDEN_LABEL_SEGMENTS = new Set([
  'providerFinishedCostMatrix',
  'tiers',
  'finishes',
]);

const SEGMENT_LABELS: Record<string, string> = {
  opp: 'OPP',
  uv: 'UV',
  sectorizedSides: 'Laterales sectorizados',
  front: 'Frente',
  back: 'Dorso',
  printing: 'Impresión',
  deluxe: 'Deluxe',
  matte: 'Mate',
  opp_mate_laca_uv_sectorizada: 'OPP mate + laca UV sectorizada',
  '4_4': '4/4',
  '4_0': '4/0',
  frente_y_dorso: 'Frente y dorso',
};

function formatCostPathLabel(path: string[]) {
  const visiblePath = path.filter((part) => !HIDDEN_LABEL_SEGMENTS.has(part));
  return visiblePath
    .map((part, index) => {
      if (SEGMENT_LABELS[part]) return SEGMENT_LABELS[part];
      if (/^\d+x\d+$/i.test(part)) return part.replace(/x/i, ' × ');
      if (/^\d+$/.test(part) && /^\d+x\d+$/i.test(visiblePath[index - 1] || '')) return `${part} unidades`;
      return part
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/_/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\bopp\b/gi, 'OPP')
        .replace(/\buv\b/gi, 'UV')
        .replace(/^\w/, (letter) => letter.toUpperCase());
    })
    .filter(Boolean)
    .join(' · ');
}

export function flattenProviderCostMatrix(
  value: unknown,
  path: string[] = ['providerFinishedCostMatrix'],
  rows: ProviderCostRow[] = [],
): ProviderCostRow[] {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (isEditableProviderCostPath(path)) {
      rows.push({
        path,
        label: formatCostPathLabel(path),
        value,
      });
    }
    return rows;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => flattenProviderCostMatrix(item, [...path, String(index)], rows));
    return rows;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (NON_COST_SEGMENTS.has(key.toLowerCase())) continue;
      flattenProviderCostMatrix(child, [...path, key], rows);
    }
  }
  return rows;
}

export function collectEditableProviderCostValues(
  value: unknown,
  path: string[] = ['providerFinishedCostMatrix'],
  out: number[] = [],
): number[] {
  if (typeof value === 'number') {
    if (Number.isFinite(value) && isEditableProviderCostPath(path)) out.push(value);
    return out;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectEditableProviderCostValues(item, [...path, String(index)], out));
    return out;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (NON_COST_SEGMENTS.has(key.toLowerCase())) continue;
      collectEditableProviderCostValues(child, [...path, key], out);
    }
  }
  return out;
}
