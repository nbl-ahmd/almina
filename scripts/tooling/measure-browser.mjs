import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';

// Read-only lab capture. No cart, checkout, authentication or order mutation.
const [origin, output, ...paths] = process.argv.slice(2);
assert.ok(origin && output, 'Usage: node scripts/tooling/measure-browser.mjs ORIGIN OUTPUT [PATH...]');
const session = `almina-performance-lab-${new URL(origin).port || 'production'}`;
function browser(...args) {
  const value = JSON.parse(execFileSync('agent-browser', ['--session', session, '--json', ...args], { encoding: 'utf8' }));
  assert.ok(value.success, value.error);
  return value.data;
}
browser('open');
const socket = new globalThis.WebSocket(browser('get', 'cdp-url').cdpUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let sequence = 0;
const pending = new Map();
const listeners = new Map();
socket.onmessage = event => {
  const message = JSON.parse(event.data);
  listeners.get(message.sessionId)?.(message);
  const request = pending.get(message.id);
  if (request) {
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
  }
};
socket.onclose = () => {
  for (const request of pending.values()) request.reject(new Error('Measurement browser closed before capture completed'));
  pending.clear();
};
function send(method, params = {}, sessionId) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
}
const results = [];
try {
  for (const path of paths.length ? paths : ['/']) {
    for (let run = 0; run < Number(process.env.PERFORMANCE_RUNS ?? 5); run++) {
      // New incognito context each sample: no browser cache, cookies or localStorage.
      const { browserContextId } = await send('Target.createBrowserContext');
      const { targetId } = await send('Target.createTarget', { url: 'about:blank', browserContextId });
      const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
      const command = (method, params) => send(method, params, sessionId);
      const transfers = new Map();
      let failedRequests = 0;
      let runtimeErrors = 0;
      const failureReasons = {};
      listeners.set(sessionId, message => {
        if (message.method === 'Network.responseReceived') transfers.set(message.params.requestId, { type: message.params.type, mime: message.params.response.mimeType, bytes: 0, status: message.params.response.status });
        if (message.method === 'Network.loadingFinished') {
          const resource = transfers.get(message.params.requestId);
          if (resource) resource.bytes = message.params.encodedDataLength;
        }
        if (message.method === 'Network.loadingFailed') {
          failedRequests++;
          const reason = message.params.errorText;
          failureReasons[reason] = (failureReasons[reason] ?? 0) + 1;
        }
        if (message.method === 'Runtime.exceptionThrown') runtimeErrors++;
      });
      await command('Page.enable');
      await command('Runtime.enable');
      await command('Network.enable');
      await command('Network.setCacheDisabled', { cacheDisabled: true });
      await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
      await command('Emulation.setCPUThrottlingRate', { rate: 4 });
      await command('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 93750, connectionType: 'cellular4g' });
      await command('Performance.enable');
      await command('Page.addScriptToEvaluateOnNewDocument', { source: `
        window.__lab = { lcp: null, cls: 0, inp: null, shiftStart: 0, shiftLast: 0, shiftValue: 0 };
        new PerformanceObserver(list => { for (const e of list.getEntries()) window.__lab.lcp = e.startTime; }).observe({type:'largest-contentful-paint',buffered:true});
        new PerformanceObserver(list => { for (const e of list.getEntries()) {
          if (e.hadRecentInput) continue;
          const v = window.__lab;
          if (e.startTime - v.shiftLast < 1000 && e.startTime - v.shiftStart < 5000) v.shiftValue += e.value;
          else { v.shiftStart = e.startTime; v.shiftValue = e.value; }
          v.shiftLast = e.startTime; v.cls = Math.max(v.cls, v.shiftValue);
        }}).observe({type:'layout-shift',buffered:true});
        new PerformanceObserver(list => { for (const e of list.getEntries()) if (e.interactionId) window.__lab.inp = Math.max(window.__lab.inp ?? 0, e.duration); }).observe({type:'event',buffered:true,durationThreshold:16});
      ` });
      const url = new URL(path, origin).href;
      await command('Page.navigate', { url });
      // Fixed capture window allows lazy images, font swaps and hydration to settle.
      await delay(Number(process.env.PERFORMANCE_SETTLE_MS ?? 12000));
      const evaluate = async expression => (await command('Runtime.evaluate', { expression, returnByValue: true })).result.value;
      const point = await evaluate(`(() => { const e = document.querySelector('input[type="search"], input[name="q"], .filters input'); if (!e) return null; const r = e.getBoundingClientRect(); return {x:r.x+Math.min(r.width/2,20),y:r.y+r.height/2}; })()`);
      if (point && point.y > 0 && point.y < 844) {
        await command('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 });
        await command('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 });
        await command('Input.insertText', { text: 'care' });
        await delay(500);
      }
      const page = await evaluate(`(() => { const n = performance.getEntriesByType('navigation')[0]; const resources = performance.getEntriesByType('resource'); return { ...window.__lab, ttfbMs:n.responseStart, serverWaitMs:n.responseStart-n.requestStart, htmlMs:n.responseEnd-n.requestStart, jsTransferredBytes:resources.filter(r=>r.initiatorType==='script'||/\\.js(?:\\?|$)/.test(r.name)).reduce((s,r)=>s+r.encodedBodySize,0), imageTransferredBytes:resources.filter(r=>r.initiatorType==='img').reduce((s,r)=>s+r.encodedBodySize,0), fontTransferredBytes:resources.filter(r=>/\\.(woff2?|ttf)(?:\\?|$)/.test(r.name)).reduce((s,r)=>s+r.encodedBodySize,0), title:document.title, body:document.querySelector('main')?.innerText.slice(0,100), resources:resources.filter(r=>r.initiatorType==='script'||/\\.js(?:\\?|$)/.test(r.name)).map(r=>({path:new URL(r.name).pathname,bytes:r.encodedBodySize})), overflow:document.documentElement.scrollWidth>innerWidth }; })()`);
      const { metrics } = await command('Performance.getMetrics');
      const metric = name => metrics.find(value => value.name === name)?.value ?? null;
      // Separate best-effort coverage from timing; precise instrumentation deoptimizes V8.
      await command('Profiler.enable');
      const { result: coverage } = await command('Profiler.getBestEffortCoverage');
      let covered = 0;
      for (const script of coverage.filter(value => value.url.startsWith(origin) && /\.js(?:\?|$)/.test(value.url))) {
        const ranges = script.functions.flatMap(fn => fn.ranges).sort((a, b) => a.startOffset - b.startOffset);
        const points = [...new Set(ranges.flatMap(r => [r.startOffset, r.endOffset]))].sort((a,b)=>a-b);
        for (let i = 0; i < points.length - 1; i++) {
          const covering = ranges.filter(r => r.startOffset <= points[i] && r.endOffset >= points[i+1]).sort((a,b)=>(a.endOffset-a.startOffset)-(b.endOffset-b.startOffset));
          if (covering[0]?.count > 0) covered += points[i+1]-points[i];
        }
      }
      const all = [...transfers.values()];
      const row = { path, run: run + 1, ...page, scriptDurationMs: metric('ScriptDuration') * 1000, coveredJsCodeUnits: covered,
        hadInteraction: Boolean(point && point.y > 0 && point.y < 844),
        // CDP includes cross-origin and preloaded resources, plus HTTP header bytes.
        jsNetworkBytes: all.filter(r=>r.type==='Script').reduce((s,r)=>s+r.bytes,0),
        imageNetworkBytes: all.filter(r=>r.type==='Image'||r.mime.startsWith('image/')).reduce((s,r)=>s+r.bytes,0),
        failedRequests, failureReasons, runtimeErrors, httpErrors: all.filter(r=>r.status>=400).length };
      results.push(row);
      console.log(JSON.stringify({ path, run: run + 1, ttfbMs: row.ttfbMs, lcpMs: row.lcp, jsBytes: row.jsTransferredBytes, scriptMs: row.scriptDurationMs, inpMs: row.inp }));
      await send('Target.disposeBrowserContext', { browserContextId });
      listeners.delete(sessionId);
    }
  }
  await writeFile(output, JSON.stringify({ capturedAt: new Date().toISOString(), origin, profile: { width: 390, height: 844, cpuSlowdown: 4, latencyMs: 150, downloadBytesPerSecond: 200000, cache: 'cold browser / warm server', coverage: 'best-effort V8 coverage in UTF-16 code units, not exact executed bytes', inp: 'single search-focus/type interaction lab proxy; null if no eligible interaction' }, results }, null, 2) + '\n');
} finally { socket.close(); browser('close'); }
