import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile } from 'node:fs/promises';

const run = promisify(execFile);
await mkdir('.verification-results', { recursive: true });
let failed = false;
for (const name of ['root', 'backend']) {
  let output;
  try {
    const result = await run('npm', ['audit', '--json', '--audit-level=high', ...(name === 'root' ? [] : ['--prefix', name])], { maxBuffer: 10 * 1024 * 1024 });
    output = result.stdout;
  } catch (error) {
    failed = true;
    output = error.stdout;
  }
  try {
    const report = JSON.parse(output);
    await writeFile(`.verification-results/audit-${name}.json`, JSON.stringify(report, null, 2) + '\n');
    const counts = report.metadata?.vulnerabilities;
    if (!counts || report.error) { failed = true; console.error(`${name}: audit service failed`); }
    else {
      console.log(`${name}: ${counts.high} high, ${counts.critical} critical advisories`);
      for (const [dependency, vulnerability] of Object.entries(report.vulnerabilities ?? {})) {
        if (!['high', 'critical'].includes(vulnerability.severity)) continue;
        console.error(`${name}: ${dependency} (${vulnerability.severity}), affected range: ${vulnerability.range}`);
        for (const advisory of vulnerability.via ?? []) {
          if (typeof advisory === 'object') console.error(`  ${advisory.title}: ${advisory.url}`);
        }
      }
      if (counts.high > 0 || counts.critical > 0) failed = true;
    }
  } catch { failed = true; console.error(`${name}: invalid audit response`); }
}
if (failed) { console.error('Dependency security gate failed. Inspect .verification-results/audit-*.json.'); process.exitCode = 1; }
