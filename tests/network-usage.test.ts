import assert from 'node:assert/strict';
import net from 'node:net';
import { test } from 'node:test';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createNetworkMeter } = require('../backend/diagnostics/network-usage.cjs') as { createNetworkMeter: (options: { minBytes?: number; log: (line: Record<string, unknown>) => void }) => { flush: () => void; stop: () => void } };

test('the meter reports bytes sent to a peer and bytes served, with host names only', async () => {
  const lines: Record<string, unknown>[] = [];
  const meter = createNetworkMeter({ minBytes: 1000, log: line => { lines.push(line); } });
  const server = net.createServer(socket => { socket.on('data', () => undefined); socket.on('error', () => undefined); });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as net.AddressInfo;
  const client = net.connect(port, '127.0.0.1');
  await new Promise<void>(resolve => client.once('connect', resolve));
  await new Promise<void>(resolve => client.write(Buffer.alloc(300000, 1), () => resolve()));
  await new Promise(resolve => setTimeout(resolve, 50));
  meter.flush();
  client.destroy(); server.close(); meter.stop();
  assert.equal(lines.length, 1);
  const line = lines[0]!;
  assert.equal(line.event, 'net_usage');
  const top = line.top as { kind: string; peer: string; outMB: number; inMB: number }[];
  const sent = top.find(row => row.kind === 'client');
  assert.ok(sent && sent.outMB >= 0.28, 'client bytes are attributed to the peer');
  assert.equal(sent!.peer, '127.0.0.1');
  assert.ok(top.some(row => row.kind === 'server' && row.inMB >= 0.28), 'accepted sockets are counted separately');
  assert.ok(!JSON.stringify(line).includes('data'), 'no payload content is logged');
});

test('a quiet window logs nothing', () => {
  const lines: unknown[] = [];
  const meter = createNetworkMeter({ minBytes: 1000000, log: line => { lines.push(line); } });
  meter.flush(); meter.stop();
  assert.deepEqual(lines, []);
});
