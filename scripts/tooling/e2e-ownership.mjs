import { createServer } from 'node:net';
// Bind only known loopback ports before starting any fixture/database/application child.
// Never probe application HTTP, kill another listener, or reuse its data.
export async function assertExclusiveLoopbackPorts(ports) {
  if (!Array.isArray(ports) || !ports.length || ports.length > 10 || new Set(ports).size !== ports.length
    || ports.some(port => !Number.isInteger(port) || port < 1 || port > 65535)) throw new Error('Invalid E2E loopback port set');
  const servers = [];
  try {
    for (const port of ports) {
      const server = createServer(); servers.push(server);
      await new Promise((resolve, reject) => {
        server.once('error', () => reject(new Error(`E2E loopback port ${port} unavailable; stop its owner before verification`)));
        server.listen({ port, host: '127.0.0.1', exclusive: true }, resolve);
      });
    }
  } finally {
    await Promise.all(servers.map(server => new Promise(resolve => server.listening ? server.close(resolve) : resolve())));
  }
}
export function fixtureHealth(name, runId) {
  if (runId === undefined) return name;
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(runId)) throw new Error('Invalid E2E fixture identity');
  return `${name}:${runId}`;
}
// A healthy HTTP response must never hide an owned child's exit or bind/startup failure.
export function monitorOwnedChild(child, isStopping, onFailure) {
  let reported = false;
  const failed = () => { if (reported || isStopping()) return; reported = true; onFailure(); };
  child.once('error', failed); child.once('exit', failed);
}
