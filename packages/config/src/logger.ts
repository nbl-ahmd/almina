import type { AppEnvironment } from './env.js';

type Level = 'info' | 'warn' | 'error';
type Event = 'http_request' | 'request_failed' | 'api_started' | 'api_stopped'
  | 'configuration_invalid' | 'database_unavailable' | 'shutdown_failed' | 'web_error';
type Context = {
  requestId?: string;
  method?: string;
  route?: string;
  status?: number;
  durationMs?: number;
};

// Deliberately allow only operational fields; never serialize errors, bodies, env, URLs or headers.
export function createLogger(options: {
  service: 'api' | 'web';
  environment: AppEnvironment;
  level?: Level;
  write?: (line: string) => void;
}) {
  const priorities = { info: 0, warn: 1, error: 2 };
  const write = options.write ?? ((line: string) => process.stdout.write(`${line}\n`));
  return {
    log(level: Level, event: Event, context: Context = {}) {
      if (priorities[level] < priorities[options.level ?? 'info']) return;
      const safe: Context = {};
      if (context.requestId && /^[0-9a-f-]{36}$/.test(context.requestId)) safe.requestId = context.requestId;
      if (context.method && /^(GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS)$/.test(context.method)) safe.method = context.method;
      if (context.route && /^\/[A-Za-z0-9/:_-]{0,120}$/.test(context.route)) safe.route = context.route;
      if (typeof context.status === 'number' && Number.isInteger(context.status)) safe.status = context.status;
      if (typeof context.durationMs === 'number' && Number.isFinite(context.durationMs)) safe.durationMs = context.durationMs;
      write(JSON.stringify({ time: new Date().toISOString(), level, service: options.service,
        environment: options.environment, event, ...safe }));
    },
  };
}

export type Logger = ReturnType<typeof createLogger>;
