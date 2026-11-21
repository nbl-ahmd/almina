'use client';
import { useAccountCopy } from "./account-locale";
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Field, FieldLabel, FieldDescription, FieldGroup } from './ui/field';


import Link from './app-link';
import { accountErrorMessage } from '../lib/account/errors';
import Script from 'next/script';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeftIcon, ArrowRightIcon, ArrowPathIcon, CheckCircleIcon, PencilSquareIcon } from './storefront-icons';

export class AccountRequestError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}
export async function accountRequest(action: string, body?: unknown) {
  const response = await fetch('/api/customer/' + action, {
    method: body ? 'POST' : 'GET', cache: 'no-store', signal: AbortSignal.timeout(15000),
    headers: body ? { 'Content-Type': 'application/json', 'X-CSRF-Protection': '1' } : {},
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) {
    let code: string | undefined;
    try { const value: unknown = await response.json();
      if (value && typeof value === 'object' && 'error' in value && value.error && typeof value.error === 'object' && 'code' in value.error && typeof value.error.code === 'string') code = value.error.code;
    } catch { /* Gateway errors may be plain responses; use a safe local message. */ }
    throw new AccountRequestError(response.status, accountErrorMessage(response.status, action, code));
  }
  return response.status === 204 ? null : (await response.json() as { data: unknown }).data;
}
type Options = { googleClientId: string | null; emailEnabled: boolean };
type GoogleApi = { accounts: { id: {
  initialize(options: { client_id: string; callback: (value: { credential: string }) => void; auto_select: boolean }): void;
  renderButton(element: HTMLElement, options: { theme: string; size: string; type: string; text: string; width: number; shape: string; locale: string }): void;
} } };

function syncGoogleButton(host: HTMLDivElement | null) {
  const button = host?.querySelector<HTMLElement>('div[role="button"]');
  if (!button) return false;
  // Google writes a fixed pixel width inline on its button; ignore it so the
  // control fills the card at every viewport instead of needing a re-measure.
  button.style.width = '100%'; button.style.maxWidth = '100%';
  return true;
}

function GoogleSignIn({ clientId, nonce, onCredential, onUnavailable, busy }: { clientId: string; nonce?: string | undefined; onCredential: (credential: string) => void; onUnavailable: () => void; busy: boolean }) {
 const {a,locale}=useAccountCopy();

  const element = useRef<HTMLDivElement>(null), callback = useRef(onCredential), unavailable = useRef(onUnavailable);
  const [ready, setReady] = useState(false), [failed, setFailed] = useState(false);
  useEffect(() => { callback.current = onCredential; unavailable.current = onUnavailable; }, [onCredential, onUnavailable]);
  useEffect(() => { if (failed) unavailable.current(); }, [failed]);
  function initialize() {
    if (!element.current) return;
    const api = (window as Window & { google?: GoogleApi }).google;
    if (!api) { setFailed(true); return; }
    try {
      api.accounts.id.initialize({ client_id: clientId, auto_select: false, callback: value => callback.current(value.credential) });
      element.current.replaceChildren();
      api.accounts.id.renderButton(element.current, { locale, theme: 'outline', size: 'large', type: 'standard', text: 'continue_with', shape: 'rectangular', width: Math.min(400, Math.round(element.current.clientWidth || 280)) });
      setFailed(false);
      if (syncGoogleButton(element.current)) setReady(true);
    } catch { setFailed(true); }
  }
  useEffect(() => {
    if (ready || failed) return;
    // Google normally renders synchronously; keep checking in case it defers.
    const timer = setInterval(() => { if (syncGoogleButton(element.current)) setReady(true); }, 250);
    return () => clearInterval(timer);
  }, [ready, failed]);
  useEffect(() => { if (ready || failed) return; const timer = setTimeout(() => setFailed(true), 12000); return () => clearTimeout(timer); }, [ready, failed]);
  return <div>
    <Script src="https://accounts.google.com/gsi/client" nonce={nonce} strategy="afterInteractive" onReady={initialize} onError={() => setFailed(true)} />
    {failed ? null : <div className="relative">
      <div ref={element} aria-label={a("Google sign-in")} aria-busy={busy || !ready} inert={busy} className={busy ? 'google-signin pointer-events-none opacity-60' : 'google-signin'} />
      {ready ? null : <div role="status" className="pointer-events-none absolute inset-0 grid place-items-center rounded-xl border text-sm">{a("Loading Google sign-in…")}</div>}
    </div>}
  </div>;
}

export function CustomerSignIn({ nonce, onSignedIn, purpose='retail' }: { nonce?: string | undefined; onSignedIn: () => Promise<void>; purpose?:'retail'|'wholesale' }) {
 const {a}=useAccountCopy();

  const [options, setOptions] = useState<Options | null>(null), [optionsFailed, setOptionsFailed] = useState(false);
  const [email, setEmail] = useState(''), [code, setCode] = useState(''), [challenge, setChallenge] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [cooldown, setCooldown] = useState(0);
  const [googleFailed, setGoogleFailed] = useState(false);
  const previousChallenge = useRef('');
  const lock = useRef(false), codeInput = useRef<HTMLInputElement>(null), emailInput = useRef<HTMLInputElement>(null);
  async function loadOptions() {
    try { const value = await accountRequest('options') as Options; setOptions(value); } catch { setOptionsFailed(true); }
  }
  useEffect(() => { let active=true; void accountRequest('options').then(value=>{if(active)setOptions(value as Options);}).catch(()=>{if(active)setOptionsFailed(true);});return()=>{active=false;}; }, []);
  useEffect(() => { if (challenge) codeInput.current?.focus(); else if(previousChallenge.current)emailInput.current?.focus(); previousChallenge.current=challenge; }, [challenge]);
  useEffect(() => { if (!cooldown) return; const timer = setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000); return () => clearTimeout(timer); }, [cooldown]);
  async function perform(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setNotice('');
    try { await action(); } catch (failure) { setError(failure instanceof AccountRequestError ? failure.message : 'Connection interrupted. Please try again.'); }
    finally { lock.current = false; setBusy(false); }
  }
  async function sendCode() {
    const value = await accountRequest('email', { email: email.trim() }) as { challenge: string };
    setChallenge(value.challenge); setCode(''); setCooldown(60); setNotice('Code sent. Check your inbox or spam folder.');
  }
  function changeEmail() { setChallenge(''); setCode(''); setError(''); setNotice(''); }
  function submit(event: FormEvent) {
    event.preventDefault();
    void perform(async () => {
      if (challenge) { await accountRequest('verify', { challenge, code }); await onSignedIn(); }
      else await sendCode();
    });
  }
  return <div className="customer-sign-in mx-auto w-full max-w-[440px] pb-3 sm:pt-2">
    <Link href="/products" className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm transition-colors"><ArrowLeftIcon className="size-4" />{a("Back to shopping")}</Link>
    <section aria-labelledby="sign-in-heading" className="m-0 overflow-hidden rounded-2xl border bg-white ">
      <div className="px-5 pt-6 pb-5 sm:px-8 sm:pt-8">
        <div className="mb-6 text-center">
          <h1 id="sign-in-heading" className="mb-2 text-[28px] font-semibold leading-tight tracking-[-0.025em]">{challenge ? a("Check your email") : purpose === 'wholesale' ? a("Business sign-in") : a("Welcome to Al Mina")}</h1>
          <p className="m-0 text-sm leading-6">{challenge ? a("Enter your six-digit sign-in code.") : purpose === 'wholesale' ? a("Use the email address on your pharmacy invitation.") : optionsFailed || (options && !options.emailEnabled && !options.googleClientId) ? a("Continue as a guest") : a("Sign in or create your account.")}</p>
        </div>
        {challenge ? <div className="mb-6 flex min-w-0 items-center gap-2 rounded-xl py-2 pl-3 pr-1"><span className="min-w-0 flex-1 break-all text-sm font-medium">{email.trim()}</span><Button variant="ghost" size="icon" type="button" className="shrink-0" disabled={busy} onClick={changeEmail} aria-label={a("Change email")}><PencilSquareIcon className="size-4" /></Button></div> : null}
        {!options && !optionsFailed ? <div role="status" className="grid min-h-40 content-center gap-3 text-sm"><div className="h-12 rounded-full motion-safe:animate-pulse" /><span className="text-center">{a("Loading sign-in options…")}</span></div> : null}
        {optionsFailed ? <div role="alert" className="mb-4 rounded-xl p-4 text-sm"><p>{a("Sign-in is temporarily unavailable.")}</p><Button variant="outline" type="button" onClick={() => { setOptionsFailed(false); void loadOptions(); }}>{a("Try again")}</Button></div> : null}
        {!challenge && options?.googleClientId ? <>
          <GoogleSignIn clientId={options.googleClientId} nonce={nonce} busy={busy} onUnavailable={() => setGoogleFailed(true)} onCredential={credential => { void perform(async () => { await accountRequest('google', { idToken: credential }); await onSignedIn(); }); }} />
          {googleFailed
            ? <p role="status" className="mt-4 rounded-xl border p-4 text-sm leading-6">{a("Google sign-in could not load. ")}{options.emailEnabled ? a("Continue with an email code below.") : a("Refresh this page to try again, or contact the pharmacy for help.")}</p>
            : options.emailEnabled ? <div className="my-5 flex items-center gap-3 text-xs"><span className="h-px flex-1" />{a("or continue with email")}<span className="h-px flex-1" /></div> : null}
        </> : null}
        {options?.emailEnabled ? <form onSubmit={submit} aria-label={a("Email sign-in")} aria-busy={busy}><FieldGroup className="grid gap-4">
          {challenge ? <Field data-invalid={!!error}><FieldLabel htmlFor="account-sign-in-code">{a("Six-digit code")}</FieldLabel><Input variant="code" id="account-sign-in-code" ref={codeInput} type="text" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={code} disabled={busy} aria-invalid={!!error} aria-describedby={error?'sign-in-error':'code-help'} onChange={event => { setCode(event.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }} placeholder="000000" /><FieldDescription id="code-help" className="text-center">{a("Your code expires in 10 minutes.")}</FieldDescription></Field> : <Field><FieldLabel htmlFor="customer-sign-in-field-1">{a("Email address")}</FieldLabel><Input id="customer-sign-in-field-1" ref={emailInput} type="email" autoComplete="email" placeholder={a("you@example.com")} maxLength={254} required value={email} disabled={busy} onChange={event => { setEmail(event.target.value); setError(''); }} /></Field>}
          {error ? <p id="sign-in-error" role="alert" className="m-0 rounded-xl p-3 text-sm leading-6">{a(error)}</p> : null}
          <Button type="submit" disabled={busy || (!!challenge && code.length !== 6)}><span>{busy ? a("Please wait…") : challenge ? a("Verify & sign in") : a("Continue with email")}</span>{busy ? <ArrowPathIcon className="size-4 motion-safe:animate-spin" /> : <ArrowRightIcon className="size-4" />}</Button>
          {challenge ? <div className="flex flex-wrap items-center justify-center gap-x-1 text-xs"><span>{a("Didn’t receive it?")}</span><Button variant="outline" size="sm" type="button" disabled={busy || cooldown > 0} onClick={() => void perform(sendCode)}>{cooldown > 0 ? a(`Resend code in ${cooldown}s`) : a("Resend code")}</Button></div> : <p className="m-0 text-center text-xs leading-5">{a("New here? We’ll create your account when you verify.")}</p>}
        </FieldGroup></form> : options && !(options.googleClientId && googleFailed) ? <p className="mt-4 rounded-xl border p-4 text-sm leading-6">{options.googleClientId ? purpose === 'wholesale' ? a("Continue with Google using your invited email. Business access requires pharmacy approval.") : a("Email sign-in is temporarily unavailable. Use Google, or continue as a guest.") : purpose === 'wholesale' ? a("Business sign-in is not available. Please contact the pharmacy; wholesale access requires verified sign-in.") : a("Account sign-in is not connected yet. You can still browse, save products on this device and check out as a guest.")}</p> : null}
        {!options?.emailEnabled && error ? <p role="alert" className="mb-0 mt-4 rounded-xl p-3 text-sm leading-6">{a(error)}</p> : null}
        {notice ? <p role="status" className="mb-0 mt-3 flex items-start justify-center gap-1.5 text-xs leading-5"><CheckCircleIcon className="mt-0.5 size-4 shrink-0" />{a(notice)}</p> : null}
        {!challenge ? <p className="mb-0 mt-5 text-center text-xs leading-5">{options?.emailEnabled || options?.googleClientId ? <>{a("Your email connects your account and purchases.")}<br />{a("Marketing is always optional. ")}</> : null}<Link href="/privacy" aria-label={a("account privacy notice")}>{a("Read our privacy notice")}</Link>.</p> : null}
      </div>
      {purpose==='retail'?<div className="border-t px-5 py-2 text-center"><Link href="/checkout" className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-medium transition-colors hover:bg-white">{a("Continue as a guest")}<ArrowRightIcon className="size-4" /></Link></div>:null}
    </section>
  </div>;
}
