'use strict';
/** Says where this process's network bytes go, so a bandwidth spike can be traced to a destination instead of guessed at.
 *
 *  Every socket the process opens (database, Cloudinary, e-mail, push and so on, "client") or accepts (HTTP responses, "server") is counted
 *  from Node's own socket counters. Once in a while one summary line is logged with the busiest peers. Only host names and byte totals are
 *  recorded: no URLs, paths, headers, request bodies or customer data. It makes no network request, holds one unreferenced timer, and
 *  logs nothing when the window moved less than `minBytes`. `database` adds the busiest database commands (names and totals).
 *  Switch off with NET_USAGE_LOG=false. */
const dc = require('node:diagnostics_channel');

function createNetworkMeter({ flushMs = 600000, minBytes = 1000000, log = line => console.info(JSON.stringify(line)), now = () => Date.now(), database } = {}) {
  const live = new Map();
  let rows = new Map(), windowStart = now(), timer;
  const peerOf = (socket, kind) => kind === 'server' ? 'http-clients' : String(socket.servername || socket._host || socket.remoteAddress || 'unknown');

  function account(socket) {
    const entry = live.get(socket);
    if (!entry) return;
    const out = Math.max(0, (socket.bytesWritten || 0) - entry.out), inn = Math.max(0, (socket.bytesRead || 0) - entry.in);
    entry.out = socket.bytesWritten || 0; entry.in = socket.bytesRead || 0;
    if (!out && !inn) return;
    const key = `${entry.kind}\u0000${peerOf(socket, entry.kind)}`;
    const row = rows.get(key) || { kind: entry.kind, peer: peerOf(socket, entry.kind), out: 0, in: 0, sockets: new Set() };
    row.out += out; row.in += inn; row.sockets.add(socket);
    rows.set(key, row);
  }
  function arm() {
    if (timer) return;
    timer = setTimeout(() => { timer = undefined; flush(); }, flushMs);
    timer.unref?.();
  }
  function flush() {
    for (const socket of live.keys()) account(socket);
    const list = [...rows.values()];
    const totalOut = list.reduce((sum, row) => sum + row.out, 0), totalIn = list.reduce((sum, row) => sum + row.in, 0);
    const started = windowStart;
    rows = new Map(); windowStart = now();
    // Drained every window, logged or not, so each line describes the same period as its byte totals.
    const commands = database?.() ?? [];
    if (Math.max(totalOut, totalIn) >= minBytes) {
      const mb = value => Math.round(value / 1048576 * 100) / 100;
      log({ time: new Date().toISOString(), level: 'info', service: 'api', event: 'net_usage', windowMinutes: Math.round((windowStart - started) / 60000),
        outMB: mb(totalOut), inMB: mb(totalIn), ...(commands.length ? { db: commands } : {}),
        top: list.sort((a, b) => b.out + b.in - (a.out + a.in)).slice(0, 8).map(row => ({ kind: row.kind, peer: row.peer, outMB: mb(row.out), inMB: mb(row.in), sockets: row.sockets.size })) });
    }
    if (live.size) arm();
  }
  function track(kind) {
    return message => {
      const socket = message && message.socket;
      if (!socket || live.has(socket)) return;
      live.set(socket, { kind, out: 0, in: 0 });
      socket.once('close', () => { account(socket); live.delete(socket); });
      arm();
    };
  }
  const client = track('client'), server = track('server');
  dc.subscribe('net.client.socket', client); dc.subscribe('net.server.socket', server);
  return { flush, stop() { dc.unsubscribe('net.client.socket', client); dc.unsubscribe('net.server.socket', server); clearTimeout(timer); timer = undefined; live.clear(); rows.clear(); } };
}
module.exports = { createNetworkMeter };
