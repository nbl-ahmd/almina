import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const journeys = ['homepage', 'product_listing', 'product_search', 'product_detail', 'add_to_cart',
  'checkout_calculation', 'order_creation', 'inventory_change', 'admin_login', 'admin_order_handling',
  'notification_path', 'email_path'] as const;
export const requirements = {
  preflight: ['deployment_inventory', 'backup', 'restore_rehearsal', 'environment', 'credential_rotation',
    'api_compatibility', 'image_compatibility', 'email_delivery', 'whatsapp_delivery', 'push_delivery',
    'admin_authentication', 'product_urls', 'category_urls', 'redirects', 'sitemap', 'robots', 'canonical_metadata',
    'security_tests', 'dependency_audit', 'required_ci', 'migration_plan', 'rollback_rehearsal', 'monitoring_baseline',
    ...journeys.map(name => `staging_${name}`)],
  cutover: ['writers_paused', 'final_backup', 'expand_migrate', 'migration_rerun', 'data_reconciliation',
    'safe_writer_routing', 'deployed_artifacts', 'worker_delivery'],
  complete: ['production_traffic', 'production_seo_html', 'production_security', 'production_reconciliation',
    'production_images', 'production_whatsapp', 'production_push', 'observation_window',
    'monitoring_5xx', 'monitoring_checkout', 'monitoring_duplicates', 'monitoring_inventory',
    'monitoring_latency', 'monitoring_database', 'monitoring_client_errors',
    ...journeys.map(name => `production_${name}`)],
} as const;
export type Phase = keyof typeof requirements;
const phases: Phase[] = ['preflight', 'cutover', 'complete'];
const components = ['web', 'api', 'legacy', 'worker'] as const;
type RecordValue = Record<string, unknown>;
function record(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function nonempty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
function sha(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
}
function instant(value: unknown): number {
  return typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(value)
    ? Date.parse(value) : NaN;
}

// This validates operator evidence, not its truth. Provider/CI readbacks remain mandatory.
// Never reads process.env, accesses a database/provider, deploys, or contracts the schema.
export function validateRelease(value: unknown, phase: Phase, now = Date.now()): string[] {
  if (!record(value)) return ['record'];
  const errors: string[] = [];
  const cutoff = phases.indexOf(phase);
  if (value.schemaVersion !== 1) errors.push('schemaVersion');
  if (!nonempty(value.releaseId)) errors.push('releaseId');
  if (!sha(value.candidateSha)) errors.push('candidateSha');
  if (value.contractAllowed !== false) errors.push('contractAllowed must remain false');
  if (!Array.isArray(value.blockers) || value.blockers.length !== 0) errors.push('unresolved blockers');
  const started = instant(value.startedAt);
  const switched = instant(value.cutoverAt);
  const observedUntil = instant(value.observedUntil);
  if (!Number.isFinite(started) || started > now) errors.push('startedAt');
  if (cutoff === 2 && (!Number.isFinite(switched) || switched < started || switched > now)) errors.push('cutoverAt');
  if (cutoff === 2 && (!Number.isFinite(observedUntil) || observedUntil > now
    || !Number.isFinite(switched) || observedUntil - switched < 24 * 60 * 60 * 1000)) errors.push('observation requires at least 24 hours');
  if (!record(value.deployments)) errors.push('deployments');
  else for (const component of components) {
    const deployment = value.deployments[component];
    if (!record(deployment)) { errors.push(`deployments.${component}`); continue; }
    for (const key of ['currentSha', 'candidateSha']) {
      if (!sha(deployment[key])) errors.push(`deployments.${component}.${key}`);
    }
    for (const key of ['currentDeploymentRef', 'candidateArtifactRef', 'rollbackRef', 'owner']) {
      if (!nonempty(deployment[key])) errors.push(`deployments.${component}.${key}`);
    }
    // Retained services may intentionally stay on their independently verified current SHA.
    if (deployment.candidateSha !== value.candidateSha && deployment.candidateSha !== deployment.currentSha) {
      errors.push(`deployments.${component}.candidateSha mismatch`);
    }
    if (cutoff >= 1 && (deployment.observedSha !== deployment.candidateSha || !nonempty(deployment.observedDeploymentRef))) {
      errors.push(`deployments.${component}.observed artifact`);
    }
  }
  if (!record(value.evidence)) return [...errors, 'evidence'];
  for (const stage of phases.slice(0, cutoff + 1)) for (const check of requirements[stage]) {
    const entry = value.evidence[check];
    if (!record(entry)) { errors.push(`evidence.${check}`); continue; }
    const at = instant(entry.checkedAt);
    if (entry.status !== 'pass' || entry.candidateSha !== value.candidateSha || !nonempty(entry.owner)
      || !nonempty(entry.reference) || !Number.isFinite(at) || at < started || at > now
      || (stage === 'complete' && (!Number.isFinite(switched) || at < switched))
      || (check === 'observation_window' && (!Number.isFinite(observedUntil) || at < observedUntil))) errors.push(`evidence.${check}`);
  }
  return errors;
}

export function releaseTemplate() {
  return {
    schemaVersion: 1, releaseId: '', candidateSha: '', startedAt: '', cutoverAt: '', observedUntil: '', contractAllowed: false,
    blockers: ['Production evidence pending; consult PRODUCTION_CUTOVER_2026-10-03.md'],
    deployments: Object.fromEntries(components.map(name => [name, { currentSha: '', candidateSha: '',
      currentDeploymentRef: '', candidateArtifactRef: '', rollbackRef: '', owner: '', observedSha: '', observedDeploymentRef: '' }])),
    evidence: Object.fromEntries(phases.flatMap(stage => requirements[stage].map(name => [name,
      { status: 'pending', owner: '', checkedAt: '', candidateSha: '', reference: '' }]))),
  };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === 'template') {
    process.stdout.write(JSON.stringify(releaseTemplate(), null, 2) + '\n'); return;
  }
  if (args.length !== 2 || !phases.includes(args[0] as Phase)) throw new Error('arguments');
  const phase = args[0] as Phase;
  const errors = validateRelease(JSON.parse(await readFile(args[1]!, 'utf8')), phase);
  // Output only our field identifiers, never user-supplied records, values or error messages.
  process.stdout.write(JSON.stringify({ phase, result: errors.length ? 'blocked' : 'evidence-accepted', errors }) + '\n');
  if (errors.length) process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main().catch(() => { process.stderr.write('Release gate failed: unreadable record or invalid arguments.\n'); process.exitCode = 1; });
}
