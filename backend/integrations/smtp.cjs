const nodemailer = require('nodemailer');
const net = require('node:net');
// Nodemailer's non-pooled transport.close() does not close an active send.
// Own the TCP socket explicitly so domain cancellation terminates it, including STARTTLS.
function createSmtpTransport(options, mailer = nodemailer, connect = net.createConnection) {
  let socket, closed = false;
  const transport = mailer.createTransport({ ...options, getSocket(_options, callback) {
    if (closed) return callback(new Error('Mail transport closed'));
    socket = connect({ host: options.host, port: options.port });
    let returned = false;
    const done = (error, connection) => {
      if (returned) return; returned = true;
      callback(error, connection ? { connection } : undefined);
    };
    socket.once('connect', () => done(null, socket));
    socket.once('error', () => done(new Error('Mail connection unavailable')));
    socket.once('close', () => done(new Error('Mail connection closed')));
  } });
  return { sendMail: message => transport.sendMail(message), close() {
    closed = true; socket?.destroy(); transport.close();
  } };
}
module.exports = { createSmtpTransport };
