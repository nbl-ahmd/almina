import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const commit = 'a'.repeat(40);
function simulate(patch: Record<string, string> = {}, wrongCommit = false, args = ['--apply']) {
  // No real network, tokens, service or database is used by this subprocess.
  const mock = `let calls=0;globalThis.fetch=async(url,options)=>{calls++;
    if(options.method==='POST'){const body=JSON.parse(options.body);if(body.commitId!=='${commit}')throw Error('Wrong candidate');
      console.log('synthetic POST');return Response.json({id:'dep-synthetic'},{status:201});}
    return Response.json({id:'dep-synthetic',status:'live',commit:{id:'${wrongCommit ? 'b'.repeat(40) : commit}'}});};`;
  return run(process.execPath, ['--import', 'data:text/javascript,' + encodeURIComponent(mock),
    'scripts/tooling/deploy-render-staging.mjs', ...args], { env: { PATH: process.env.PATH, NODE_ENV: 'test',
    DEPLOYMENT_ENV: 'staging', RENDER_SERVICE_ID: 'srv-synthetic', RELEASE_COMMIT: commit,
    RENDER_API_KEY: 'synthetic-test-token', ...patch } });
}
test('staging deployment sends the exact candidate and requires matching live commit evidence', async () => {
  const result = await simulate();
  assert.equal(result.stdout.split('synthetic POST').length - 1, 1);
  assert.ok(result.stdout.includes('staging_deployed'));
  await assert.rejects(simulate({}, true));
});
test('staging deploy refuses production targets, invalid commits and missing credentials', async () => {
  for (const patch of [{ DEPLOYMENT_ENV: 'production' }, { RENDER_SERVICE_ID: 'srv-cv1dn5lds78s73doqjm0' },
    { RELEASE_COMMIT: 'master' }, { RENDER_API_KEY: '' }]) await assert.rejects(simulate(patch));
  const plan = await simulate({}, false, []);
  assert.ok(plan.stdout.includes('"mode":"plan"'));
  assert.ok(!plan.stdout.includes('synthetic POST'));
});
