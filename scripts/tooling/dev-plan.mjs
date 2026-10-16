export function localDevPlan(env, args) {
  if (env.APP_ENV && env.APP_ENV !== 'development') throw new Error('Local dev requires APP_ENV=development.');
  let port = 3000;
  let hostname = '127.0.0.1';
  for (let i = 0; i < args.length; i++) {
    if (['--port', '-p'].includes(args[i])) port = Number(args[++i]);
    else if (args[i].startsWith('--port=')) port = Number(args[i].slice(7));
    else if (['--hostname', '-H'].includes(args[i])) hostname = args[++i];
    else if (args[i].startsWith('--hostname=')) hostname = args[i].slice(11);
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid development port.');
  if (!['127.0.0.1', 'localhost'].includes(hostname)) throw new Error('Local dev requires a loopback hostname.');
  return { port, hostname, webOrigin: `http://${hostname}:${port}` };
}

export function localApiEnvironment(source, webOrigin) {
  if (source.APP_ENV !== 'development') throw new Error('Local API requires an explicitly configured development environment. Use a separate development database.');
  return { ...source, APP_ENV: 'development', NODE_ENV: 'development',
    AUTH_ALLOWED_ORIGINS: [...new Set([...(source.AUTH_ALLOWED_ORIGINS ?? '').split(',').filter(Boolean), webOrigin])].join(',') };
}
