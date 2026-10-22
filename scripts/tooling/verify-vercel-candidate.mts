import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
const sha = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);

export function deploymentCandidate(eventName: string | undefined, event: unknown, repository: string | undefined, candidate: string | undefined, master: string): string | undefined {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository ?? '') || !sha(candidate)) throw new Error('Invalid deployment identity');
  if (eventName === 'push') {
    const push = record(event);
    if (push.ref !== 'refs/heads/master' || record(push.repository).full_name !== repository || push.after !== candidate || push.deleted === true) {
      throw new Error('Only a same-repository master push may deploy automatically');
    }
    if (candidate !== master) return undefined;
  } else if (eventName !== 'workflow_dispatch') throw new Error('Unsupported deployment event');
  return candidate;
}

export function requireSuccessfulCi(runs: unknown, candidate: string, event: 'pull_request' | 'workflow_dispatch') {
  const values = record(runs).workflow_runs;
  if (!Array.isArray(values) || values.some(value => !Number.isSafeInteger(record(value).run_number))) throw new Error('Invalid verification response');
  const latest = values.map(record).sort((a, b) => Number(a.run_number) - Number(b.run_number)).at(-1);
  if (!latest || latest.name !== 'CI' || latest.head_sha !== candidate || latest.event !== event
    || latest.status !== 'completed' || latest.conclusion !== 'success'
    || (event === 'workflow_dispatch' && latest.head_branch !== 'master')) {
    throw new Error('The latest CI verification for this exact code must pass');
  }
}

export function verifiedPullHead(pulls: unknown, candidate: string, repository: string): string | undefined {
  if (!Array.isArray(pulls)) throw new Error('Invalid pull request response');
  const merged = pulls.map(record).find(pull => pull.merged_at && pull.merge_commit_sha === candidate
    && record(pull.base).ref === 'master' && record(record(pull.base).repo).full_name === repository);
  if (!merged) return undefined;
  const head = record(merged.head).sha;
  if (!sha(head)) throw new Error('Invalid tested head');
  return head;
}

export function requireMatchingTrees(testedTree: unknown, releaseTree: unknown) {
  if (!sha(testedTree) || !sha(releaseTree) || testedTree !== releaseTree) {
    throw new Error('Merged code differs from the tested PR; update the branch and rerun CI before merging');
  }
}

function main() {
  const { GITHUB_EVENT_NAME: eventName, GITHUB_EVENT_PATH: eventPath, GITHUB_REPOSITORY: repository, CANDIDATE: candidate, GITHUB_OUTPUT: output } = process.env;
  if (!eventPath || !output || !repository) throw new Error('GitHub event/output paths and repository are required');
  const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();
  const api = (path: string): unknown => JSON.parse(execFileSync('gh', ['api', `repos/${repository}/${path}`], { encoding: 'utf8' }));
  const selected = deploymentCandidate(eventName, JSON.parse(readFileSync(eventPath, 'utf8')), repository, candidate, git('rev-parse', 'origin/master'));
  if (!selected) {
    appendFileSync(output, 'deploy=false\n');
    console.log('Skipping an older master commit; a newer commit is already present.');
    return;
  }
  git('merge-base', '--is-ancestor', selected, 'origin/master');
  const head = verifiedPullHead(api(`commits/${selected}/pulls`), selected, repository);
  const tested = head ?? selected;
  const event = head ? 'pull_request' : 'workflow_dispatch';
  requireSuccessfulCi(api(`actions/workflows/ci.yml/runs?head_sha=${tested}&event=${event}&per_page=10`), tested, event);
  if (head) requireMatchingTrees(record(record(api(`git/commits/${head}`)).tree).sha, git('rev-parse', `${selected}^{tree}`));
  appendFileSync(output, `commit=${selected}\ndeploy=true\n`);
  console.log('Release matches successful CI; no duplicate test run required.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
