import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFileSync } from 'node:fs';
import { deploymentCandidate, requireSuccessfulCi, verifiedPullHead, requireMatchingTrees } from '../scripts/tooling/verify-vercel-candidate.mjs';
import { needsRuntimeChecks } from '../scripts/tooling/ci-changes.mjs';
import { productionApiOrigin, requireProductionVercelEnvironment } from '../scripts/tooling/production-vercel-config.mjs';

const commit = 'a'.repeat(40), head = 'b'.repeat(40), tree = 'c'.repeat(40), repository = 'pharmacy/store';
const run = promisify(execFile);
const passed = { name: 'CI', run_number: 1, head_sha: head, event: 'pull_request', status: 'completed', conclusion: 'success' };
const pull = { merged_at: '2026-10-23', merge_commit_sha: commit, base: { ref: 'master', repo: { full_name: repository } }, head: { sha: head } };

test('production deployment requires both API settings to match the approved origin', () => {
  const env = { APP_ENV: 'production', CHECKOUT_ENABLED: 'true', WEB_ORIGIN: 'https://alminapharmacy.com', API_ORIGIN: productionApiOrigin, LEGACY_API_ORIGIN: productionApiOrigin };
  assert.doesNotThrow(() => requireProductionVercelEnvironment(env));
  assert.equal(productionApiOrigin, 'https://almina-yhxk.onrender.com');
  assert.throws(() => requireProductionVercelEnvironment({ ...env, API_ORIGIN: 'https://almina-5tse.onrender.com' }), /API_ORIGIN/, 'the suspended service is no longer approved');
  for (const key of Object.keys(env)) {
    const value = 'synthetic-unexpected-value';
    assert.throws(() => requireProductionVercelEnvironment({ ...env, [key]: value }), { message: `Frontend production configuration requires review: ${key}` });
  }
});

test('deployment accepts same-repository master pushes, skips stale commits and validates manual SHAs', () => {
  const push = { ref: 'refs/heads/master', repository: { full_name: repository }, after: commit };
  assert.equal(deploymentCandidate('push', push, repository, commit, commit), commit);
  assert.equal(deploymentCandidate('push', push, repository, commit, head), undefined);
  for (const patch of [{ ref: 'refs/heads/feature' }, { repository: { full_name: 'someone/fork' } }, { after: head }, { deleted: true }]) {
    assert.throws(() => deploymentCandidate('push', { ...push, ...patch }, repository, commit, commit));
  }
  assert.throws(() => deploymentCandidate('workflow_run', {}, repository, commit, commit));
  assert.throws(() => deploymentCandidate('workflow_dispatch', {}, repository, 'master', commit));
  assert.equal(deploymentCandidate('workflow_dispatch', {}, repository, commit, head), commit);
});

test('deployment requires latest successful CI for the exact tested head and expected event', () => {
  assert.doesNotThrow(() => requireSuccessfulCi({ workflow_runs: [passed] }, head, 'pull_request'));
  assert.throws(() => requireSuccessfulCi({ workflow_runs: [] }, head, 'pull_request'));
  for (const patch of [{ head_sha: commit }, { event: 'push' }, { name: 'Other workflow' }, { status: 'in_progress' }, { conclusion: 'failure' }, { conclusion: 'cancelled' }, { conclusion: 'skipped' }]) {
    assert.throws(() => requireSuccessfulCi({ workflow_runs: [{ ...passed, ...patch }] }, head, 'pull_request'));
  }
  assert.throws(() => requireSuccessfulCi({ workflow_runs: [{ ...passed, run_number: 2, conclusion: 'failure' }, passed] }, head, 'pull_request'));
  const manual = { ...passed, head_sha: commit, event: 'workflow_dispatch', head_branch: 'master' };
  assert.doesNotThrow(() => requireSuccessfulCi({ workflow_runs: [manual] }, commit, 'workflow_dispatch'));
  assert.throws(() => requireSuccessfulCi({ workflow_runs: [{ ...manual, head_branch: 'feature' }] }, commit, 'workflow_dispatch'));
});

