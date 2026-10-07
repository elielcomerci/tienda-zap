import { ProductModality, ConfiguratorEngine, ConfiguratorStatus, PackPricingMode, CatalogType } from '@prisma/client';

export interface AdminSeedData {
  email: string;
  password: string;
  name: string;
}

export interface BusinessTypeSeedData {
  slug: string;
  name: string;
}

export interface SituationSeedData {
  slug: string;
  name: string;
  order: number;
}

export interface NeedSeedData {
  slug: string;
  name: string;
  order: number;
}

export interface ProductSeedData {
  order: number;
  slug: string;
  name: string;
  catalogType: CatalogType;
  modality: ProductModality;
  engine: ConfiguratorEngine | null;
  whatIs?: string;
  purpose?: string;
  includes?: string[];
  configurable?: string[];
  consultationNote?: string;
  priceFrom?: number | null;
  active?: boolean;
}

export interface ConfiguratorVersionSeedData {
  productSlug: string;
  schemaVersion: string;
  status: ConfiguratorStatus;
  schema: Record<string, any>;
  compatibility?: Record<string, any> | null;
  pricing?: Record<string, any> | null;
}

export interface OfferMatrixEntrySeedData {
  businessTypeSlug: string;
  situationSlug: string;
  needSlug: string;
  productSlug: string;
}

export interface PackSeedData {
  slug: string;
  name: string;
  description?: string;
  images?: string[];
  businessTypeSlug?: string;
  pricingMode: PackPricingMode;
  fixedPrice?: number | null;
  discountPercent?: number | null;
  items: Array<{
    productSlug: string;
    quantity: number;
    presets?: Record<string, any> | null;
    order?: number;
  }>;
}
