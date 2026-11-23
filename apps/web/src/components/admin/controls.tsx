"use client";
/* eslint-disable @next/next/no-location-assign-relative-destination -- Session changes need a full reload to discard privileged router state. */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightOnRectangleIcon } from "@heroicons/react/24/outline";
import { adminFileLimit } from '../../lib/admin/upload-limits';
import { useConfirm } from './confirm-dialog';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { buttonVariants } from './ui';
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
    if (failure && typeof failure === 'object' && 'error' in failure && failure.error === 'CATALOG_REVIEW_REQUIRED') throw new Error('Choose the product type (General or Pharmacy medicine) and give it a complete name before publishing. Prescription items are never sold online.');
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
const loginSchema = z.object({
  username: z.string().trim().min(1, 'Enter your username.').max(100),
  password: z.string().min(1, 'Enter your password.'),
});
type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const [reveal, setReveal] = useState(false);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });
  const input = "h-12 w-full rounded-lg border-0 bg-fill px-5 text-sm text-ink outline-none placeholder:text-mute focus:bg-white focus:ring-2 focus:ring-ink aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-bad";
  async function submit(values: LoginValues) {
    try {
      await adminRequest("auth/login", "POST", { username: values.username, password: values.password });
      window.location.assign("/admin");
    } catch (error) {
      setError('root', { message: error instanceof Error ? error.message : "Sign in failed." });
    }
  }
  return (
    <form className="mt-6 grid gap-4" onSubmit={handleSubmit(submit)} aria-busy={isSubmitting} noValidate>
      <div className="grid gap-1.5">
        <label htmlFor="username" className="text-[13px] font-medium text-ink">Username</label>
        <input id="username" autoComplete="username" placeholder="Your staff username" aria-invalid={errors.username ? true : undefined} aria-describedby={errors.username ? 'username-error' : undefined} className={input} {...register('username')} />
        {errors.username ? <p id="username-error" role="alert" className="m-0 text-xs font-medium text-bad">{errors.username.message}</p> : null}
      </div>
      <div className="grid gap-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="text-[13px] font-medium text-ink">Password</label>
          <button type="button" aria-pressed={reveal} onClick={() => setReveal(value => !value)} className="rounded-lg px-2 py-1 text-xs font-medium text-mute outline-0 hover:text-ink">{reveal ? "Hide" : "Show"}</button>
        </div>
        <input id="password" type={reveal ? "text" : "password"} autoComplete="current-password" placeholder="Your account password" aria-invalid={errors.password ? true : undefined} aria-describedby={errors.password ? 'password-error' : undefined} className={input} {...register('password')} />
        {errors.password ? <p id="password-error" role="alert" className="m-0 text-xs font-medium text-bad">{errors.password.message}</p> : null}
      </div>
      {errors.root ? <p role="alert" className="m-0 rounded-lg bg-bad-soft px-4 py-3 text-[13px] font-medium text-bad">{errors.root.message}</p> : null}
      <button type="submit" disabled={isSubmitting} className="mt-1 h-12 rounded-lg bg-ink text-[15px] font-semibold text-white transition hover:bg-ink-2 active:scale-[0.99] disabled:opacity-60">{isSubmitting ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
export function SessionControls() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <div className="flex items-center">
      <button
        className="inline-flex h-10 items-center gap-2 rounded-lg bg-fill px-3.5 text-[13px] font-medium text-ink hover:bg-line disabled:opacity-50"
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
        <ArrowRightOnRectangleIcon className="size-[18px]" aria-hidden="true" />
        <span className="hidden lg:inline">Sign out</span>
      </button>
      {error ? <span className="ml-2 rounded-lg bg-bad-soft px-3 py-2 text-xs font-medium text-bad" role="alert">{error}</span> : null}
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
  const { ask, dialog } = useConfirm();
  return (
    <span>
      {dialog}
      <button
        className={`${buttonVariants({ variant: variant === 'primary' ? 'primary' : variant === 'danger' ? 'danger' : 'outline', size: 'sm' })}${variant === 'danger' ? ' text-bad' : ''}`}
        disabled={pending}
        onClick={async () => {
          if (confirm && !(await ask(confirm, { action: children, danger: variant === 'danger' }))) return;
          setPending(true);
          try {
            await adminRequest(path, method, body);
            toast.success("Done");
            router.refresh();
          } catch (error) {
            const text = error instanceof Error ? error.message : "Request failed.";
            toast.error(text);
          } finally {
            setPending(false);
          }
        }}
      >
        {pending ? "Saving…" : children}
      </button>
    </span>
  );
}
export { OrderMonitor } from './order-monitor';
