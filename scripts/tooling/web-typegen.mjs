import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
// next typegen uses production mode. Select isolated dev config for static tooling
// unless the caller explicitly selects an environment; no API/DB request is made.
const result = spawnSync(process.execPath, [require.resolve('next/dist/bin/next'), 'typegen'], {
  stdio: 'inherit', env: { ...process.env, APP_ENV: process.env.APP_ENV ?? 'development' },
});
process.exit(result.status ?? 1);
