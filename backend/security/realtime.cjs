const { readSessionCookie } = require('./sessions.cjs');
function secureRealtime(io, auth, origins, development = false) {
  io.use(async (socket, next) => {
    try {
      if (!origins.includes(socket.handshake.headers.origin)) throw new Error();
      // Conservative policy: realtime carries unscoped customer/message PII, so only admins may connect.
      const user = await auth.authenticate(readSessionCookie(socket.handshake.headers, development));
      if (user.role !== 'admin') throw new Error();
      socket.data.session = readSessionCookie(socket.handshake.headers, development);
      next();
    } catch { next(new Error('Unauthorized')); }
  });
  // Authenticate again immediately before delivery: logout, expiry, deletion and role changes take effect.
  // The facade replaces raw io.emit in legacy integrations without changing event names/payloads.
  return { emit(event, payload) {
    void Promise.all([...io.sockets.sockets.values()].map(async socket => {
      try {
        const user = await auth.authenticate(socket.data.session);
        if (user.role !== 'admin') { socket.disconnect(true); return; }
        socket.emit(event, payload);
      } catch { socket.disconnect(true); }
    }));
  } };
}
module.exports = { secureRealtime };
