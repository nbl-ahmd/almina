import { setTimeout as delay } from 'node:timers/promises';

async function main() {
  const project = process.env.VERCEL_STAGING_PROJECT_ID;
  const team = process.env.VERCEL_TEAM_ID;
  const commit = process.env.RELEASE_COMMIT;
  const args = process.argv.slice(2);
  if (process.env.DEPLOYMENT_ENV !== 'staging' || !/^prj_[A-Za-z0-9]+$/.test(project ?? '')
    || (team && !/^team_[A-Za-z0-9]+$/.test(team)) || !/^[a-f0-9]{40}$/.test(commit ?? '')
    || (args.length && args.join(' ') !== '--apply')) throw new Error('Invalid staging configuration');
  if (!args.length) {
    console.log(JSON.stringify({ mode: 'plan', provider: 'vercel', project, commit, environment: 'staging' }));
    return;
  }
  const token = process.env.VERCEL_TOKEN;
  if (!token) throw new Error('Missing staging credential');
  async function request(path, body) {
    const url = new URL(path, 'https://api.vercel.com');
    if (team) url.searchParams.set('teamId', team);
    const response = await fetch(url, { method: body ? 'POST' : 'GET', redirect: 'error', signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}) });
    if (!response.ok) throw new Error('Provider request failed');
    return response.json();
  }
  const configuration = await request(`/v9/projects/${project}`);
  if (configuration.id !== project || configuration.rootDirectory !== 'apps/web' || configuration.framework !== 'nextjs'
    || configuration.link?.type !== 'github' || !/^\d+$/.test(String(configuration.link.repoId)) || !configuration.name) {
    throw new Error('Unexpected staging project');
  }
  // Explicit staging target; never promote production or repeat an uncertain POST.
  const deployment = await request('/v13/deployments', { name: configuration.name, project, target: 'staging',
    gitSource: { type: 'github', repoId: String(configuration.link.repoId), ref: commit, sha: commit } });
  if (!/^dpl_[A-Za-z0-9]+$/.test(deployment.id ?? '')) throw new Error('Invalid deployment');
  const deadline = Date.now() + 20 * 60 * 1000;
  while (Date.now() < deadline) {
    const observed = await request(`/v13/deployments/${deployment.id}?withGitRepoInfo=true`);
    if (observed.projectId !== project || observed.target === 'production') throw new Error('Unexpected deployment target');
    if (observed.gitSource?.sha && observed.gitSource.sha !== commit) throw new Error('Unexpected commit');
    if (observed.readyState === 'READY') {
      if (observed.gitSource?.sha !== commit) throw new Error('Missing deployed commit evidence');
      console.log(JSON.stringify({ event: 'staging_deployed', provider: 'vercel', project, deployment: deployment.id, commit }));
      return;
    }
    if (['ERROR', 'CANCELED'].includes(observed.readyState)) throw new Error('Deployment failed');
    await delay(10000);
  }
  throw new Error('Deployment timed out');
}
void main().catch(() => {
  console.error('Vercel staging deployment did not complete. Check configuration/provider records before retrying; no production promotion is supported.');
  process.exitCode = 1;
});
