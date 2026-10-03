import { setTimeout as delay } from 'node:timers/promises';

// This workflow is for explicitly configured staging copies. Never target the
// production service supplied by the owner, and never retry an uncertain POST.
const service = process.env.RENDER_SERVICE_ID;
const commit = process.env.RELEASE_COMMIT;
if (process.env.DEPLOYMENT_ENV !== 'staging' || !/^srv-[a-z0-9]+$/.test(service ?? '')
  || service === 'srv-cv1dn5lds78s73doqjm0' || !/^[a-f0-9]{40}$/.test(commit ?? '')) {
  throw new Error('Explicit staging service and exact release commit required');
}
if (process.argv.slice(2).join(' ') !== '--apply') {
  console.log(JSON.stringify({ mode: 'plan', service, commit, environment: 'staging' }));
} else {
  const token = process.env.RENDER_API_KEY;
  if (!token) throw new Error('Staging deploy credential is missing');
  async function request(path, body) {
    const response = await fetch(`https://api.render.com/v1/services/${service}/deploys${path}`, {
      method: body ? 'POST' : 'GET', redirect: 'error', signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) throw new Error('Render deployment request failed');
    return response.json();
  }
  try {
    const deployed = await request('', { commitId: commit, clearCache: 'do_not_clear' });
    if (!/^dep-[a-z0-9]+$/.test(deployed.id ?? '')) throw new Error('Invalid deployment response');
    const deadline = Date.now() + 20 * 60 * 1000;
    while (Date.now() < deadline) {
      const status = await request(`/${deployed.id}`);
      if (status.commit?.id && status.commit.id !== commit) throw new Error('Unexpected deployed commit');
      if (status.status === 'live') {
        if (status.commit?.id !== commit) throw new Error('Deployed commit was not verified');
        console.log(JSON.stringify({ event: 'staging_deployed', service, deployment: deployed.id, commit }));
        break;
      }
      if (['build_failed', 'update_failed', 'canceled', 'deactivated'].includes(status.status)) throw new Error('Staging deployment failed');
      await delay(10000);
      if (Date.now() >= deadline) throw new Error('Staging deployment timed out');
    }
  } catch {
    // Do not print provider payloads, authorization headers or native fetch errors.
    console.error('Staging deployment did not complete. Inspect Render before retrying an uncertain deployment.');
    process.exitCode = 1;
  }
}
