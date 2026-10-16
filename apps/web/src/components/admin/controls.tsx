"use client";
/* eslint-disable @next/next/no-location-assign-relative-destination -- Session changes need a full reload to discard privileged router state. */
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { adminFormClass } from '../../lib/admin/styles';
import { adminFileLimit } from '../../lib/admin/upload-limits';
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
  if (result.status === 409) {
    const failure: unknown = await result.json().catch(() => null);
    if (failure && typeof failure === 'object' && 'error' in failure && failure.error === 'CATALOG_REVIEW_REQUIRED') throw new Error('Complete the product content, classification, image rights and physical stock review before publishing.');
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
    <form className={adminFormClass} onSubmit={submit} aria-busy={pending}>
      <label htmlFor="username">
        Username
        <input
          id="username"
          name="username"
          autoComplete="username"
          required
          maxLength={100}
        />
      </label>
      <label htmlFor="password">
        Password
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </label>
      {error ? <p role="alert">{error}</p> : null}
      <button disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
export function SessionControls() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <div className="admin-actions">
      <button
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
        Sign out
      </button>
      {error ? <span role="alert">{error}</span> : null}
    </div>
  );
}
export function Command({
  path,
  method = "PUT",
  body,
  children,
  confirm,
}: {
  path: string;
  method?: string;
  body?: object;
  children: string;
  confirm?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return (
    <span>
      <button
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
      {error ? <span role="alert">{error}</span> : null}
    </span>
  );
}
export function OrderMonitor() {
  const router = useRouter();
  const [updates, setUpdates] = useState(0);
  const [status, setStatus] = useState("Checking order updates…");
  const baseline = useRef<string | null>(null);
  useEffect(() => {
    let healthy = false;
    const events = new EventSource("/api/admin/events");
    events.addEventListener("connected", () => {
      healthy = true;
      setStatus("Order updates connected");
    });
    events.onerror = () => {
      healthy = false;
      setStatus("Order updates disconnected. Retrying automatically…");
    };
    const closeStream = () => events.close();
    window.addEventListener("beforeunload", closeStream);
    window.addEventListener("pagehide", closeStream);
    events.addEventListener("reconcile", () => router.refresh());
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
        const result = await fetch("/api/admin/orders?limit=25&offset=0", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (result.status === 401 || result.status === 403) {
          window.location.assign("/admin/login");
          return;
        }
        if (!result.ok) throw new Error();
        const signature = JSON.stringify(await result.json());
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
    void check();
    window.addEventListener("online", resume);
    window.addEventListener("pageshow", resume);
    return () => {
      events.close();
      window.removeEventListener("beforeunload", closeStream);
      window.removeEventListener("pagehide", closeStream);
      stopped = true;
      clearTimeout(timer);
      controller?.abort();
      window.removeEventListener("online", resume);
      window.removeEventListener("pageshow", resume);
    };
  }, [router]);
  return (
    <div className="admin-status">
      <p role="status">{status}</p>
      {updates ? (
        <p role="status" aria-atomic="true">
          Order information changed. {updates} updates received during this
          visit. Open Orders to review the latest records.
        </p>
      ) : null}
    </div>
  );
}
