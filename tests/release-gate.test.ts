import assert from 'node:assert/strict';
import { test } from 'node:test';
import { releaseTemplate, requirements, validateRelease } from '../scripts/migrations/release-gate.js';

const candidate = 'a'.repeat(40);
const prior = 'b'.repeat(40);
const now = Date.parse('2026-10-03T12:00:00Z');
function passing() {
  const value = releaseTemplate();
  Object.assign(value, { releaseId: 'fixture', candidateSha: candidate, startedAt: '2026-10-02T08:00:00Z',
    cutoverAt: '2026-10-02T10:00:00Z', observedUntil: '2026-10-03T10:00:00Z', blockers: [] });
  for (const deployment of Object.values(value.deployments)) Object.assign(deployment, {
    currentSha: prior, candidateSha: candidate, currentDeploymentRef: 'provider/previous',
    candidateArtifactRef: 'registry/immutable', rollbackRef: 'runbook/rollback', owner: 'operator',
    observedSha: candidate, observedDeploymentRef: 'provider/new',
  });
  for (const entry of Object.values(value.evidence)) Object.assign(entry, {
    status: 'pass', candidateSha: candidate, owner: 'operator', checkedAt: '2026-10-03T11:00:00Z', reference: 'restricted/evidence',
  });
  return value;
}
test('template fails closed; null, arrays and malformed records cannot pass', () => {
  for (const value of [releaseTemplate(), null, [], {}, true]) assert.ok(validateRelease(value, 'preflight', now).length);
});
test('every requested gate is individually required; skipped checks never pass', () => {
  for (const checks of Object.values(requirements)) for (const check of checks) {
    const value = passing();
    value.evidence[check]!.status = 'skipped';
    assert.ok(validateRelease(value, 'complete', now).includes(`evidence.${check}`), check);
  }
});
test('preflight permits undeployed candidate but cutover and completion require readback', () => {
  const value = passing();
  value.deployments.web!.observedSha = '';
  assert.deepEqual(validateRelease(value, 'preflight', now), []);
  assert.ok(validateRelease(value, 'cutover', now).length);
  assert.ok(validateRelease(value, 'complete', now).length);
});
test('complete requires production evidence after traffic switch and tied to exact release', () => {
  assert.deepEqual(validateRelease(passing(), 'complete', now), []);
  for (const change of [{ checkedAt: '2026-10-02T09:00:00Z' }, { checkedAt: '2026-10-04T11:00:00Z' },
    { checkedAt: 'invalid' }, { candidateSha: prior }, { reference: '' }, { owner: '' }]) {
    const value = passing();
    Object.assign(value.evidence.production_traffic!, change);
    assert.ok(validateRelease(value, 'complete', now).length);
  }
});
test('retained components are explicit; unrelated artifacts and unknown deployed SHA fail', () => {
  const value = passing();
  value.deployments.worker!.candidateSha = prior;
  value.deployments.worker!.observedSha = prior;
  assert.deepEqual(validateRelease(value, 'complete', now), []);
  value.deployments.api!.candidateSha = 'c'.repeat(40);
  assert.ok(validateRelease(value, 'preflight', now).length);
  value.deployments.legacy!.currentSha = 'unknown';
  assert.ok(validateRelease(value, 'preflight', now).includes('deployments.legacy.currentSha'));
});
test('blockers, absent evidence, invalid dates and contraction prevent acceptance', () => {
  for (const change of [{ blockers: ['audit fails'] }, { blockers: null }, { contractAllowed: true },
    { evidence: null }, { deployments: null }, { startedAt: '' }, { cutoverAt: '' }, { candidateSha: 'short' }]) {
    assert.ok(validateRelease({ ...passing(), ...change }, 'complete', now).length);
  }
});
test('completion requires elapsed observation and a final observation attestation', () => {
  for (const observedUntil of ['', '2026-10-03T09:59:59Z', '2026-10-04T12:00:00Z']) {
    assert.ok(validateRelease({ ...passing(), observedUntil }, 'complete', now).length);
  }
  const value = passing();
  value.evidence.observation_window!.checkedAt = '2026-10-03T09:59:59Z';
  assert.ok(validateRelease(value, 'complete', now).includes('evidence.observation_window'));
});
