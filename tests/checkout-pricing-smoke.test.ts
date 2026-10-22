import assert from 'node:assert/strict';
import { adhesivosStickersConfigurator } from '../prisma/seed/data/06-configurators/impresos-packaging';
import {
  quoteConfiguratorSelection,
  validateConfiguratorContract,
} from '../src/lib/pricing/configurator-adapter';

const configurator = adhesivosStickersConfigurator;
const selection: Record<string, unknown> = {};
for (const [key, field] of Object.entries(configurator.schema.fields as Record<string, any>)) {
  if (field.default !== undefined) selection[key] = field.default;
}

assert.doesNotThrow(() => validateConfiguratorContract(configurator as any));

const quote = quoteConfiguratorSelection(configurator as any, selection as any);
assert.ok(Number.isFinite(quote.totalPrice) && quote.totalPrice > 0, 'El checkout debe recibir un precio final positivo');
assert.ok(Array.isArray(quote.selectedOptions) && quote.selectedOptions.length > 0, 'La cotización debe incluir opciones legibles para el checkout');
assert.ok(Number.isFinite(quote.unitPrice) && quote.unitPrice > 0, 'La cotización debe incluir un precio unitario válido');

assert.throws(
  () => validateConfiguratorContract({
    ...configurator,
    schema: { ...configurator.schema, fields: {} },
  } as any),
  /schema\.fields debe contener al menos un campo/,
);

assert.throws(
  () => validateConfiguratorContract({
    ...configurator,
    pricing: { ...(configurator.pricing as any), providerFinishedCostMatrix: undefined },
  } as any),
  /PROVIDER_FINISHED_COST requiere providerFinishedCostMatrix/,
);

console.log('✓ contrato de configurador y humo de cotización para checkout');
