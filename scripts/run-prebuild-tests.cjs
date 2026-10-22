#!/usr/bin/env node
'use strict';

const { spawnSync } = require('node:child_process');

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(args) {
  console.log('\n▶ npm ' + args.join(' '));
  const result = spawnSync(npm, args, {
    env: process.env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run(['test']);

if (process.env.TEST_DATABASE_URL) {
  console.log('\nTEST_DATABASE_URL detectada: ejecutando integración de precios contra la base aislada.');
  run(['run', 'test:integration:pricing']);
} else {
  console.log('\nTEST_DATABASE_URL no configurada: se omite la integración de DB; npm test sí se ejecutó.');
}
