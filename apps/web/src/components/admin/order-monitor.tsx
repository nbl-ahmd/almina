"use client";
/* eslint-disable @next/next/no-location-assign-relative-destination -- Revoked sessions discard privileged router state. */
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SpeakerWaveIcon, SpeakerXMarkIcon } from '@heroicons/react/24/outline';
import Link from '../app-link';
import { receivingSignalSchema, waitingMinutes } from '../../lib/admin/receiving';
import { Tip } from './kit';
import { cn } from './cn';

type LinkState = 'live' | 'connecting' | 'reconnecting';
// The server closes each stream after ~25 s (hosting limit) and the browser reconnects within about a second.
// That planned cycle is not an outage: only a gap longer than this is shown to the user.
const GAP_BEFORE_NOTICE_MS = 7000;
const FALLBACK_POLL_MS = 15000;
const REFRESH_DEBOUNCE_MS = 1500;

const waiting = (minutes: number) => minutes >= 1440 ? `${Math.floor(minutes / 1440)}d` : minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes} min`;

/** Order inbox signals. One server-sent-events stream carries tiny invalidations; the page refetches only when something changed.
 *  Nothing is polled while the stream is healthy, and nothing runs while the tab is hidden. */
export function OrderMonitor() {
  const router = useRouter();
  const [link, setLink] = useState<LinkState>('connecting');
  const audio = useRef<AudioContext | null>(null);
  const soundEnabled = useRef(false);
  const [sound, setSound] = useState(false);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [oldest, setOldest] = useState<string | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [clock, setClock] = useState<number | null>(null);
  function chime() {
    if (!soundEnabled.current || document.visibilityState !== 'visible' || !navigator.onLine || audio.current?.state !== 'running') return;
    const context = audio.current, oscillator = context.createOscillator(), gain = context.createGain();
    oscillator.connect(gain); gain.connect(context.destination); oscillator.frequency.value = 660;
    gain.gain.setValueAtTime(0.08, context.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.3);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    oscillator.start(); oscillator.stop(context.currentTime + 0.3);
  }
  useEffect(() => {
    let stopped = false;
    let events: EventSource | null = null;
    let gapTimer: ReturnType<typeof setTimeout> | undefined;
    let pollTimer: ReturnType<typeof setTimeout> | undefined;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    let baseline: string | null = null;
    const ageTimer = setInterval(() => { if (document.visibilityState === 'visible') setClock(Date.now()); }, 30000);

    function receive(value: unknown) {
      const parsed = receivingSignalSchema.safeParse(value);
      if (!parsed.success) return;
      setPendingCount(parsed.data.pendingCount);
      // Installed app icon shows how many orders wait. Unsupported browsers simply ignore this.
      try { void (parsed.data.pendingCount > 0 ? navigator.setAppBadge?.(parsed.data.pendingCount) : navigator.clearAppBadge?.())?.catch(() => undefined); } catch { /* Optional. */ }
      setOldest(parsed.data.oldestPendingAt ?? null); setReviewCount(parsed.data.reviewCount ?? 0); setClock(Date.now());
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
      if (reading || stopped || document.visibilityState !== 'visible') return;
      reading = true;
      try {
        const result = await fetch('/api/admin/orders/receiving', { cache: 'no-store' });
        if (result.status === 401 || result.status === 403) { window.location.assign('/admin/login'); return; }
        if (!result.ok) throw new Error();
        const summary: unknown = await result.json();
        const signature = JSON.stringify(summary);
        receive(summary);
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
      if (events || stopped || document.visibilityState !== 'visible') return;
      const source = new EventSource('/api/admin/events');
      events = source;
      // "ready": reconnected and nothing changed. "orders": something changed (or this is the first connection).
      source.addEventListener('ready', live);
      source.addEventListener('orders', () => { live(); void readReceiving(true); });
      source.addEventListener('revoked', () => { source.close(); window.location.assign('/admin/login'); });
      source.addEventListener('unavailable', startGapTimer);
      source.onerror = startGapTimer;
    }
    function close() {
      events?.close(); events = null;
      clearTimeout(gapTimer); gapTimer = undefined;
      clearTimeout(pollTimer); pollTimer = undefined;
    }
    function onVisibility() {
      if (document.visibilityState === 'hidden') { close(); return; }
      // Back in view: reconnect. A new connection has no resume id, so the server answers "orders" and one read catches up.
      setLink('connecting');
      open();
    }
    function onOnline() { close(); open(); }
    window.addEventListener('almina:new-alert', chime);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('online', onOnline);
    window.addEventListener('pagehide', close);
    open();
    return () => {
      stopped = true;
      close();
      clearInterval(ageTimer); clearTimeout(refreshTimer);
      window.removeEventListener('almina:new-alert', chime);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('pagehide', close);
      void audio.current?.close().catch(() => undefined); audio.current = null;
    };
  }, [router]);

  const age = waitingMinutes(oldest, clock ?? 0);
  const item = 'inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap px-3 text-xs text-ink-2 no-underline outline-0 first:pl-0 hover:text-ink focus-visible:outline-2 focus-visible:outline-ink';
  return (
    <div className="mb-4 flex items-center gap-1 overflow-x-auto border-b border-line pb-1 [scrollbar-width:none]">
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
      <Tip label={sound ? 'Sound alerts on. Click to turn off' : 'Turn on sound for new orders'}>
        <button type="button" aria-pressed={sound} aria-label={sound ? 'Turn sound alerts off' : 'Turn sound alerts on'}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-mute outline-0 hover:bg-fill hover:text-ink focus-visible:outline-2 focus-visible:outline-ink max-sm:hidden"
          onClick={() => {
            if (sound) { soundEnabled.current = false; setSound(false); return; }
            try { audio.current ??= new AudioContext(); void audio.current.resume().then(() => { soundEnabled.current = true; setSound(true); chime(); }).catch(() => { soundEnabled.current = false; }); } catch { soundEnabled.current = false; }
          }}>
          {sound ? <SpeakerWaveIcon className="size-[18px] text-ink" aria-hidden="true" /> : <SpeakerXMarkIcon className="size-[18px]" aria-hidden="true" />}
        </button>
      </Tip>
    </div>
  );
}
