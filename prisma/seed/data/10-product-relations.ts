import { ProductRelationSeedData } from '../types';

export const productRelationsData: ProductRelationSeedData[] = [
  { productSlug: 'flyers-desplegables', relatedProductSlug: 'diseno-flyer-volante' },
  { productSlug: 'diseno-flyer-volante', relatedProductSlug: 'flyers-desplegables' },
  { productSlug: 'carteleria-ploteo', relatedProductSlug: 'diseno-cartel-afiche' },
  { productSlug: 'diseno-cartel-afiche', relatedProductSlug: 'carteleria-ploteo' },
  { productSlug: 'carteleria-ploteo', relatedProductSlug: 'diseno-carteleria-rotulos' },
  { productSlug: 'diseno-carteleria-rotulos', relatedProductSlug: 'carteleria-ploteo' },
  { productSlug: 'carteleria-ploteo', relatedProductSlug: 'diseno-vidriera' },
  { productSlug: 'diseno-vidriera', relatedProductSlug: 'carteleria-ploteo' },
  { productSlug: 'tags-etiquetas', relatedProductSlug: 'diseno-etiquetas' },
  { productSlug: 'diseno-etiquetas', relatedProductSlug: 'tags-etiquetas' },
  { productSlug: 'menus-cartas', relatedProductSlug: 'diseno-menu-gastronomico' },
  { productSlug: 'diseno-menu-gastronomico', relatedProductSlug: 'menus-cartas' },
  { productSlug: 'carpetas-folders', relatedProductSlug: 'diseno-papeleria-corporativa' },
  { productSlug: 'diseno-papeleria-corporativa', relatedProductSlug: 'carpetas-folders' },
  { productSlug: 'tarjetas-vouchers', relatedProductSlug: 'diseno-papeleria-corporativa' },
  { productSlug: 'diseno-papeleria-corporativa', relatedProductSlug: 'tarjetas-vouchers' },
];