'use client';
import { useState, type FormEvent } from 'react';
import { Dialog } from 'radix-ui';
import { useAccountCopy } from '../account-locale';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Field, FieldLabel, FieldDescription, FieldGroup } from '../ui/field';
import { StarIcon, XMarkIcon } from '../storefront-icons';
import { accountRequest, AccountRequestError } from '../customer-sign-in';
import { ratingLabels, reviewErrorMessage } from '../../lib/account/orders';

export type ReviewTarget = { productId: string; name: string; orderId: string; rating: number };

/** "Share your experience" (Flipkart review screen): stars with words, a public name and a few lines. The order number comes from
 *  the order being viewed; the server checks the purchase and holds every review for moderation. */
export function ReviewDialog({ target, thumb, onClose, onSubmitted }: { target: ReviewTarget; thumb: React.ReactNode; onClose: () => void; onSubmitted: (rating: number) => void }) {
  const { a, locale } = useAccountCopy();
  const [rating, setRating] = useState(target.rating), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  // The dialog has no trigger of its own: remember the star that opened it.
  const [opener] = useState(() => typeof document === 'undefined' ? null : document.activeElement as HTMLElement | null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!rating) { setError('Choose a star rating.'); return; }
    const data = new FormData(event.currentTarget);
    const text = (name: string) => String(data.get(name) ?? '').trim();
    if (text('displayName').length < 2 || text('body').length < 10) { setError('Add a public name and at least 10 characters about your experience.'); return; }
    setBusy(true); setError('');
    try {
      await accountRequest('review', { productId: target.productId, orderId: target.orderId, rating, displayName: text('displayName'), title: text('title'), body: text('body') });
      onSubmitted(rating);
    } catch (failure) { setError(reviewErrorMessage(failure instanceof AccountRequestError ? failure.status : 0)); }
    finally { setBusy(false); }
  }
  return <div ref={setContainer}>
    <Dialog.Root open onOpenChange={open => { if (!open && !busy) onClose(); }}>
      {container ? <Dialog.Portal container={container}>
        <Dialog.Overlay className="shop-modal-scrim" />
        <Dialog.Content className="review-dialog" dir={locale === 'ar' ? 'rtl' : 'ltr'} onCloseAutoFocus={event => { event.preventDefault(); (opener?.isConnected ? opener : document.getElementById('order-items'))?.focus(); }}>
          <div className="review-dialog-head">
            <Dialog.Close asChild><Button variant="ghost" size="icon" disabled={busy} aria-label={a('Close')}><XMarkIcon aria-hidden="true" /></Button></Dialog.Close>
            <Dialog.Title className="m-0 text-lg font-bold">{a('Share your experience')}</Dialog.Title>
          </div>
          <div className="review-product">{thumb}<span><bdi>{target.name}</bdi><small>{a('Order')} <bdi>{target.orderId}</bdi></small></span></div>
          <Dialog.Description className="sr-only">{a('Rate this product and describe your experience.')}</Dialog.Description>
          <form onSubmit={submit} noValidate>
            <FieldGroup className="grid gap-4">
              <fieldset className="review-stars"><legend className="sr-only">{a('Your rating')}</legend>
                {ratingLabels.map((label, index) => <label key={label} data-filled={index < rating}>
                  <input type="radio" name="rating" value={index + 1} checked={rating === index + 1} onChange={() => { setRating(index + 1); setError(''); }} />
                  <StarIcon aria-hidden="true" weight={index < rating ? 'fill' : 'regular'} />
                  <span>{a(label)}</span>
                </label>)}
              </fieldset>
              <Field><FieldLabel htmlFor="review-name">{a('Public display name')}</FieldLabel><Input id="review-name" name="displayName" minLength={2} maxLength={40} required autoComplete="nickname" /></Field>
              <Field><FieldLabel htmlFor="review-title">{a('Review title (optional)')}</FieldLabel><Input id="review-title" name="title" maxLength={100} /></Field>
              <Field><FieldLabel htmlFor="review-body">{a('Your experience')}</FieldLabel><Textarea id="review-body" name="body" minLength={10} maxLength={1800} required aria-describedby="review-help" /><FieldDescription id="review-help">{a('Please avoid personal medical information or contact details. Reviews are checked before publication, and you can review each product once.')}</FieldDescription></Field>
              {error ? <p role="alert" className="m-0 text-sm font-semibold">{a(error)}</p> : null}
              <Button type="submit" disabled={busy} className="review-submit">{busy ? a('Sending…') : a('Submit review')}</Button>
            </FieldGroup>
          </form>
        </Dialog.Content>
      </Dialog.Portal> : null}
    </Dialog.Root>
  </div>;
}
