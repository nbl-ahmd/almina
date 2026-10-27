import type { AppEnvironment } from './env.js';

type Level = 'info' | 'warn' | 'error';
type Event = 'http_request' | 'request_failed' | 'api_started' | 'api_stopped'
  | 'configuration_invalid' | 'database_unavailable' | 'shutdown_failed' | 'web_error' | 'catalog_query' | 'reminder_failed' | 'search_query';
type Context = {
  requestId?: string;
  method?: string;
  route?: string;
  status?: number;
  durationMs?: number;
  operation?: string;
  searchId?:string;locale?:'en'|'ar';queryHash?:string;lexical?:number;semantic?:number;resultCount?:number;relaxed?:boolean;corrected?:boolean;unavailable?:boolean;parseMs?:number;lexicalMs?:number;vectorMs?:number;fusionMs?:number;
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
      if (context.operation && ['products', 'product', 'categories', 'category', 'banners', 'store', 'sitemap'].includes(context.operation)) safe.operation = context.operation;
      if(event==='search_query'){
        if(context.locale==='en'||context.locale==='ar')safe.locale=context.locale;
        if(context.searchId&&/^[a-f0-9-]{36}$/.test(context.searchId))safe.searchId=context.searchId;
        if(context.queryHash&&/^[a-f0-9]{64}$/.test(context.queryHash))safe.queryHash=context.queryHash;
        for(const key of ['lexical','semantic','resultCount','parseMs','lexicalMs','vectorMs','fusionMs'] as const)if(typeof context[key]==='number'&&Number.isFinite(context[key]))safe[key]=context[key];
        for(const key of ['relaxed','corrected','unavailable'] as const)if(typeof context[key]==='boolean')safe[key]=context[key];
      }
      write(JSON.stringify({ time: new Date().toISOString(), level, service: options.service,
        environment: options.environment, event, ...safe }));
    },
  };
}

export type Logger = ReturnType<typeof createLogger>;
