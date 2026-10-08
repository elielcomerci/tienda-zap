import { ConfiguratorVersionSeedData } from '../types';

// Contractual placeholders only: no options or pricing are invented, and DRAFT versions never render in the public configurator.\nexport const draftConfiguratorPlaceholders: ConfiguratorVersionSeedData[] = [
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
