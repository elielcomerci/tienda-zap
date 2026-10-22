#!/usr/bin/env node
'use strict';

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('Indicá al menos un archivo de prueba.');
  process.exit(2);
}

const env = {
  ...process.env,
  CRYPTO_PAYMENTS_ENABLED: 'true',
  TS_NODE_TRANSPILE_ONLY: '1',
  TS_NODE_COMPILER_OPTIONS: JSON.stringify({
    module: 'CommonJS',
    moduleResolution: 'node',
    rootDir: '.',
    ignoreDeprecations: '6.0',
  }),
};

const tsNodeCli = require.resolve('ts-node/dist/bin.js');

for (const file of files) {
  console.log('\n▶ ' + file);
  const result = spawnSync(process.execPath, [tsNodeCli, path.resolve(file)], {
    env,
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
