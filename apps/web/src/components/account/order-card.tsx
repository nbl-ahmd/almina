'use client';
import { useAccountCopy } from '../account-locale';
import Link from '../app-link';
import { CurrencyAmount } from '../currency-amount';
import { ChevronRightIcon, StarIcon } from '../storefront-icons';
import { canReorder, canReview, orderDate, type AccountOrder } from '../../lib/account/orders';
import { BuyAgain, OrderStatusBadge, OrderThumb } from './order-parts';
import type { OrderProduct } from './use-order-products';

/** One past order (Flipkart / Swiggy order lists): status first, what was bought, the total, then the two next actions. */
export function OrderCard({ order, products, cloudName }: { order: AccountOrder; products: Map<string, OrderProduct>; cloudName?: string | undefined }) {
  const { a, locale } = useAccountCopy();
  const lines = order.totals.lines, shown = lines.slice(0, 2), more = lines.length - shown.length;
  const href = `/account/orders/${order.orderId}`;
  const unrated = canReview(order) && lines.some(line => !order.reviews?.some(review => review.productId === line.productId));
  return <article className="order-card" aria-labelledby={`order-${order.orderId}`}>
    <div className="order-card-head">
      <OrderStatusBadge order={order} />
      <span className="order-card-date">{orderDate(order.createdAt, locale, true)}</span>
    </div>
    <Link href={href} className="order-card-main">
      <OrderThumb id={lines[0]?.productId ?? ''} products={products} cloudName={cloudName} size={64} />
      <span className="order-card-text">
        <strong id={`order-${order.orderId}`}>{a('Order')} <bdi>{order.orderId}</bdi>{order.channel === 'wholesale' ? ` · ${a('Wholesale')}` : ''}</strong>
        {shown.map(line => <span key={line.productId} className="order-card-line"><span className="order-qty">{line.quantity}×</span><bdi>{line.name}</bdi></span>)}
        {more > 0 ? <span className="order-card-more">{locale === 'ar' ? `و${more} أخرى` : `+ ${more} more`}</span> : null}
        <span className="order-card-total">{a('Total')} <CurrencyAmount value={order.totals.totalMinor / 100} locale={locale} /></span>
      </span>
      <ChevronRightIcon className="order-card-chevron rtl:rotate-180" aria-hidden="true" />
    </Link>
    {unrated || canReorder(order) ? <div className="order-card-actions">
      {unrated ? <Link className="order-rate-link" href={href + '#items'}><StarIcon aria-hidden="true" />{a('Rate your products')}</Link> : null}
      {canReorder(order) ? <BuyAgain order={order} /> : null}
    </div> : null}
  </article>;
}
