import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { deploymentCandidate, requireSuccessfulFoundation } from '../scripts/tooling/verify-vercel-candidate.mjs';

test('automatic Vercel deploy accepts only successful same-repository master pushes and skips stale commits', () => {
  const sha = 'a'.repeat(40), repository = 'pharmacy/store';
  const run = { name: 'Modernization foundation', event: 'push', conclusion: 'success', head_branch: 'master', head_repository: { full_name: repository }, head_sha: sha };
  assert.equal(deploymentCandidate('workflow_run', { workflow_run: run }, repository, sha, sha), sha);
  assert.equal(deploymentCandidate('workflow_run', { workflow_run: run }, repository, sha, 'b'.repeat(40)), undefined);
  for (const patch of [{ event: 'pull_request' }, { conclusion: 'failure' }, { head_branch: 'feature' }, { head_repository: { full_name: 'someone/fork' } }, { head_sha: 'b'.repeat(40) }, { name: 'Unrelated checks' }]) {
    assert.throws(() => deploymentCandidate('workflow_run', { workflow_run: { ...run, ...patch } }, repository, sha, sha));
  }
  assert.throws(() => deploymentCandidate('push', {}, repository, sha, sha));
  assert.throws(() => deploymentCandidate('workflow_dispatch', {}, repository, 'master', sha));
  assert.equal(deploymentCandidate('workflow_dispatch', {}, repository, sha, 'b'.repeat(40)), sha);
});

test('Vercel deployment refuses missing, mismatched, pending or superseded foundation results', () => {
  const sha = 'a'.repeat(40), passed = { run_number: 1, head_sha: sha, event: 'push', status: 'completed', conclusion: 'success' };
  assert.doesNotThrow(() => requireSuccessfulFoundation({ workflow_runs: [passed] }, sha));
  assert.throws(() => requireSuccessfulFoundation({ workflow_runs: [] }, sha));
  for (const patch of [{ head_sha: 'b'.repeat(40) }, { event: 'pull_request' }, { status: 'in_progress' }, { conclusion: 'failure' }]) {
    assert.throws(() => requireSuccessfulFoundation({ workflow_runs: [{ ...passed, ...patch }] }, sha));
  }
  assert.throws(() => requireSuccessfulFoundation({ workflow_runs: [{ ...passed, run_number: 2, conclusion: 'failure' }, passed] }, sha));
});

const run = promisify(execFile);
const commit = 'a'.repeat(40);
test('native Node deployment gate emits the verified SHA, skips stale automation and rejects non-ancestor candidates', async () => {
  async function gate(mode: string) {
    const mock = `import fs from 'node:fs';import cp from 'node:child_process';import {syncBuiltinESMExports} from 'node:module';
      const read=fs.readFileSync;fs.readFileSync=(path,...args)=>path==='/synthetic-event.json'?JSON.stringify({workflow_run:{name:'Modernization foundation',event:'push',conclusion:'success',head_branch:'master',head_repository:{full_name:'pharmacy/store'},head_sha:'${commit}'}}):read(path,...args);
      fs.appendFileSync=(path,value)=>{if(path!=='/synthetic-output')throw Error('Unexpected output');console.log(value);};
      cp.execFileSync=(command,args)=>{if(command==='git'&&args[0]==='rev-parse')return '${mode === 'stale' ? 'b'.repeat(40) : commit}';
        if(command==='git'&&args[0]==='merge-base'){if('${mode}'==='not-ancestor')throw Error('Not an ancestor');return '';}
        if(command==='gh'&&args[0]==='api'){if('${mode}'==='stale')throw Error('Stale candidate must not query verification');return JSON.stringify({workflow_runs:[{run_number:1,head_sha:'${commit}',event:'push',status:'completed',conclusion:'success'}]});}
        throw Error('Unexpected command');};syncBuiltinESMExports();`;
    return run(process.execPath, ['--import', 'data:text/javascript,' + encodeURIComponent(mock), 'scripts/tooling/verify-vercel-candidate.mts'], {
      env: { PATH: process.env.PATH, NODE_ENV: 'test', GITHUB_EVENT_NAME: 'workflow_run', GITHUB_EVENT_PATH: '/synthetic-event.json', GITHUB_REPOSITORY: 'pharmacy/store', CANDIDATE: commit, GITHUB_OUTPUT: '/synthetic-output' },
    });
  }
  assert.match((await gate('ready')).stdout, new RegExp(`commit=${commit}\\ndeploy=true`));
  assert.match((await gate('stale')).stdout, /deploy=false/);
  await assert.rejects(gate('not-ancestor'));
});
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
