import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function needsRuntimeChecks(paths: string[]): boolean {
  // Unknown files, workflow changes, dependencies and tests all fail into full CI.
  return paths.length === 0 || paths.some(path => !path.endsWith('.md') && !path.startsWith('docs/'));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { BASE_SHA: base, GITHUB_EVENT_NAME: event, GITHUB_OUTPUT: output } = process.env;
  if (!output) throw new Error('GitHub output path required');
  let runtime = true;
  if (event === 'pull_request') {
    if (!/^[a-f0-9]{40}$/.test(base ?? '')) throw new Error('Invalid base commit');
    const paths = execFileSync('git', ['diff', '--name-only', '-z', `${base}...HEAD`], { encoding: 'utf8' }).split('\0').filter(Boolean);
    runtime = needsRuntimeChecks(paths);
  }
  appendFileSync(output, `runtime=${runtime}\n`);
}
