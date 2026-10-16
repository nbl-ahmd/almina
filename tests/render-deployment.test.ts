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

function simulateVercel(patch: Record<string, string> = {}, mode = 'ready', args = ['--apply']) {
  const mock = `let writes=0;globalThis.fetch=async(url,options)=>{
    if(String(url).includes('/v9/projects/')) return Response.json({id:'prj_synthetic',name:'synthetic-web',rootDirectory:'${mode === 'wrong-root' ? 'backend' : 'apps/web'}',framework:'nextjs',link:{type:'github',repoId:123}});
    if(options.method==='POST'){writes++;const body=JSON.parse(options.body);if(body.target!=='staging'||body.gitSource.ref!=='${commit}'||body.gitSource.sha!=='${commit}')throw Error('Unsafe deployment');console.log('synthetic POST');return Response.json({id:'dpl_synthetic'});}
    return Response.json({projectId:'prj_synthetic',target:'${mode === 'production' ? 'production' : 'staging'}',readyState:'READY',gitSource:{sha:'${mode === 'wrong-commit' ? 'b'.repeat(40) : commit}'}});
  };`;
  return run(process.execPath, ['--import', 'data:text/javascript,' + encodeURIComponent(mock), 'scripts/tooling/deploy-vercel-staging.mjs', ...args], {
    env: { PATH: process.env.PATH, NODE_ENV: 'test', DEPLOYMENT_ENV: 'staging', VERCEL_STAGING_PROJECT_ID: 'prj_synthetic',
      VERCEL_TOKEN: 'synthetic-test-token', RELEASE_COMMIT: commit, ...patch },
  });
}
test('Vercel staging uses the exact commit and refuses wrong root, production results and mismatched SHAs', async () => {
  const result = await simulateVercel();
  assert.equal(result.stdout.split('synthetic POST').length - 1, 1);
  assert.ok(result.stdout.includes('staging_deployed'));
  for (const mode of ['wrong-root', 'production', 'wrong-commit']) await assert.rejects(simulateVercel({}, mode));
  for (const patch of [{ DEPLOYMENT_ENV: 'production' }, { RELEASE_COMMIT: 'master' }, { VERCEL_TOKEN: '' }]) await assert.rejects(simulateVercel(patch));
  const plan = await simulateVercel({}, 'ready', []);
  assert.ok(plan.stdout.includes('"mode":"plan"'));
  assert.ok(!plan.stdout.includes('synthetic POST'));
});
