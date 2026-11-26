'use client';
import { useState } from 'react';
import { useAccountCopy } from '../account-locale';
import { Button } from '../ui/button';
import { ProductImage } from '../product-image';
import Link from '../app-link';
import { CheckCircleIcon, ClockIcon, ExclamationTriangleIcon, XMarkIcon } from '../storefront-icons';
import { checkAddition } from '../../app/(storefront)/cart/actions';
import { storedCart, saveCart } from '../../lib/catalog/browser-cart';
import { orderState, type AccountOrder } from '../../lib/account/orders';

export function OrderStatusBadge({ order }: { order: AccountOrder }) {
  const { a } = useAccountCopy();
  const state = orderState(order);
  const Icon = state.tone === 'done' ? CheckCircleIcon : state.tone === 'stopped' ? XMarkIcon : state.tone === 'attention' ? ExclamationTriangleIcon : ClockIcon;
  return <span className="order-status" data-tone={state.tone}><Icon aria-hidden="true" weight="fill" />{a(state.label)}</span>;
}

export function OrderThumb({ id, products, cloudName, size = 56 }: { id: string; products: Map<string, { image: string }>; cloudName?: string | undefined; size?: number }) {
  const { locale } = useAccountCopy();
  return <span className="order-thumb" style={{ inlineSize: size, blockSize: size }} aria-hidden="true">
    <ProductImage locale={locale} cloudName={cloudName} src={products.get(id)?.image ?? '/product-placeholder.svg'} alt="" width={size} height={size} sizes={size + 'px'} />
  </span>;
}

/** Adds what is still available to the cart. Quantities are checked against live stock; checkout recalculates every price. */
export function BuyAgain({ order }: { order: AccountOrder }) {
  const { a } = useAccountCopy();
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [added, setAdded] = useState(false);
  async function add() {
    setBusy(true); setAdded(false);
    try {
      const before = storedCart(), available: { id: string; quantity: number }[] = [];
      for (const item of order.totals.lines.slice(0, 30)) {
        const current = before.find(line => line.id === item.productId)?.quantity ?? 0;
        if (!await checkAddition(item.productId, current + item.quantity)) available.push({ id: item.productId, quantity: current + item.quantity });
      }
      if (JSON.stringify(before) !== JSON.stringify(storedCart())) throw new Error('Your cart changed. Please try again.');
      saveCart([...before.filter(line => !available.some(item => item.id === line.id)), ...available]);
      setAdded(available.length > 0);
      setMessage(`${available.length} available items added. Unavailable products were skipped. Current prices apply at checkout.`);
    } catch { setMessage('Unable to add these items. Please try again.'); }
    finally { setBusy(false); }
  }
  return <div className="order-reorder">
    <Button variant="outline" size="default" type="button" disabled={busy} onClick={() => void add()}>{busy ? a('Checking stock…') : a('Buy available items again')}</Button>
    <p role="status" className="m-0 text-xs">{a(message)}{added ? <> <Link href="/cart" className="font-bold">{a('View cart')}</Link></> : null}</p>
  </div>;
}