test('release requires the actual merged PR and identical file trees', () => {
  assert.equal(verifiedPullHead([pull], commit, repository), head);
  for (const patch of [{ merged_at: null }, { merge_commit_sha: head }, { base: { ref: 'feature' } }, { base: { ref: 'master', repo: { full_name: 'other/repo' } } }]) {
    assert.equal(verifiedPullHead([{ ...pull, ...patch }], commit, repository), undefined);
  }
  assert.throws(() => verifiedPullHead({}, commit, repository));
  assert.throws(() => verifiedPullHead([{ ...pull, head: { sha: 'master' } }], commit, repository));
  assert.doesNotThrow(() => requireMatchingTrees(tree, tree));
  assert.throws(() => requireMatchingTrees(tree, head));
  assert.throws(() => requireMatchingTrees(undefined, undefined));
});

test('only documentation changes skip runtime CI; unknown paths and manual runs remain covered', () => {
  assert.equal(needsRuntimeChecks(['README.md', 'docs/migration/status.json']), false);
  for (const files of [[], ['README.md', 'apps/api/src/app.ts'], ['package-lock.json'], ['.github/workflows/ci.yml'], ['tests/example.test.ts'], ['scripts/tooling/ci-changes.mts']]) assert.equal(needsRuntimeChecks(files), true);
});

test('CI runs once per PR head; the protected gate and deployment use the same identity', () => {
  const ci = readFileSync('.github/workflows/ci.yml', 'utf8');
  assert.match(ci, /^name: CI/m);
  assert.doesNotMatch(ci, /^ {2}push:/m);
  assert.match(ci, /ref: \$\{\{ github.event.pull_request.head.sha \|\| github.sha \}\}/);
  assert.doesNotMatch(ci, /playwright install|test:e2e:smoke|smoke:foundation|smoke:storefront/);
  assert.match(ci, /needs: \[changes, quality, api, build\]/);
  assert.match(ci, /test "\$CHANGES_RESULT" = success/);
  assert.match(ci, /if \[ "\$RUNTIME" = false \]; then expected=skipped; fi/);
  const browser = readFileSync('.github/workflows/browser.yml', 'utf8');
  assert.match(browser, /workflow_dispatch:/);
  assert.doesNotMatch(browser, /pull_request:|push:/);
  assert.match(readFileSync('.github/workflows/deploy-vercel-web.yml', 'utf8'), / {2}push:\n {4}branches: \[master\]/);
});

test('native deployment gate reuses verified code and rejects mismatched merge trees or ancestry', async () => {
  async function gate(mode: string) {
    const mock = `import fs from 'node:fs';import cp from 'node:child_process';import {syncBuiltinESMExports} from 'node:module';
      const read=fs.readFileSync;fs.readFileSync=(path,...args)=>path==='/synthetic-event.json'?JSON.stringify({ref:'refs/heads/master',repository:{full_name:'${repository}'},after:'${commit}'}):read(path,...args);
      fs.appendFileSync=(path,value)=>{if(path!=='/synthetic-output')throw Error('Unexpected output');console.log(value);};
      cp.execFileSync=(command,args)=>{
        if(command==='git'&&args[0]==='rev-parse')return args[1].includes('tree')?'${mode === 'changed-tree' ? head : tree}':'${mode === 'stale' ? head : commit}';
        if(command==='git'&&args[0]==='merge-base'){if('${mode}'==='not-ancestor')throw Error('Not an ancestor');return '';}
        if(command==='gh'&&args[0]==='api'){
          if('${mode}'==='stale')throw Error('Stale candidate must not query verification');
          if(args[1].endsWith('/pulls'))return JSON.stringify([${JSON.stringify(pull)}]);
          if(args[1].includes('/git/commits/'))return JSON.stringify({tree:{sha:'${tree}'}});
          if(args[1].includes('/ci.yml/runs?head_sha=${head}&event=pull_request'))return JSON.stringify({workflow_runs:[${JSON.stringify(passed)}]});
        }throw Error('Unexpected command');};syncBuiltinESMExports();`;
    return run(process.execPath, ['--import', 'data:text/javascript,' + encodeURIComponent(mock), 'scripts/tooling/verify-vercel-candidate.mts'], {
      env: { PATH: process.env.PATH, NODE_ENV: 'test', GITHUB_EVENT_NAME: 'push', GITHUB_EVENT_PATH: '/synthetic-event.json', GITHUB_REPOSITORY: repository, CANDIDATE: commit, GITHUB_OUTPUT: '/synthetic-output' },
    });
  }
  assert.match((await gate('ready')).stdout, new RegExp(`commit=${commit}\\ndeploy=true`));
  assert.match((await gate('stale')).stdout, /deploy=false/);
  await assert.rejects(gate('not-ancestor'));
  await assert.rejects(gate('changed-tree'));
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
