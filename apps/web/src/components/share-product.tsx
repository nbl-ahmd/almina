'use client';

import { useRef, useState } from 'react';
import { Dialog } from 'radix-ui';
import { shareTargets } from '../lib/storefront/contact';
import type { Locale } from '../lib/i18n';
import { Button } from './ui/button';
import { CopyIcon, EnvelopeIcon, ShareIcon, WhatsAppIcon, XMarkIcon } from './storefront-icons';

/** Product page share button. Phones open the system share sheet; browsers without one get WhatsApp, e-mail and copy-link. */
export function ShareProduct({ name, url, locale = 'en' }: { name: string; url: string; locale?: Locale }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState('');
  const [container, setContainer] = useState<HTMLSpanElement | null>(null);
  const ar = locale === 'ar';
  const trigger = useRef<HTMLButtonElement>(null);
  const targets = shareTargets(name, url);

  async function share() {
    setStatus('');
    if (typeof navigator.share === 'function') {
      try { await navigator.share({ title: name, url }); return; }
      catch (failure) {
        // Closing the system sheet is a choice, not a failure.
        if (failure instanceof DOMException && failure.name === 'AbortError') return;
      }
    }
    setOpen(true);
  }
  async function copy() {
    try { await navigator.clipboard.writeText(url); setStatus(ar ? 'تم نسخ الرابط' : 'Link copied'); }
    catch { setStatus(ar ? 'تعذّر النسخ. حدد الرابط وانسخه.' : 'Copying is blocked. Select the link and copy it.'); }
  }
  const option = 'flex min-h-12 w-full items-center justify-start gap-3 rounded-xl border bg-white px-4 text-sm font-semibold no-underline';

  return <span ref={setContainer}>
    <button ref={trigger} type="button" aria-label={ar ? `مشاركة ${name}` : `Share ${name}`} aria-haspopup="dialog" onClick={() => void share()}
      className="grid size-11 place-items-center rounded-full border border-solid border-border bg-white p-0 text-teal hover:bg-accent">
      <ShareIcon aria-hidden="true" className="size-5" />
    </button>
    <Dialog.Root open={open} onOpenChange={value => { setOpen(value); if (!value) setStatus(''); }}>
      <Dialog.Portal container={container}>
        <Dialog.Overlay className="shop-modal-scrim" />
        <Dialog.Content className="share-dialog" dir={ar ? 'rtl' : 'ltr'} onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus(); }}>
          <div className="flex items-center justify-between gap-3">
            <Dialog.Title className="m-0 text-lg font-bold">{ar ? 'مشاركة المنتج' : 'Share this product'}</Dialog.Title>
            <Dialog.Close asChild><Button variant="outline" size="icon" aria-label={ar ? 'إغلاق' : 'Close'}><XMarkIcon aria-hidden="true" /></Button></Dialog.Close>
          </div>
          <Dialog.Description className="m-0 line-clamp-2 text-sm text-muted">{name}</Dialog.Description>
          <a className={option} href={targets.whatsapp} target="_blank" rel="noopener noreferrer"><WhatsAppIcon aria-hidden="true" className="size-5" />{ar ? 'واتساب' : 'WhatsApp'}</a>
          <a className={option} href={targets.email}><EnvelopeIcon aria-hidden="true" className="size-5" />{ar ? 'البريد الإلكتروني' : 'Email'}</a>
          <button type="button" className={option} onClick={() => void copy()}><CopyIcon aria-hidden="true" className="size-5" />{ar ? 'نسخ الرابط' : 'Copy link'}</button>
          <input className="w-full rounded-lg border p-3 text-xs" dir="ltr" readOnly value={url} aria-label={ar ? 'رابط المنتج' : 'Product link'} onFocus={event => event.currentTarget.select()} />
          <p role="status" className="m-0 min-h-5 text-sm font-semibold">{status}</p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </span>;
}
