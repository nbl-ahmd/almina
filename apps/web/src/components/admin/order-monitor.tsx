"use client";
/* eslint-disable @next/next/no-location-assign-relative-destination -- Revoked sessions discard privileged router state. */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { BellAlertIcon, BellSlashIcon } from '@heroicons/react/24/outline';
import Link from '../app-link';
import { receivingSignalSchema, waitingMinutes } from '../../lib/admin/receiving';
import { connectOrderStream } from '../../lib/admin/order-stream-client';
import { getOrderAlarm } from '../../lib/admin/order-alarm';
import { Tip } from './kit';
import { cn } from './cn';

type LinkState = 'live' | 'connecting' | 'reconnecting';
// A planned reconnect (the API ends each stream after a few minutes; the relay fallback every ~25 s) is not an outage:
// only a gap longer than this is shown to the user.
const GAP_BEFORE_NOTICE_MS = 7000;
const FALLBACK_POLL_MS = 15000;
const REFRESH_DEBOUNCE_MS = 1500;

const waiting = (minutes: number) => minutes >= 1440 ? `${Math.floor(minutes / 1440)}d` : minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes} min`;

/** Order inbox signals. One server-sent-events stream carries tiny invalidations; the page refetches only when something changed.
 *  Nothing is polled while the stream is healthy, and nothing runs while the tab is hidden. */
export function OrderMonitor() {
  const router = useRouter();
  const [link, setLink] = useState<LinkState>('connecting');
  const alarm = getOrderAlarm();
  const alarmStatus = useSyncExternalStore(alarm.subscribe, alarm.status, () => 'off' as const);
  const lastPending = useRef<number | null>(null);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [oldest, setOldest] = useState<string | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [clock, setClock] = useState<number | null>(null);
  // Tell the service worker whether this page will ring by itself, so it knows when the system notification may stay silent.
  useEffect(() => {
    const worker = navigator.serviceWorker;
    const send = () => worker?.controller?.postMessage({ type: 'almina-alarm-state', armed: alarmStatus === 'armed' || alarmStatus === 'ringing' });
    send(); worker?.addEventListener('controllerchange', send);
    return () => { worker?.removeEventListener('controllerchange', send); };
  }, [alarmStatus]);
  useEffect(() => {
    let stopped = false;
    let disconnect: (() => void) | null = null;
    let gapTimer: ReturnType<typeof setTimeout> | undefined;
    let pollTimer: ReturnType<typeof setTimeout> | undefined;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    let baseline: string | null = null;
    const ageTimer = setInterval(() => { if (document.visibilityState === 'visible') setClock(Date.now()); }, 30000);

    function receive(value: unknown) {
      const parsed = receivingSignalSchema.safeParse(value);
      if (!parsed.success) return null;
      setPendingCount(parsed.data.pendingCount);
      // Nothing is waiting any more: the order was confirmed (here or on another device), so the alarm has done its job.
      if (parsed.data.pendingCount === 0) alarm.silence();
      // Installed app icon shows how many orders wait. Unsupported browsers simply ignore this.
      try { void (parsed.data.pendingCount > 0 ? navigator.setAppBadge?.(parsed.data.pendingCount) : navigator.clearAppBadge?.())?.catch(() => undefined); } catch { /* Optional. */ }
      setOldest(parsed.data.oldestPendingAt ?? null); setReviewCount(parsed.data.reviewCount ?? 0); setClock(Date.now());
      return parsed.data.pendingCount;
    }
    // Several events in a burst cost one page refresh, and a hidden tab never refreshes.
    function queueRefresh() {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => { if (!stopped && document.visibilityState === 'visible') router.refresh(); }, REFRESH_DEBOUNCE_MS);
    }
    function live() {
      clearTimeout(gapTimer); gapTimer = undefined;
      clearTimeout(pollTimer); pollTimer = undefined;
      setLink('live');
    }
    function startGapTimer() {
      if (gapTimer || stopped) return;
      gapTimer = setTimeout(() => { gapTimer = undefined; setLink('reconnecting'); void poll(); }, GAP_BEFORE_NOTICE_MS);
    }
    // One authorised read of the receiving counts. Runs when the server says orders changed, and as the fallback below.
    let reading = false;
    async function readReceiving(announce: boolean) {
      // A hidden page normally sleeps, but one with the alarm on still reads when a push message reaches it.
      if (reading || stopped || (document.visibilityState !== 'visible' && alarm.status() === 'off')) return;
      reading = true;
      try {
        const result = await fetch('/api/admin/orders/receiving', { cache: 'no-store' });
        if (result.status === 401 || result.status === 403) { window.location.assign('/admin/login'); return; }
        if (!result.ok) throw new Error();
        const summary: unknown = await result.json();
        const signature = JSON.stringify(summary);
        const previous = lastPending.current, count = receive(summary);
        if (count !== null) lastPending.current = count;
        // More orders waiting than before means a new one arrived: ring (a blocked or off alarm leaves it to the push notification).
        if (announce && previous !== null && count !== null && count > previous) alarm.ring();
        // The very first read only fills the counts; later changes refresh the page and notify listeners.
        if (announce && baseline !== null && baseline !== signature) { window.dispatchEvent(new Event('almina:orders-updated')); queueRefresh(); }
        baseline = signature;
      } catch { /* The stream or the next fallback read retries. */ } finally { reading = false; }
    }
    // Fallback only while the stream has been down longer than a planned reconnect.
    async function poll() {
      await readReceiving(true);
      if (!stopped && document.visibilityState === 'visible') pollTimer = setTimeout(() => void poll(), FALLBACK_POLL_MS);
    }
    function open() {
      if (disconnect || stopped || document.visibilityState !== 'visible') return;
      // "ready": reconnected and nothing changed. "orders": something changed (or this is the first connection).
      disconnect = connectOrderStream({
        onReady: live,
        onOrders: () => { live(); void readReceiving(true); window.dispatchEvent(new Event('almina:notifications-changed')); },
        onRevoked: () => { window.location.assign('/admin/login'); },
        onDown: startGapTimer,
      });
    }
    function close() {
      disconnect?.(); disconnect = null;
      clearTimeout(gapTimer); gapTimer = undefined;
      clearTimeout(pollTimer); pollTimer = undefined;
    }
    function onVisibility() {
      alarm.visibilityChanged();
      if (document.visibilityState === 'hidden') { close(); return; }
      // Back in view: reconnect. A new connection has no resume id, so the server answers "orders" and one read catches up.
      setLink('connecting');
      open();
    }
    function onOnline() { close(); open(); }
    const chime = () => alarm.chime();
    // A push message reaching the open page (the app may be in the background) means something happened: read the counts once.
    const fromPush = (event: MessageEvent) => { if (event.data && event.data.type === 'almina-alerts-updated') void readReceiving(true); };
    // Sound can only start after a tap; the first tap or key press after a page load unlocks an alarm armed on an earlier visit.
    const unlock = () => { void alarm.resume(); };
    window.addEventListener('almina:new-alert', chime);
    navigator.serviceWorker?.addEventListener('message', fromPush);
    window.addEventListener('pointerdown', unlock); window.addEventListener('keydown', unlock);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('online', onOnline);
    window.addEventListener('pagehide', close);
    // An installed app brought back from the background often fires only these, not a visibility change.
    const comeBack = () => { if (document.visibilityState === 'visible' && !disconnect) { alarm.visibilityChanged(); setLink('connecting'); open(); } };
    window.addEventListener('pageshow', comeBack); window.addEventListener('focus', comeBack);
    open();
    return () => {
      stopped = true;
      close();
      clearInterval(ageTimer); clearTimeout(refreshTimer);
      window.removeEventListener('almina:new-alert', chime);
      navigator.serviceWorker?.removeEventListener('message', fromPush);
      window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('pagehide', close);
      window.removeEventListener('pageshow', comeBack); window.removeEventListener('focus', comeBack);
    };
  }, [router, alarm]);

  const age = waitingMinutes(oldest, clock ?? 0);
  const item = 'inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap px-3 text-xs text-ink-2 no-underline outline-0 first:pl-0 hover:text-ink focus-visible:outline-2 focus-visible:outline-ink';
  return (
    <div className="mb-4 flex items-center gap-1 overflow-x-auto border-b border-line pb-1 [scrollbar-width:none]">
      {alarmStatus === 'ringing' ? (
        <button type="button" onClick={() => alarm.silence()}
          className="mr-2 inline-flex h-8 shrink-0 animate-pulse items-center gap-1.5 rounded-lg bg-bad px-3 text-xs font-semibold text-white outline-0 focus-visible:outline-2 focus-visible:outline-ink motion-reduce:animate-none">
          <BellAlertIcon className="size-[18px]" aria-hidden="true" />New order. Silence alarm
        </button>
      ) : null}
      <span role="alert" className="sr-only">{alarmStatus === 'ringing' ? 'New order waiting. The alarm is ringing.' : ''}</span>
      <p role="status" className="m-0 mr-2 inline-flex h-8 shrink-0 items-center gap-2 text-xs font-medium text-mute">
        <span aria-hidden="true" className={cn('size-2 rounded-full', link === 'live' ? 'bg-ok' : 'animate-pulse bg-warn motion-reduce:animate-none')} />
        {link === 'live' ? 'Live' : link === 'reconnecting' ? 'Reconnecting…' : 'Connecting…'}
      </p>
      <div className="flex items-center divide-x divide-line">
        {pendingCount !== null ? (
          <Link className={cn(item, pendingCount > 0 && 'font-semibold text-ink')} href="/admin/orders?status=pending" aria-label={`${pendingCount} ${pendingCount === 1 ? 'order' : 'orders'} awaiting confirmation`}>
            {pendingCount > 0 ? <span aria-hidden="true" className="size-1.5 rounded-full bg-warn" /> : null}{pendingCount} to confirm
          </Link>
        ) : null}
        {pendingCount !== null && pendingCount > 0 && age >= 5 ? (
          <Link className={cn(item, age >= 60 && 'font-medium text-bad')} href="/admin/orders?status=pending" role="status">Oldest waiting {waiting(age)}</Link>
        ) : null}
        {reviewCount > 0 ? <Link className={item} href="/admin/orders?status=pending&review=1">{reviewCount} {reviewCount === 1 ? 'address' : 'addresses'} to review</Link> : null}
      </div>
      <span className="flex-1" />
      <Tip label={alarmStatus === 'off' ? 'Turn on the loud new-order alarm' : alarmStatus === 'needs-tap' ? 'Tap once to arm the alarm on this page' : 'Order alarm is on. Click to turn it off'}>
        <button type="button" aria-pressed={alarmStatus === 'armed' || alarmStatus === 'ringing'}
          aria-label={alarmStatus === 'off' ? 'Turn order alarm on' : alarmStatus === 'needs-tap' ? 'Tap to arm the order alarm' : 'Turn order alarm off'}
          className={cn('inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2 text-xs outline-0 hover:bg-fill focus-visible:outline-2 focus-visible:outline-ink',
            alarmStatus === 'needs-tap' ? 'font-medium text-warn' : alarmStatus === 'off' ? 'text-mute hover:text-ink' : 'text-ink')}
          onClick={() => { if (alarmStatus === 'armed' || alarmStatus === 'ringing') alarm.disarm(); else void alarm.arm(); }}>
          {alarmStatus === 'off' ? <BellSlashIcon className="size-[18px]" aria-hidden="true" /> : <BellAlertIcon className="size-[18px]" aria-hidden="true" />}
          {alarmStatus === 'needs-tap' ? <span>Tap to arm alarm</span> : alarmStatus === 'off' ? <span className="max-sm:sr-only">Alarm off</span> : <span className="max-sm:sr-only">Alarm on</span>}
        </button>
      </Tip>
    </div>
  );
}
