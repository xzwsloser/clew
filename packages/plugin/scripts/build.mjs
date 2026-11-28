import esbuild from 'esbuild';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(__dirname, '..');
const libDir = resolve(pkgRoot, 'lib');

mkdirSync(libDir, { recursive: true });

// 1. Build Host ESM bundle (inline @clew/shared and @clew/engine so external dsh profiles need no workspace:* links)
await esbuild.build({
  entryPoints: [resolve(pkgRoot, 'src/host/index.ts')],
  outfile: resolve(libDir, 'index.js'),
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node24',
  sourcemap: true,
  external: ['zod', '@deepseek-ai/*', 'node:*'],
});

// 2. Build Client CJS factory bundle wrapped in DSH window.__ModuleLoader__.load
const clientResult = await esbuild.build({
  entryPoints: [resolve(pkgRoot, 'src/client/index.tsx')],
  write: false,
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: ['es2022'],
  jsx: 'automatic',
  sourcemap: false,
  external: [
    'react',
    'react/jsx-runtime',
    'react-dom',
    'react-dom/client',
    '@deepseek-ai/cordis',
    'zod',
    '@tanstack/react-virtual',
    '@deepseek-ai/dsh-client-store',
    '@deepseek-ai/dsh-client-ui-slots',
  ],
});

const bundledCjs = clientResult.outputFiles[0]?.text ?? '';
const wrappedClient = `window.__ModuleLoader__.load({
  id: '@clew/dsh-plugin',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
${bundledCjs}
    return module.exports;
  },
});
`;

writeFileSync(resolve(libDir, 'client.js'), wrappedClient, 'utf8');
