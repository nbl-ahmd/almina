"use client";
/* eslint-disable @next/next/no-location-assign-relative-destination -- Session changes need a full reload to discard privileged router state. */
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightOnRectangleIcon } from "@heroicons/react/24/outline";
import { adminFileLimit } from '../../lib/admin/upload-limits';
export class AdminRateLimitError extends Error {
  constructor(readonly retryAfterSeconds: number) { super('Too many requests. Please wait.'); }
}
export class AdminConflictError extends Error {
  constructor(readonly code: string, message: string) { super(message); }
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
  if (result.status === 409 && path === 'orders/notifications/rules') throw new Error('Stock rules changed on another device. Reload to review the latest settings.');
  if (result.status === 409) {
    const failure: unknown = await result.json().catch(() => null);
    if (failure && typeof failure === 'object' && 'error' in failure && failure.error === 'IMAGE_REVIEW_REQUIRED' && path.startsWith('image-review/')) throw new Error('This association needs another review. Confirm all required identity values and supporting evidence. Reload if the product or image has changed.');
    if (failure && typeof failure === 'object' && 'error' in failure && failure.error === 'CATALOG_REVIEW_REQUIRED') throw new Error('Complete the product content, classification, image rights and physical stock review before publishing.');
    if (failure && typeof failure === 'object' && 'error' in failure && failure.error === 'BRANCH_LOGIN_CONFLICT') throw new AdminConflictError('BRANCH_LOGIN_CONFLICT', 'This login is already in use. Choose another username; existing credentials were not changed.');
    if (failure && typeof failure === 'object' && 'error' in failure && failure.error === 'BRANCH_STOCK_RETIRED') throw new Error('All branches use the main catalogue stock. Update stock from Products.');
    if (failure && typeof failure === 'object' && 'error' in failure && failure.error === 'BRANCH_STOCK_CONFLICT') throw new Error('The branch allocations would exceed available catalogue stock. Review other branches before assigning this quantity or reducing catalogue stock.');
    if (failure && typeof failure === 'object' && 'error' in failure && failure.error === 'DELIVERY_SETUP_REQUIRED') throw new Error('Set the branch location and its login, then draw an active delivery area. The delivery database index must be ready.');
    if ((path === 'auth/order-routing' || /^auth\/users\/[^/]+\/assignment$/.test(path)) && failure && typeof failure === 'object' && 'error' in failure && failure.error === 'INVALID_TRANSITION') throw new Error('Keep a working login in each enabled branch. Clear active delivery areas, existing staff assignments and open orders before removing a branch.');
    if (failure && typeof failure === 'object' && 'error' in failure && failure.error === 'PRODUCT_FAMILY_CONFLICT') {
      throw new Error('Check the family name, brand, form, strength, category and option combinations. Each combination must be unique.');
    }
  }
  if (path === 'banners' && method === 'POST' && result.status === 503) {
    throw new Error('Banner storage is unavailable. Reload Banners to check whether it was published before retrying.');
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
export { OrderMonitor } from './order-monitor';
