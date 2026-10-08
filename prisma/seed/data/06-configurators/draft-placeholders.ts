import { ConfiguratorVersionSeedData } from '../types';

export const draftConfiguratorPlaceholders: ConfiguratorVersionSeedData[] = [
  'fajas-envoltorios',
  'bolsas-contenedores',
  'menus-cartas',
  'individuales-posavasos',
  'carteleria-ploteo',
  'corporeos-marquesinas',
  'senaletica-placas',
  'expositores-stands',
].map((productSlug) => ({
  productSlug,
  schemaVersion: '1.0',
  status: 'DRAFT',
  schema: {},
}));
