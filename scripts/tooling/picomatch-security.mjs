import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const advisory = 'https://github.com/advisories/GHSA-fc5q-39xc-vjpf';
const originalHash = '4e1e05447668aa1e94366c5516a2bcd8f5fff800cc92b1d0cd7d77703b8618c4';
const patchedHash = '53b15f058ec145536cb3a389d9d2faadadbeb8ba3b7d11dadd5daab944ce01b0';
const hash = source => createHash('sha256').update(source).digest('hex');
const anchor = 'const analyzeRepeatedExtglob = (body, options) => {\n';
const replacement = anchor + `  // Al Mina GHSA-fc5q-39xc-vjpf: literalize repeated wildcard bodies.
  // Conservative until upstream releases a fix; includes single-branch extglobs.
  if (/[*?]/.test(body)) {
    return { risky: true };
  }

`;

// No configuration, network or database access. Unknown versions/content fail closed.
export async function verifyPicomatch({ apply = false, now = Date.now() } = {}) {
  if (now >= Date.parse('2026-12-17T00:00:00Z')) throw new Error('Picomatch mitigation expired; review upstream releases and advisory.');
  const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
  const entries = Object.entries(lock.packages).filter(([path]) => /(^|\/)node_modules\/picomatch$/.test(path));
  if (entries.length !== 1 || entries[0][0] !== 'node_modules/picomatch' || entries[0][1].version !== '4.0.7') {
    throw new Error('Picomatch dependency layout changed; re-review the mitigation.');
  }
  const metadata = JSON.parse(await readFile('node_modules/picomatch/package.json', 'utf8'));
  if (metadata.version !== '4.0.7') throw new Error('Unexpected installed picomatch version.');
  const file = 'node_modules/picomatch/lib/parse.js';
  let source = await readFile(file, 'utf8');
  if (apply && hash(source) === originalHash) {
    source = source.replace(anchor, replacement);
    if (hash(source) !== patchedHash) throw new Error('Unexpected picomatch patch output.');
    await writeFile(file, source);
  }
  if (hash(source) !== patchedHash) throw new Error('Picomatch security patch is absent or modified.');
}

// Only this advisory and exclusively derived findings can be mitigated. New
// advisories on any parent still fail. The raw npm audit report stays unchanged.
export function unresolvedFindings(vulnerabilities, patched) {
  const item = vulnerabilities.picomatch;
  const mitigated = patched && item?.nodes?.length === 1 && item.nodes[0] === 'node_modules/picomatch' &&
    item.via?.length === 1 && typeof item.via[0] === 'object' && item.via[0].url === advisory;
  function hasUnresolvedHigh(name, seen = new Set()) {
    if (name === 'picomatch' && mitigated) return false;
    const entry = vulnerabilities[name];
    if (!entry || seen.has(name) || !Array.isArray(entry.via) || entry.via.length === 0) return true;
    const next = new Set([...seen, name]);
    return entry.via.some(via => typeof via === 'string'
      ? hasUnresolvedHigh(via, next)
      : !['info', 'low', 'moderate'].includes(via.severity));
  }
  return Object.entries(vulnerabilities).filter(([name, entry]) =>
    ['high', 'critical'].includes(entry.severity) && hasUnresolvedHigh(name));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  verifyPicomatch({ apply: !process.argv.includes('--verify') }).then(() => {
    console.log('Verified pinned picomatch repeated-extglob mitigation.');
  }).catch(error => { console.error(error.message); process.exitCode = 1; });
}
