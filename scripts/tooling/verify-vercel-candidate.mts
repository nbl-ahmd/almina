import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function deploymentCandidate(eventName: string | undefined, event: unknown, repository: string | undefined, candidate: string | undefined, master: string): string | undefined {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository ?? '') || !/^[a-f0-9]{40}$/.test(candidate ?? '')) throw new Error('Invalid deployment identity');
  if (eventName === 'workflow_run') {
    const run = record(record(event).workflow_run);
    if (run?.name !== 'Modernization foundation' || run.event !== 'push' || run.conclusion !== 'success'
      || run.head_branch !== 'master' || record(run.head_repository).full_name !== repository || run.head_sha !== candidate) {
      throw new Error('Only successful same-repository master push verification may deploy automatically');
    }
    if (candidate !== master) return undefined;
  } else if (eventName !== 'workflow_dispatch') throw new Error('Unsupported deployment event');
  return candidate;
}

export function requireSuccessfulFoundation(runs: unknown, candidate: string) {
  const values = record(runs).workflow_runs;
  if (!Array.isArray(values) || values.some(value => !Number.isSafeInteger(record(value).run_number))) throw new Error('Invalid verification response');
  const latest = values.map(record).sort((a, b) => Number(a.run_number) - Number(b.run_number)).at(-1);
  if (!latest || latest.head_sha !== candidate || latest.event !== 'push' || latest.status !== 'completed' || latest.conclusion !== 'success') {
    throw new Error('The latest foundation verification for this exact commit must pass');
  }
}

function main() {
  const { GITHUB_EVENT_NAME: eventName, GITHUB_EVENT_PATH: eventPath, GITHUB_REPOSITORY: repository, CANDIDATE: candidate, GITHUB_OUTPUT: output } = process.env;
  if (!eventPath || !output) throw new Error('GitHub event/output paths are required');
  const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();
  const selected = deploymentCandidate(eventName, JSON.parse(readFileSync(eventPath, 'utf8')), repository, candidate, git('rev-parse', 'origin/master'));
  if (!selected) {
    appendFileSync(output, 'deploy=false\n');
    console.log('Skipping an older master commit; a newer commit is already present.');
    return;
  }
  git('merge-base', '--is-ancestor', selected, 'origin/master');
  const runs = JSON.parse(execFileSync('gh', ['api', `repos/${repository}/actions/workflows/foundation.yml/runs?head_sha=${selected}&event=push&per_page=10`], { encoding: 'utf8' }));
  requireSuccessfulFoundation(runs, selected);
  appendFileSync(output, `commit=${selected}\ndeploy=true\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
