'use client';
import { useState } from 'react';
import { useAccountCopy } from '../account-locale';
import Link from '../app-link';
import { Button } from '../ui/button';
import { CurrencyAmount } from '../currency-amount';
import { ArrowLeftIcon, ChatBubbleLeftRightIcon, ChevronRightIcon, StarIcon } from '../storefront-icons';
import { canReorder, canReview, itemCount, orderDate, orderState, orderSteps, paymentLabels, ratingLabels, reviewStateLabels } from '../../lib/account/orders';
import { AccountGate, useAccountSession, type AccountState } from './account-session';
import { BuyAgain, OrderStatusBadge, OrderThumb } from './order-parts';
import { ReviewDialog, type ReviewTarget } from './review-dialog';
import { useOrderProducts } from './use-order-products';

function Detail({ orderId, orders, ordersFailed, setOrders, user, cloudName }: AccountState & { orderId: string; cloudName?: string | undefined }) {
  const { a, locale } = useAccountCopy();
  const [reviewing, setReviewing] = useState<ReviewTarget | null>(null), [sent, setSent] = useState(false);
  const order = orders?.find(item => item.orderId === orderId);
  const products = useOrderProducts(order ? [order] : []);
  const back = <Link href="/account/orders" className="account-back"><ArrowLeftIcon className="size-4 rtl:rotate-180" aria-hidden="true" />{a('My orders')}</Link>;
  if (ordersFailed) return <div className="account-column">{back}<div role="alert" className="account-card"><p className="m-0 text-sm">{a('Your purchase history is temporarily unavailable. Your account is still signed in.')}</p><Button variant="outline" type="button" className="mt-3" onClick={() => window.location.reload()}>{a('Try again')}</Button></div></div>;
  if (orders === null) return <div className="account-column">{back}<div role="status" className="account-card text-sm">{a('Loading your orders…')}</div></div>;
  if (!order) return <div className="account-column">{back}<div className="account-card"><h1 className="account-title">{a('Order not found')}</h1><p className="text-sm">{a('We could not find this order among the recent online orders for ')}<bdi>{user.email}</bdi></p><Link className="button text-sm" href="/contact">{a('Contact the pharmacy')}</Link></div></div>;
  const state = orderState(order), steps = orderSteps(order), reviewable = canReview(order);
  const items = order.totals.lines.every(line => line.lineTotalMinor !== undefined) ? order.totals.lines.reduce((sum, line) => sum + line.lineTotalMinor!, 0) : null;
  return <div className="account-column">
    {back}
    <h1 className="account-title">{a('Order')} <bdi>{order.orderId}</bdi></h1>
    <p className="account-subtitle">{order.channel === 'wholesale' ? `${a('Wholesale')} · ` : ''}{a('Placed ')}{orderDate(order.createdAt, locale, true)}</p>

    <section className="account-card" aria-labelledby="order-progress">
      <h2 id="order-progress" className="sr-only">{a('Order status')}</h2>
      <OrderStatusBadge order={order} />
      <p className="m-0 text-sm">{a(state.note)}</p>
      {steps.length ? <ol className="order-steps">{steps.map(step => <li key={step.status} data-state={step.state} aria-current={step.state === 'current' ? 'step' : undefined}>
        <span className="order-step-label">{a(step.label)}</span>
        {step.at ? <span className="order-step-time">{orderDate(step.at, locale, true)}</span> : null}
        {step.state === 'upcoming' ? <span className="sr-only">{a('Not yet')}</span> : null}
      </li>)}</ol> : null}
    </section>

    <section id="items" className="account-card scroll-mt-24" aria-labelledby="order-items">
      <h2 id="order-items" tabIndex={-1} className="account-heading">{locale === 'ar' ? `المنتجات (${itemCount(order)})` : `Items (${itemCount(order)})`}</h2>
      {sent ? <p role="status" className="order-review-sent">{a('Thank you. Your review is awaiting moderation before it appears on the product page.')}</p> : null}
      <ul className="order-items">{order.totals.lines.map(line => {
        const review = order.reviews?.find(item => item.productId === line.productId), href = products.get(line.productId)?.href;
        return <li key={line.productId}>
          <OrderThumb id={line.productId} products={products} cloudName={cloudName} />
          <div className="order-item-text">
            {href ? <Link href={href}><bdi>{line.name}</bdi></Link> : <span><bdi>{line.name}</bdi></span>}
            {line.variantLabel ? <small><bdi>{line.variantLabel}</bdi></small> : null}
            <small>{locale === 'ar' ? `الكمية ${line.quantity}` : `Qty ${line.quantity}`}</small>
          </div>
          {line.lineTotalMinor !== undefined ? <strong className="order-item-amount"><CurrencyAmount value={line.lineTotalMinor / 100} locale={locale} /></strong> : null}
          {review ? <div className="order-item-review">
            <span className="order-your-rating"><StarIcon aria-hidden="true" weight="fill" />{locale === 'ar' ? `تقييمك ${review.rating} من 5` : `You rated ${review.rating} out of 5`}</span>
            <small>{a(reviewStateLabels[review.moderation])}</small>
          </div> : reviewable ? <div className="order-item-review">
            <span aria-hidden="true">{a('Rate this product')}</span>
            <span className="order-rate-stars" role="group" aria-label={locale === 'ar' ? `قيّم ${line.name}` : `Rate ${line.name}`}>{ratingLabels.map((label, index) => <button key={label} type="button" aria-label={locale === 'ar' ? `${index + 1} من 5، ${a(label)}` : `${index + 1} out of 5, ${label}`} onClick={() => { setSent(false); setReviewing({ productId: line.productId, name: line.name, orderId: order.orderId, rating: index + 1 }); }}><StarIcon aria-hidden="true" /></button>)}</span>
          </div> : null}
        </li>;
      })}</ul>
    </section>

    <section className="account-card" aria-labelledby="order-bill">
      <h2 id="order-bill" className="account-heading">{a('Bill summary')}</h2>
      <dl className="order-bill">
        {items !== null && order.totals.deliveryFeeMinor !== undefined ? <>
          <div><dt>{a('Items')}</dt><dd><CurrencyAmount value={items / 100} locale={locale} /></dd></div>
          <div><dt>{a('Delivery')}</dt><dd><CurrencyAmount value={order.totals.deliveryFeeMinor / 100} locale={locale} /></dd></div>
        </> : null}
        <div className="order-bill-total"><dt>{a('Original order total')}</dt><dd><CurrencyAmount value={order.totals.totalMinor / 100} locale={locale} /></dd></div>
        {order.totals.discountMinor ? <div className="order-bill-saving"><dt>{a('You saved')}</dt><dd><CurrencyAmount value={order.totals.discountMinor / 100} locale={locale} /></dd></div> : null}
        {order.paymentMethod ? <div><dt>{a('Payment')}</dt><dd>{a(paymentLabels[order.paymentMethod])}</dd></div> : null}
      </dl>
      {canReorder(order) ? <BuyAgain order={order} /> : null}
    </section>

    <Link href="/contact" className="account-card account-help-row">
      <ChatBubbleLeftRightIcon aria-hidden="true" />
      <span><strong>{a('Need help with this order?')}</strong><small>{a('Contact the pharmacy with your order number.')}</small></span>
      <ChevronRightIcon className="rtl:rotate-180" aria-hidden="true" />
    </Link>

    {reviewing ? <ReviewDialog key={reviewing.productId} target={reviewing} thumb={<OrderThumb id={reviewing.productId} products={products} cloudName={cloudName} />} onClose={() => setReviewing(null)} onSubmitted={rating => {
      const productId = reviewing.productId;
      // The shopper reviews a product once, so every order showing it now carries the same rating.
      setOrders(current => current?.map(item => item.totals.lines.some(line => line.productId === productId) ? { ...item, reviews: [...(item.reviews ?? []).filter(review => review.productId !== productId), { productId, rating, moderation: 'pending' as const }] } : item) ?? current);
      setReviewing(null); setSent(true);
    }} /> : null}
  </div>;
}
export function OrderDetailScreen({ orderId, nonce, cloudName }: { orderId: string; nonce?: string | undefined; cloudName?: string | undefined }) {
  const { account, ...session } = useAccountSession();
  return account ? <Detail key={orderId} {...account} orderId={orderId} cloudName={cloudName} /> : <AccountGate {...session} nonce={nonce} />;
}
