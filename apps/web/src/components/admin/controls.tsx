"use client";
/* eslint-disable @next/next/no-location-assign-relative-destination -- Session changes need a full reload to discard privileged router state. */
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from '../app-link';
import { useRouter } from "next/navigation";
import { ArrowRightOnRectangleIcon } from "@heroicons/react/24/outline";
import { adminFileLimit } from '../../lib/admin/upload-limits';
export class AdminRateLimitError extends Error {
  constructor(readonly retryAfterSeconds: number) { super('Too many requests. Please wait.'); }
}
export async function adminRequest(
  path: string,
  method = "GET",
  body?: FormData | object,
  idempotencyKey?: string,
) {
  const payload = body ?? (method !== "GET" ? {} : undefined);
  if (payload instanceof FormData) {
    let bytes = 0;
    for (const value of payload.values()) {
      if (value instanceof File) {
        if (value.size > adminFileLimit) throw new Error('Choose an image or CSV smaller than 3 MB.');
        bytes += value.size;
      } else bytes += new TextEncoder().encode(value).length;
    }
    if (bytes > adminFileLimit) throw new Error('The combined upload must be smaller than 3 MB.');
  }
  const result = await fetch(`/api/admin/${path}`, {
    method,
    cache: "no-store",
    headers: {
      "x-csrf-protection": "1",
      ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {}),
      ...(payload && !(payload instanceof FormData)
        ? { "content-type": "application/json" }
        : {}),
    },
    ...(payload
      ? {
          body: payload instanceof FormData ? payload : JSON.stringify(payload),
        }
      : {}),
  });
  if (result.status === 401 && path !== "auth/login") {
    window.location.assign("/admin/login");
    throw new Error("Please sign in again.");
  }
  if (result.status === 429) {
    const seconds = Number(result.headers.get('retry-after') ?? '60');
    throw new AdminRateLimitError(Number.isInteger(seconds) && seconds >= 1 && seconds <= 300 ? seconds : 60);
  }
  if (result.status === 409) {
    const failure: unknown = await result.json().catch(() => null);
    if (failure && typeof failure === 'object' && 'error' in failure && failure.error === 'IMAGE_REVIEW_REQUIRED' && path.startsWith('image-review/')) throw new Error('This association needs another review. Confirm all required identity values and supporting evidence. Reload if the product or image has changed.');
    if (failure && typeof failure === 'object' && 'error' in failure && failure.error === 'CATALOG_REVIEW_REQUIRED') throw new Error('Complete the product content, classification, image rights and physical stock review before publishing.');
    if ((path === 'auth/order-routing' || /^auth\/users\/[^/]+\/assignment$/.test(path)) && failure && typeof failure === 'object' && 'error' in failure && failure.error === 'INVALID_TRANSITION') throw new Error('Assign every staff account to a branch and keep at least one active staff member in each receiving branch before activating or changing routing.');
    if (failure && typeof failure === 'object' && 'error' in failure && failure.error === 'PRODUCT_FAMILY_CONFLICT') {
      throw new Error('Check the family name, brand, form, strength, category and option combinations. Each combination must be unique.');
    }
  }
  if (!result.ok)
    throw new Error(
      result.status === 401
        ? "Invalid username or password."
        : result.status === 400
          ? "Check the entered values and try again."
          : result.status === 403
            ? "You do not have permission."
            : result.status === 409
              ? "This record has changed or the action is unavailable. Reload and review it."
              : result.status === 413
                ? "The upload is too large. Use files smaller than 3 MB."
                : result.status === 429
                  ? "Too many requests. Please wait."
                  : "Request failed. Please retry.",
    );
  return result.status === 204 ? null : ((await result.json()) as unknown);
}
export function LoginForm() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [reveal, setReveal] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      await adminRequest("auth/login", "POST", {
        username: data.get("username"),
        password: data.get("password"),
      });
      window.location.assign("/admin");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Sign in failed.");
      setPending(false);
    }
  }
  return (
    <form className="admin-form" onSubmit={submit} aria-busy={pending}>
      <div className="admin-form__section">
        <div className="admin-form__grid">
          <div className="admin-field admin-field--wide">
            <label htmlFor="username" className="admin-field__label">
              Username
            </label>
            <input
              id="username"
              name="username"
              autoComplete="username"
              placeholder="Your staff username"
              required
              maxLength={100}
            />
          </div>
          <div className="admin-field admin-field--wide">
            <div className="admin-login__label-row">
              <label htmlFor="password" className="admin-field__label">
                Password
              </label>
              <button
                type="button"
                className="admin-login__reveal"
                aria-pressed={reveal}
                onClick={() => setReveal((value) => !value)}
              >
                {reveal ? "Hide" : "Show"}
              </button>
            </div>
            <input
              id="password"
              name="password"
              type={reveal ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Your account password"
              required
            />
          </div>
        </div>
      </div>
      <div className="admin-form__footer">
        <div className="admin-form__status">
          {error ? (
            <p role="alert" className="admin-alert admin-alert--danger">
              {error}
            </p>
          ) : (
            <p className="admin-card__hint admin-hint--tight">
              Sessions are protected by a server-side cookie.
            </p>
          )}
        </div>
        <button disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </div>
    </form>
  );
}
export function SessionControls() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <div className="admin-actions">
      <button
        className="admin-btn--ghost admin-signout"
        aria-label="Sign out"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          try {
            await adminRequest("auth/logout", "POST");
            window.location.assign("/admin/login");
          } catch {
            setError("Sign out failed. Retry.");
            setPending(false);
          }
        }}
      >
        <ArrowRightOnRectangleIcon width={17} height={17} aria-hidden="true" />
        <span className="admin-signout-label">Sign out</span>
      </button>
      {error ? (
        <span className="admin-alert admin-alert--danger" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
export function Command({
  path,
  method = "PUT",
  body,
  children,
  confirm,
  variant = "secondary",
}: {
  path: string;
  method?: string;
  body?: object;
  children: string;
  confirm?: string;
  variant?: "primary" | "secondary" | "danger";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return (
    <span>
      <button
        className={variant === "primary" ? undefined : `admin-btn--${variant}`}
        disabled={pending}
        onClick={async () => {
          if (confirm && !window.confirm(confirm)) return;
          setPending(true);
          setError("");
          try {
            await adminRequest(path, method, body);
            router.refresh();
          } catch (error) {
            setError(
              error instanceof Error ? error.message : "Request failed.",
            );
          } finally {
            setPending(false);
          }
        }}
      >
        {pending ? "Saving…" : children}
      </button>
      {error ? (
        <span className="admin-alert admin-alert--danger" role="alert">
          {error}
        </span>
      ) : null}
    </span>
  );
}
export function OrderMonitor() {
  const router = useRouter();
  const [updates, setUpdates] = useState(0);
  const [status, setStatus] = useState("Checking order updates…");
  const baseline = useRef<string | null>(null);
  const seenOrders = useRef<Set<string> | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const soundEnabled = useRef(false);
  const [sound, setSound] = useState(false);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [arrivals, setArrivals] = useState(0);
  useEffect(() => {
    let healthy = false;
    function receive(value: unknown) {
      if (!value || typeof value !== 'object' || !('pendingCount' in value) || !('latestIds' in value)
        || typeof value.pendingCount !== 'number' || !Number.isSafeInteger(value.pendingCount) || value.pendingCount < 0
        || !Array.isArray(value.latestIds) || value.latestIds.length > 10 || !value.latestIds.every(id => typeof id === 'string' && /^[a-f0-9]{24}$/i.test(id))) return;
      setPendingCount(value.pendingCount);
      const fresh = seenOrders.current === null ? [] : value.latestIds.filter(id => !seenOrders.current!.has(id));
      seenOrders.current = new Set([...(seenOrders.current ?? []), ...value.latestIds].slice(-1000));
      if (fresh.length) {
        setArrivals(count => count + fresh.length);
        if (soundEnabled.current && audio.current?.state === 'running') {
          const context = audio.current, oscillator = context.createOscillator(), gain = context.createGain();
          oscillator.connect(gain); gain.connect(context.destination); oscillator.frequency.value = 660;
          gain.gain.setValueAtTime(0.08, context.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.3);
          oscillator.start(); oscillator.stop(context.currentTime + 0.3);
        }
      }
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
      setUpdates((value) => value + 1);
      router.refresh();
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
          setUpdates((value) => value + 1);
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
      {pendingCount !== null ? <Link href="/admin/orders?status=pending" aria-label={`${pendingCount} orders awaiting confirmation`}>{pendingCount} to confirm</Link> : null}
      <button type="button" className="admin-btn--secondary" aria-pressed={sound} title="Optional sound while this page is open. Also enable push in Notifications." onClick={() => {
        if (sound) { soundEnabled.current = false; setSound(false); return; }
        try { audio.current ??= new AudioContext(); void audio.current.resume().then(() => { soundEnabled.current = true; setSound(true); }).catch(() => { soundEnabled.current = false; }); } catch { soundEnabled.current = false; }
      }}>{sound ? 'Sound on' : 'Enable sound'}</button>
      {arrivals > 0 ? <Link href="/admin/orders?status=pending" onClick={() => setArrivals(0)} role="status">Orders need attention · {arrivals}</Link> : null}
      {updates ? (
        <p
          role="status"
          aria-atomic="true"
          aria-label={`Order information changed. ${updates} updates received during this visit. Open Orders to review the latest records.`}
          title={`${updates} order update${updates === 1 ? "" : "s"} received`}
        >
          +{updates}
        </p>
      ) : null}
    </div>
  );
}
