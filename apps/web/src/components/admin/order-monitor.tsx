"use client";
/* eslint-disable @next/next/no-location-assign-relative-destination -- Revoked sessions discard privileged router state. */
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from '../app-link';
import { receivingSignalSchema, waitingMinutes } from '../../lib/admin/receiving';

export function OrderMonitor() {
  const router = useRouter();
  const [status, setStatus] = useState("Checking order updates…");
  const baseline = useRef<string | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const soundEnabled = useRef(false);
  const [sound, setSound] = useState(false);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [oldest, setOldest] = useState<string | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [clock, setClock] = useState<number | null>(null);
  function chime() {
    if (!soundEnabled.current || document.visibilityState !== 'visible' || !navigator.onLine || audio.current?.state !== 'running') return;
    const context=audio.current, oscillator=context.createOscillator(), gain=context.createGain();
    oscillator.connect(gain); gain.connect(context.destination); oscillator.frequency.value=660;
    gain.gain.setValueAtTime(0.08,context.currentTime); gain.gain.exponentialRampToValueAtTime(0.001,context.currentTime+0.3);
    oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
    oscillator.start(); oscillator.stop(context.currentTime+0.3);
  }
  useEffect(() => {
    let healthy = false;
    const ageTimer=setInterval(()=>setClock(Date.now()),30000);
    window.addEventListener("almina:new-alert", chime);
    function receive(value: unknown) {
      const parsed=receivingSignalSchema.safeParse(value); if(!parsed.success)return;
      const signal=parsed.data;
      setPendingCount(signal.pendingCount);
      setOldest(signal.oldestPendingAt??null); setReviewCount(signal.reviewCount??0); setClock(Date.now());

    }
    const events = new EventSource("/api/admin/events");
    events.addEventListener("connected", event => {
      healthy = true;
      setStatus("Order updates connected");
      try { receive(JSON.parse((event as MessageEvent<string>).data)); } catch { /* Only bounded receiving signals are accepted. */ }
    });
    events.onerror = () => {
      healthy = false;
      setStatus("Order updates disconnected. Retrying automatically…");
    };
    const closeStream = () => events.close();
    window.addEventListener("beforeunload", closeStream);
    window.addEventListener("pagehide", closeStream);
    events.addEventListener("reconcile", () => { router.refresh(); });
    events.addEventListener("orders", () => {
      router.refresh(); window.dispatchEvent(new Event("almina:orders-updated"));
    });
    events.addEventListener("revoked", () => {
      events.close();
      window.location.assign("/admin/login");
    });
    events.addEventListener("unavailable", () => {
      healthy = false;
      setStatus("Order updates disconnected. Retrying automatically…");
    });
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let controller: AbortController | undefined;
    async function check() {
      if (healthy) {
        timer = setTimeout(check, 10000);
        return;
      }
      controller = new AbortController();
      try {
        const result = await fetch("/api/admin/orders/receiving", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (result.status === 401 || result.status === 403) {
          window.location.assign("/admin/login");
          return;
        }
        if (!result.ok) throw new Error();
        const summary: unknown = await result.json();
        const signature = JSON.stringify(summary);
        receive(summary);
        if (stopped) return;
        if (baseline.current !== null && baseline.current !== signature) {
                  router.refresh();
        } else
          setStatus(
            "Order updates connected · recovery check every 10 seconds",
          );
        baseline.current = signature;
      } catch {
        if (!stopped)
          setStatus("Order updates disconnected. Retrying automatically…");
      }
      if (!stopped) timer = setTimeout(check, 10000);
    }
    function resume() {
      healthy = false;
      clearTimeout(timer);
      controller?.abort();
      void check();
    }
    timer = setTimeout(check, 10000);
    window.addEventListener("online", resume);
    window.addEventListener("pageshow", resume);
    return () => {
      events.close();
      clearInterval(ageTimer);window.removeEventListener("almina:new-alert", chime);
      window.removeEventListener("beforeunload", closeStream);
      window.removeEventListener("pagehide", closeStream);
      stopped = true;
      clearTimeout(timer);
      controller?.abort();
      void audio.current?.close().catch(() => undefined); audio.current = null;
      window.removeEventListener("online", resume);
      window.removeEventListener("pageshow", resume);
    };
  }, [router]);
  const age=waitingMinutes(oldest,clock??0);
  const online = status.startsWith("Order updates connected");
  const short = online
    ? "Live"
    : status.startsWith("Order updates disconnected")
      ? "Reconnecting"
      : "Connecting";
  return (
    <div className="admin-status admin-status--receiving" data-state={online ? "online" : "offline"}>
      <p role="status" aria-label={status} title={status}>
        {short}
      </p>
      {!online ? <button type="button" className="admin-btn--secondary" onClick={() => router.refresh()}>Refresh orders</button> : null}
      {pendingCount !== null ? <Link href="/admin/orders?status=pending" aria-label={`${pendingCount} ${pendingCount===1?'order':'orders'} awaiting confirmation`}>{pendingCount} to confirm</Link> : null}
      <button type="button" className="admin-btn--secondary" aria-pressed={sound} title="One sound for each new alert while this page is visible. No repeating reminders. Enable device notifications for background delivery." onClick={() => {
        if (sound) { soundEnabled.current = false; setSound(false); return; }
        try { audio.current ??= new AudioContext(); void audio.current.resume().then(() => { soundEnabled.current = true; setSound(true); }).catch(() => { soundEnabled.current = false; }); } catch { soundEnabled.current = false; }
      }}>{sound ? 'Sound on' : 'Enable sound'}</button>
      {sound?<button type="button" className="admin-btn--secondary" onClick={chime}>Test sound</button>:null}
      <Link href="/admin/notifications" aria-label="Open notifications">Notifications</Link>
      {pendingCount!==null&&pendingCount>0&&age>=5?<Link className="admin-receiving-overdue" href="/admin/orders?status=pending" role="status">Oldest order waiting {age>=1440?`${Math.floor(age/1440)}d`:age>=60?`${Math.floor(age/60)}h ${age%60}m`:`${age} min`}</Link>:null}
      {reviewCount>0?<Link href="/admin/orders?status=pending&review=1">{reviewCount} {reviewCount===1?'address':'addresses'} to review</Link>:null}

    </div>
  );
}
