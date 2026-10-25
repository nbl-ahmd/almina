import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';

// Temporary compatibility bridge for the pinned upstream 0.4.0 distribution.
// Zod 3 is vulnerable; 4.6.7 is patched, but upstream's converter reads Zod 3 internals.
// Never fetch code or access application configuration from this install hook.
const require = createRequire(import.meta.url);
let packagePath;
try { packagePath = require.resolve('next-devtools-mcp/package.json'); }
catch (error) { if (error.code === 'MODULE_NOT_FOUND') process.exit(0); throw error; }
const metadata = JSON.parse(await readFile(packagePath, 'utf8'));
if (metadata.version !== '0.4.0') throw new Error('Re-review the Next DevTools compatibility patch before changing its version.');
const entry = join(dirname(packagePath), 'dist/index.js');
const source = await readFile(entry, 'utf8');
const marker = '// Al Mina: patched Zod 4 input-schema conversion.';
const patchedHash = '89e76ff640088909ec92e8f097226251cbab663ae1920dd5b38b0c6bb588c450';
const originalHash = 'e1c3d5bdcc58665b39a75fc41916ab9b84403a268eabb3efa1c3a7ad762f0eb9';
const start = source.indexOf('function zodSchemaToJsonSchema(zodSchema) {');
const end = source.indexOf('function parseToolArgs(schema, args) {', start);
const replacement = `${marker}\nfunction zodSchemaToJsonSchema(zodSchema) {\n    return toJSONSchema(zodSchema, { io: "input", target: "draft-7" });\n}\n`;
if (source.includes(marker)) {
  if (createHash('sha256').update(source).digest('hex') !== patchedHash || !source.includes(replacement) || !source.startsWith('#!/usr/bin/env node\nimport { toJSONSchema } from "zod";\n')) throw new Error('Unexpected Next DevTools patch contents.');
  console.log('Next DevTools Zod 4 compatibility patch already applied.');
} else {
  if (createHash('sha256').update(source).digest('hex') !== originalHash || start < 0 || end < 0) throw new Error('Unexpected upstream Next DevTools source; refusing to patch.');
  // An entry-level import is safe: upstream is ESM and Zod is already a dependency.
  await writeFile(entry, (source.slice(0, start) + replacement + source.slice(end)).replace('#!/usr/bin/env node\n', '#!/usr/bin/env node\nimport { toJSONSchema } from "zod";\n'));
  console.log('Applied pinned Next DevTools Zod 4 compatibility patch.');
}
