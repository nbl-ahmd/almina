'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { loadCart, checkAddition } from '../app/(storefront)/cart/actions';
import { storedCart, saveCart } from '../lib/catalog/browser-cart';
import type { CartLine } from '../lib/catalog/model';
import { t, tf, itemCountText, type Locale } from '../lib/i18n';
import { recordCommerceEvent } from '../lib/telemetry/browser';
import Link from './app-link';
import { ReminderSignup } from './customer-reminders';
import { CurrencyAmount } from './currency-amount';
import { DeliveryProgress } from './delivery-progress';
import { Icon } from './icon';
import { ProductImage } from './product-image';
import { Button } from './ui/button';
import { useFixedDockClearance } from './use-fixed-dock-clearance';
import controls from './storefront-system/boundary.module.css';
import tokens from './storefront-system/tokens.module.css';
import styles from './cart-view.module.css';

type CartSnapshot = Awaited<ReturnType<typeof loadCart>> & { lines: CartLine[] };
type Recommendation = { id: string; card: ReactNode };

export function CartView({ checkout = false, recommendations = [], cloudName, locale = 'en', orderingEnabled = true }: {
  checkout?: boolean;
  recommendations?: Recommendation[];
  cloudName?: string | undefined;
  locale?: Locale;
  orderingEnabled?: boolean;
}) {
  const [snapshot, setSnapshot] = useState<CartSnapshot>();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [retry, setRetry] = useState(0);
  const focusTarget = useRef<HTMLHeadingElement>(null);
  const removedWithFocus = useRef<{ id: string; neighbor?: string | undefined }>(null);
  const removeButtons = useRef(new Map<string, HTMLButtonElement>());
  const mutation = useRef<'validating' | 'refreshing' | null>(null);

  useEffect(() => {
    let active = true;
    let revision = 0;

    async function refresh() {
      const current = ++revision;
      try {
        const lines = storedCart();
        const result = await loadCart(lines);
        if (active && current === revision) setSnapshot({ ...result, lines });
      } catch {
        if (active && current === revision) {
          setSnapshot({ error: t(locale, 'cartReadError'), items: [], lines: [], subtotalMinor: null });
        }
      } finally {
        if (active && current === revision && mutation.current === 'refreshing') {
          mutation.current = null;
          setPending(false);
        }
      }
    }

    void refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener('almina-cart-change', refresh);
    return () => {
      active = false;
      window.removeEventListener('storage', refresh);
      window.removeEventListener('almina-cart-change', refresh);
    };
  }, [retry, locale]);

  useEffect(() => {
    const removed = removedWithFocus.current;
    if (!removed || !snapshot || snapshot.items.some(item => item.id === removed.id)) return;
    removedWithFocus.current = null;
    // Avoid taking focus from another control if the shopper has already moved on.
    if (document.activeElement !== document.body) return;
    const neighbor = removed.neighbor ? removeButtons.current.get(removed.neighbor) : undefined;
    const target = neighbor ?? focusTarget.current;
    const visible = target && target.getBoundingClientRect().bottom > 0;
    target?.focus({ preventScroll: Boolean(neighbor || visible) });
  }, [snapshot]);

  async function change(id: string, quantity: number, control: HTMLButtonElement) {
    if (mutation.current) return;
    mutation.current = 'validating';
    const hadFocus = document.activeElement === control;
    setPending(true);
    setError('');

    try {
      const latest = storedCart();
      if (quantity > 0) {
        const message = await checkAddition(id, quantity);
        if (message) {
          setError(message);
          return;
        }
      }
      if (JSON.stringify(latest) !== JSON.stringify(storedCart())) {
        setError(t(locale, 'cartChanged'));
        return;
      }
      const next = quantity === 0
        ? latest.filter(line => line.id !== id)
        : latest.map(line => line.id === id ? { id, quantity } : line);
      saveCart(next);
      mutation.current = 'refreshing';
      if (quantity === 0 && hadFocus) {
        const index = latest.findIndex(line => line.id === id);
        removedWithFocus.current = { id, neighbor: (latest[index + 1] ?? latest[index - 1])?.id };
      }
      recordCommerceEvent('cart_updated');
    } catch {
      setError(t(locale, 'cartSaveError'));
    } finally {
      if (mutation.current === 'validating') {
        mutation.current = null;
        setPending(false);
      }
    }
  }

  function retryRead() {
    setSnapshot(undefined);
    setRetry(value => value + 1);
  }

  const recommendationsForCart = snapshot && !snapshot.error
    ? recommendations.filter(product => !snapshot.lines.some(line => line.id === product.id)).slice(0, 2)
    : [];
  const canOrder = orderingEnabled && !checkout;

  return <div className={checkout ? `${tokens.system} ${controls.boundary}` : undefined} lang={locale}>
    {!snapshot ? <section className={styles.state}>
      <p role="status" className="sr-only">{t(locale, 'cartLoading')}</p>
      <div className={styles.placeholder} aria-hidden="true"><span /><div><span /><span /><span /></div></div>
    </section> : snapshot.error ? <section className={`${styles.state} ${styles.error}`}>
      <h2 ref={focusTarget} tabIndex={-1} role="alert">{snapshot.error}</h2>
      <p>{t(locale, 'cartSavedNotRemoved')}</p>
      <Button type="button" size="sm" variant="outline" onClick={retryRead}>{t(locale, 'cartTryAgain')}</Button>
    </section> : !snapshot.items.length ? <section className={`${styles.state} ${styles.empty}`}>
      <Icon name="bag" />
      <h2 ref={focusTarget} tabIndex={-1}>{t(locale, 'cartEmptyHeading')}</h2>
      <p>{t(locale, 'cartEmptyHint')}</p>
      <Button asChild size="sm"><Link href="/products">{t(locale, 'cartStartShopping')}<Icon name="arrow" /></Link></Button>
    </section> : <>
      <div className="sr-only" role="status">{pending ? t(locale, 'cartUpdating') : ''}</div>
      <div className={styles.layout}>
        <section className={styles.lines} aria-labelledby="cart-line-heading">
          <div className={styles.lineHeading}>
            <h2 id="cart-line-heading" ref={focusTarget} tabIndex={-1}>{t(locale, 'cartYourItems')}</h2>
            <p className={styles.count} role="status">
              {itemCountText(locale, snapshot.items.length, 'product')} · {itemCountText(locale, snapshot.items.reduce((sum, item) => sum + item.quantity, 0))}
            </p>
          </div>
          {error ? <p className={`${styles.feedback} ${styles.error}`} role="alert">{error}</p> : null}
          <DeliveryProgress locale={locale} lines={snapshot.lines} />
          <ul className={styles.items}>
            {snapshot.items.map(item => <li className={`cart-item ${styles.item}`} key={item.id}>
              <div className={styles.media} aria-hidden="true">
                <ProductImage cloudName={cloudName} src={item.image} alt="" width={80} height={80} sizes="(max-width: 767px) 64px, 80px" />
              </div>
              <div className={styles.identity}>
                {item.href === '/products'
                  ? <span className={styles.name}>{item.name}</span>
                  : <Link className={styles.name} href={item.href}><bdi>{item.name}</bdi></Link>}
                {item.variantLabel ? <p className={styles.variant}><bdi>{item.variantLabel}</bdi></p> : null}
                {item.price !== null ? <p className={`cart-unit-price ${styles.unitPrice}`}>
                  <CurrencyAmount value={item.price} locale={locale} /> {t(locale, 'cartPerItem')}
                </p> : null}
                {item.href !== '/products' ? <p className={styles.stock} data-available={item.available}>
                  {t(locale, item.available ? 'cartInStock' : 'cartUnavailableQuantity')}
                </p> : null}
              </div>
              {!checkout ? <Button type="button" variant="ghost" size="icon" className={styles.remove}
                ref={node => { if (node) removeButtons.current.set(item.id, node); else removeButtons.current.delete(item.id); }}
                aria-label={tf(locale, 'cartRemoveAria', { name: item.name })}
                aria-disabled={pending || undefined} onClick={event => change(item.id, 0, event.currentTarget)}><Icon name="trash" /></Button> : null}
              <div className={styles.itemActions}>
                {checkout ? <p>{itemCountText(locale, item.quantity)}</p> : <div className={styles.quantity} data-store-control="stepper">
                  <Button type="button" size="icon" variant="ghost" aria-label={tf(locale, 'cartDecreaseAria', { name: item.name })}
                    disabled={item.quantity <= 1} aria-disabled={pending || undefined} onClick={event => change(item.id, item.quantity - 1, event.currentTarget)}>
                    <Icon name="minus" />
                  </Button>
                  <output className="quantity" aria-label={tf(locale, 'cartQuantityAria', { name: item.name, count: item.quantity })}>
                    {item.quantity.toLocaleString(locale === 'ar' ? 'ar-AE' : 'en-AE')}
                  </output>
                  <Button type="button" size="icon" variant="ghost" aria-label={tf(locale, 'cartIncreaseAria', { name: item.name })}
                    disabled={item.quantity >= 999} aria-disabled={pending || undefined} onClick={event => change(item.id, item.quantity + 1, event.currentTarget)}>
                    <Icon name="plus" />
                  </Button>
                </div>}
                <div className={`cart-line-total ${styles.lineTotal}`}>
                  <span>{t(locale, 'cartLineSubtotal')}</span>
                  {item.lineTotalMinor === null ? t(locale, 'cartUnavailable') : <CurrencyAmount value={item.lineTotalMinor / 100} locale={locale} />}
                </div>
              </div>
            </li>)}
          </ul>
          {!checkout && snapshot.items.every(item => item.reminderEligible) ? <ReminderSignup locale={locale} items={snapshot.lines} /> : null}
        </section>
        <aside className={`cart-summary ${styles.summary}`} aria-labelledby="cart-summary-heading">
          <h2 id="cart-summary-heading">{t(locale, 'cartOrderSummary')}</h2>
          <dl>
            <dt>{t(locale, 'cartEstimatedSubtotal')}</dt>
            <dd className={`cart-subtotal ${styles.subtotal}`}>{snapshot.subtotalMinor === null
              ? t(locale, 'cartUnavailable')
              : <CurrencyAmount value={snapshot.subtotalMinor / 100} locale={locale} />}</dd>
            <dt>{t(locale, 'cartDeliveryRow')}</dt><dd>{t(locale, canOrder ? 'cartAtCheckout' : 'cartDeliveryNotQuoted')}</dd>
          </dl>
          <p className={styles.summaryNote}>{t(locale, canOrder ? 'cartEstimateScope' : 'cartEstimateUnavailableScope')}</p>
          {!canOrder ? <p className={styles.orderingStatus}>{t(locale, 'cartOrderingUnavailable')}</p> : null}
          {checkout ? <Button asChild size="sm" variant="outline"><Link href="/cart">{t(locale, 'cartEditCart')}</Link></Button>
            : <CartAction locale={locale} canOrder={canOrder} subtotalMinor={snapshot.subtotalMinor} />}
          <div className={styles.summaryLinks}>
            <Link href="/products">{t(locale, 'cartContinueShopping')}</Link>
            <Link href="/contact">{t(locale, 'cartContactPharmacy')}</Link>
          </div>
        </aside>
      </div>
    </>}
    {recommendationsForCart.length ? <section className={styles.recommendations}>
      <h2>{t(locale, 'cartExploreMore')}</h2>
      <div className={styles.recommendationGrid}>
        {recommendationsForCart.map(product => <div key={product.id}>{product.card}</div>)}
      </div>
    </section> : null}
  </div>;
}

function CartAction({ locale, canOrder, subtotalMinor }: { locale: Locale; canOrder: boolean; subtotalMinor: number | null }) {
  const dock = useFixedDockClearance('--cart-dock-clearance');

  return <div ref={dock} className={`cart-mobile-bar ${styles.action}`}>
    <div className={styles.dockAmount} aria-hidden="true">
      <span>{t(locale, 'cartEstimatedSubtotal')}</span>
      <strong>{subtotalMinor === null ? t(locale, 'cartUnavailable') : <CurrencyAmount value={subtotalMinor / 100} locale={locale} />}</strong>
    </div>
    <Button asChild size="sm" variant={canOrder ? 'default' : 'outline'}>
      <Link href="/checkout" data-cart-next>{t(locale, canOrder ? 'cartProceed' : 'cartOrderingInfo')}<Icon name="arrow" /></Link>
    </Button>
  </div>;
}
