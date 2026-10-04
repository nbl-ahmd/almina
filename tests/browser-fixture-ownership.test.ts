import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { assertExclusiveLoopbackPorts, fixtureHealth, monitorOwnedChild } from '../scripts/tooling/e2e-ownership.mjs';
test('loopback ownership refuses occupied/invalid ports without contacting or closing their owner and releases reservations', async () => {
  const server = createServer(); let contacts = 0; server.on('connection', socket => { contacts++; socket.end(); });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string'); const port = address.port;
  try {
    await assert.rejects(assertExclusiveLoopbackPorts([port]), { message: `E2E loopback port ${port} unavailable; stop its owner before verification` });
    assert.equal(contacts, 0); assert.equal(server.listening, true);
    for (const invalid of [[], [0], [65536], [1.5], [port, port]]) await assert.rejects(assertExclusiveLoopbackPorts(invalid), { message: 'Invalid E2E loopback port set' });
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
  await assertExclusiveLoopbackPorts([port]);
  await new Promise<void>(resolve => server.listen(port, '127.0.0.1', resolve));
  await new Promise<void>(resolve => server.close(() => resolve()));
});
test('fixture readiness is bound to this run while standalone synthetic fixture contracts remain', () => {
  const run = randomUUID(); assert.equal(fixtureHealth('synthetic', run), 'synthetic:' + run);
  assert.equal(fixtureHealth('synthetic'), 'synthetic');
  assert.notEqual(fixtureHealth('synthetic', run), fixtureHealth('synthetic', randomUUID()));
  assert.throws(() => fixtureHealth('synthetic', 'private invalid identifier'), { message: 'Invalid E2E fixture identity' });
});
test('real coordinator exits before fixture/database children when a verification port is occupied', { timeout: 5000 }, async () => {
  const server = createServer(); let contacts = 0; server.on('connection', socket => { contacts++; socket.end(); });
  await new Promise<void>(resolve => server.listen(4730, '127.0.0.1', resolve));
  try {
    const child = spawn(process.execPath, ['scripts/tooling/e2e-servers.mjs'], { env: { NODE_ENV: 'test', PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR }, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = ''; child.stdout.on('data', chunk => { output += String(chunk); }); child.stderr.on('data', chunk => { output += String(chunk); });
    const exit = await new Promise<number | null>((resolve, reject) => { child.once('exit', resolve); child.once('error', reject); });
    assert.equal(exit, 1); assert.match(output, /E2E loopback port 4730 unavailable/); assert.equal(contacts, 0); assert.equal(server.listening, true);
    assert.ok(!output.includes('Disposable real commerce') && !output.includes('Owned E2E child exited'));
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});

test('owned real child exits are reported once while deliberate shutdown is distinguished', async () => {
  for (const stopping of [false, true]) {
    const child = spawn(process.execPath, ['-e', 'process.exit(2)'], { env: { NODE_ENV: 'test' }, stdio: 'ignore' }); let failures = 0;
    monitorOwnedChild(child, () => stopping, () => { failures++; });
    await new Promise<void>((resolve, reject) => { child.once('exit', () => resolve()); child.once('error', reject); });
    assert.equal(failures, stopping ? 0 : 1);
  }
});
