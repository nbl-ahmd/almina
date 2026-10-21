'use client';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Field, FieldLabel, FieldDescription, FieldGroup } from './ui/field';


import Link from 'next/link';
import Script from 'next/script';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeftIcon, ArrowRightIcon, ArrowPathIcon, CheckCircleIcon, PencilSquareIcon } from '@heroicons/react/24/outline';

export class AccountRequestError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}
export async function accountRequest(action: string, body?: unknown) {
  const response = await fetch('/api/customer/' + action, {
    method: body ? 'POST' : 'GET', cache: 'no-store', signal: AbortSignal.timeout(15000),
    headers: body ? { 'Content-Type': 'application/json', 'X-CSRF-Protection': '1' } : {},
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) throw new AccountRequestError(response.status,
    response.status === 401 ? 'Your code or session has expired, or the code is incorrect. Please try again.' :
    response.status === 429 ? 'Too many attempts. Please wait before trying again.' :
    response.status === 403 && action === 'google' ? 'Please sign in with an email code to verify this email address.' :
    'We could not connect to your account. Please try again. Guest checkout is still available.');
  return response.status === 204 ? null : (await response.json() as { data: unknown }).data;
}
type Options = { googleClientId: string | null; emailEnabled: boolean };
type GoogleApi = { accounts: { id: {
  initialize(options: { client_id: string; callback: (value: { credential: string }) => void; auto_select: boolean }): void;
  renderButton(element: HTMLElement, options: { theme: string; size: string; type: string; text: string; width: number; shape: string }): void;
} } };

function GoogleSignIn({ clientId, nonce, onCredential, busy }: { clientId: string; nonce?: string | undefined; onCredential: (credential: string) => void; busy: boolean }) {
  const element = useRef<HTMLDivElement>(null), callback = useRef(onCredential);
  const [ready, setReady] = useState(false), [failed, setFailed] = useState(false);
  useEffect(() => { callback.current = onCredential; }, [onCredential]);
  function initialize() {
    if (!element.current) return;
    const api = (window as Window & { google?: GoogleApi }).google;
    if (!api) { setFailed(true); return; }
    try {
      api.accounts.id.initialize({ client_id: clientId, auto_select: false, callback: value => callback.current(value.credential) });
      element.current.replaceChildren();
      api.accounts.id.renderButton(element.current, { theme: 'outline', size: 'large', type: 'standard', text: 'continue_with', shape: 'pill', width: Math.min(400, element.current.clientWidth || 280) });
      setReady(true); setFailed(false);
    } catch { setFailed(true); }
  }
  useEffect(() => { if (ready) return; const timer = setTimeout(() => setFailed(true), 12000); return () => clearTimeout(timer); }, [ready]);
  return <div>
    <Script src="https://accounts.google.com/gsi/client" nonce={nonce} strategy="afterInteractive" onReady={initialize} onError={() => setFailed(true)} />
    {failed ? <p role="status" className="mb-0 rounded-xl bg-subtle p-3 text-sm text-muted">Google sign-in could not load. Continue with an email code below.</p> : <>
      {!ready ? <p role="status" className="text-sm text-muted">Loading Google sign-in…</p> : null}
      <div ref={element} aria-label="Google sign-in" aria-busy={busy} inert={busy} className={busy ? 'pointer-events-none flex min-h-12 justify-center opacity-60' : 'flex min-h-12 justify-center'} />
    </>}
  </div>;
}

export function CustomerSignIn({ nonce, onSignedIn, purpose='retail' }: { nonce?: string | undefined; onSignedIn: () => Promise<void>; purpose?:'retail'|'wholesale' }) {
  const [options, setOptions] = useState<Options | null>(null), [optionsFailed, setOptionsFailed] = useState(false);
  const [email, setEmail] = useState(''), [code, setCode] = useState(''), [challenge, setChallenge] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [cooldown, setCooldown] = useState(0);
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
  return <div className="mx-auto w-full max-w-[440px] pb-3 sm:pt-2">
    <Link href="/products" className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm text-muted transition-colors hover:text-teal"><ArrowLeftIcon className="size-4" />Back to shopping</Link>
    <section aria-labelledby="sign-in-heading" className="m-0 overflow-hidden rounded-2xl border border-border bg-white shadow-[0_12px_36px_-20px_rgba(25,33,59,0.2)]">
      <div className="px-5 pt-6 pb-5 sm:px-8 sm:pt-8">
        <div className="mb-6 text-center">
          <h1 id="sign-in-heading" className="mb-2 text-[28px] font-semibold leading-tight tracking-[-0.025em]">{challenge ? 'Check your email' : 'Welcome to Al Mina'}</h1>
          <p className="m-0 text-sm leading-6 text-muted">{challenge ? 'Enter your six-digit sign-in code.' : 'Sign in or create your account.'}</p>
        </div>
        {challenge ? <div className="mb-6 flex min-w-0 items-center gap-2 rounded-xl bg-subtle py-2 pl-3 pr-1"><span className="min-w-0 flex-1 break-all text-sm font-medium text-ink">{email.trim()}</span><Button variant="ghost" size="icon" type="button" className="shrink-0" disabled={busy} onClick={changeEmail} aria-label="Change email"><PencilSquareIcon className="size-4" /></Button></div> : null}
        {!options && !optionsFailed ? <div role="status" className="grid min-h-40 content-center gap-3 text-sm text-muted"><div className="h-12 rounded-full bg-subtle motion-safe:animate-pulse" /><span className="text-center">Loading sign-in options…</span></div> : null}
        {optionsFailed ? <div role="alert" className="mb-4 rounded-xl bg-subtle p-4 text-sm"><p>Sign-in is temporarily unavailable.</p><Button variant="outline" type="button" onClick={() => { setOptionsFailed(false); void loadOptions(); }}>Try again</Button></div> : null}
        {!challenge && options?.googleClientId ? <><GoogleSignIn clientId={options.googleClientId} nonce={nonce} busy={busy} onCredential={credential => { void perform(async () => { await accountRequest('google', { idToken: credential }); await onSignedIn(); }); }} /><div className="my-5 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-border" />or continue with email<span className="h-px flex-1 bg-border" /></div></> : null}
        {options?.emailEnabled ? <form onSubmit={submit} aria-label="Email sign-in" aria-busy={busy}><FieldGroup className="grid gap-4">
          {challenge ? <Field data-invalid={!!error}><FieldLabel htmlFor="account-sign-in-code">Six-digit code</FieldLabel><Input variant="code" id="account-sign-in-code" ref={codeInput} type="text" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={code} disabled={busy} aria-invalid={!!error} aria-describedby={error?'sign-in-error':'code-help'} onChange={event => { setCode(event.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }} placeholder="000000" /><FieldDescription id="code-help" className="text-center">Your code expires in 10 minutes.</FieldDescription></Field> : <Field><FieldLabel htmlFor="customer-sign-in-field-1">Email address</FieldLabel><Input id="customer-sign-in-field-1" ref={emailInput} type="email" autoComplete="email" placeholder="you@example.com" maxLength={254} required value={email} disabled={busy} onChange={event => { setEmail(event.target.value); setError(''); }} /></Field>}
          {error ? <p id="sign-in-error" role="alert" className="m-0 rounded-xl bg-sale-surface p-3 text-sm leading-6 text-sale">{error}</p> : null}
          <Button type="submit" disabled={busy || (!!challenge && code.length !== 6)}><span>{busy ? 'Please wait…' : challenge ? 'Verify & sign in' : 'Continue with email'}</span>{busy ? <ArrowPathIcon className="size-4 motion-safe:animate-spin" /> : <ArrowRightIcon className="size-4" />}</Button>
          {challenge ? <div className="flex flex-wrap items-center justify-center gap-x-1 text-xs"><span className="text-muted">Didn’t receive it?</span><Button variant="outline" size="sm" type="button" disabled={busy || cooldown > 0} onClick={() => void perform(sendCode)}>{cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}</Button></div> : <p className="m-0 text-center text-xs leading-5 text-muted">New here? We’ll create your account when you verify.</p>}
        </FieldGroup></form> : options ? <p className="rounded-xl bg-subtle p-4 text-sm leading-6 text-muted">{purpose==='wholesale'?'Business sign-in is not available. Please contact the pharmacy; wholesale access requires verified sign-in.':options.googleClientId ? 'Email sign-in is currently unavailable. You can use Google above or check out as a guest.' : 'Account sign-in is not connected yet. You can still browse, save products on this device and check out as a guest.'}</p> : null}
        {!options?.emailEnabled && error ? <p role="alert" className="mb-0 mt-4 rounded-xl bg-sale-surface p-3 text-sm leading-6 text-sale">{error}</p> : null}
        {notice ? <p role="status" className="mb-0 mt-3 flex items-start justify-center gap-1.5 text-xs leading-5 text-muted"><CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-teal" />{notice}</p> : null}
        {!challenge ? <p className="mb-0 mt-5 text-center text-xs leading-5 text-muted">Your email connects your account and purchases.<br />Marketing is always optional. <Link href="/privacy" aria-label="account privacy notice" className="text-teal hover:text-teal">Read our privacy notice</Link>.</p> : null}
      </div>
      {purpose==='retail'?<div className="border-t border-border bg-page px-5 py-2 text-center"><Link href="/checkout" className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-medium text-muted transition-colors hover:bg-white hover:text-teal">Continue as a guest<ArrowRightIcon className="size-4" /></Link></div>:null}
    </section>
  </div>;
}
