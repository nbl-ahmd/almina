import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';

const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const manifest = require.resolve('next/package.json');
const docs = join(dirname(manifest), 'dist/docs');
if (!existsSync(docs)) throw new Error('Installed Next.js has no bundled docs. Install the pinned dependencies first.');
console.log(`Next.js ${require('next/package.json').version}\nVersion-matched documentation: ${docs}`);
