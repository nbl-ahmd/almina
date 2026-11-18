'use client';

import { useState, type FormEvent } from 'react';
import Link from './app-link';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { NativeSelect } from './ui/native-select';
import { Textarea } from './ui/textarea';
import { Field, FieldLabel, FieldDescription, FieldGroup } from './ui/field';
import styles from './product-information.module.css';
import { shopText as u } from '../lib/i18n-storefront';
import type { Locale } from '../lib/i18n';

export type ReviewSummary = {
  items: { rating: number; displayName: string; title: string; body: string; createdAt: string; verifiedPurchase: true }[];
  ratingCount: number;
  average: number | null;
};

export function ProductReviews({ productId, reviews, locale = 'en' }: {
  productId: string; reviews: ReviewSummary | null; locale?: Locale;
}) {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const t = (key: string) => u(locale, key);
  const ar = locale === 'ar';
  const number = new Intl.NumberFormat(ar ? 'ar-AE' : 'en-AE');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch('/api/customer/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Protection': '1' },
        body: JSON.stringify({
          productId, orderId: data.get('orderId'), rating: Number(data.get('rating')),
          displayName: data.get('displayName'), title: data.get('title'), body: data.get('body'),
        }),
      });
      if (!response.ok) {
        throw new Error(response.status === 401 ? t('Please sign in before writing a review.')
          : response.status === 403 ? t('Use the order number for your purchase of this product. Cancelled or refunded orders do not qualify.')
          : t('Unable to submit the review. Please try again.'));
      }
      setNotice({ text: t('Thank you. Your review is awaiting moderation before it appears here.'), error: false });
      form.reset();
      setOpen(false);
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : t('Unable to submit the review. Please try again.'), error: true });
    } finally {
      setBusy(false);
    }
  }

  const reviewSummary = reviews?.ratingCount && reviews.average !== null
    ? ar
      ? `${number.format(reviews.average)} من 5 · ${number.format(reviews.ratingCount)} تقييمات شراء موثقة`
      : `${number.format(reviews.average)} out of 5 · ${number.format(reviews.ratingCount)} verified purchase ${reviews.ratingCount === 1 ? 'review' : 'reviews'}`
    : reviews
      ? ar ? 'لا توجد تقييمات شراء موثقة منشورة حالياً.' : 'There are no published verified-purchase reviews yet.'
      : ar ? 'تعذّر تحميل التقييمات المنشورة.' : 'Published reviews could not be loaded.';

  return (
    <section className={styles.reviews} aria-labelledby="product-reviews-title">
      <div className={styles.reviewHeader}>
        <div>
          <h2 id="product-reviews-title">{t('Customer reviews')}</h2>
          <p>{reviewSummary}</p>
        </div>
        <Button variant="outline" size="sm" type="button" aria-expanded={open}
          aria-controls={open ? 'write-product-review' : undefined} onClick={() => setOpen(!open)}>
          {open ? (ar ? 'إغلاق نموذج التقييم' : 'Close review form') : t('Write a review')}
        </Button>
      </div>
      {notice ? <p className={styles.reviewMessage} data-error={notice.error || undefined} role="status">{notice.text}</p> : null}
      {open ? (
        <form id="write-product-review" onSubmit={submit} className={styles.reviewForm}>
          <FieldGroup className="grid gap-4">
            <p className="m-0 text-muted"><Link className={styles.link} href="/account">{t('Sign in')}</Link>
              {t(' with the email used for your order. Reviews are checked before publication.')}
            </p>
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="product-reviews-field-1">{t('Order number')}</FieldLabel>
                <Input id="product-reviews-field-1" name="orderId" dir="ltr" pattern="OD[0-9]+" placeholder="OD5050" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="product-reviews-field-2">{t('Rating')}</FieldLabel>
                <NativeSelect id="product-reviews-field-2" name="rating" required defaultValue="">
                  <option value="" disabled>{t('Select a rating')}</option>
                  {[5, 4, 3, 2, 1].map(value => <option key={value} value={value}>{ar ? `${value} من 5` : `${value} out of 5`}</option>)}
                </NativeSelect>
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="product-reviews-field-3">{t('Public display name')}</FieldLabel>
              <Input id="product-reviews-field-3" name="displayName" dir="auto" minLength={2} maxLength={40} required autoComplete="nickname" />
            </Field>
            <Field>
              <FieldLabel htmlFor="product-reviews-field-4">{t('Review title (optional)')}</FieldLabel>
              <Input id="product-reviews-field-4" name="title" dir="auto" maxLength={100} />
            </Field>
            <Field>
              <FieldLabel htmlFor="review-experience">{t('Your experience')}</FieldLabel>
              <Textarea id="review-experience" aria-describedby="review-experience-help" name="body" dir="auto" minLength={10} maxLength={1800} required />
              <FieldDescription id="review-experience-help">{t('Please avoid personal medical information or contact details.')}</FieldDescription>
            </Field>
            <Button type="submit" disabled={busy} className="w-fit">{busy ? t('Sending…') : t('Submit for review')}</Button>
          </FieldGroup>
        </form>
      ) : null}
      {reviews?.items.length ? (
        <div className={styles.reviewItems}>
          {reviews.items.map((review, index) => (
            <article key={index}>
              <p>{number.format(review.rating)}/5 · <bdi>{review.displayName}</bdi></p>
              {review.title ? <h3 dir="auto">{review.title}</h3> : null}
              <p dir="auto">{review.body}</p>
              <p className={styles.reviewVerified}>
                {ar ? 'شراء موثق · ' : 'Verified purchase · '}
                {new Date(review.createdAt).toLocaleDateString(ar ? 'ar-AE' : 'en-AE')}
              </p>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
