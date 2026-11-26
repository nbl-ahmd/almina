'use client';
import { useState } from 'react';
import { useAccountCopy } from '../account-locale';
import Link from '../app-link';
import { Button } from '../ui/button';
import { ArrowLeftIcon, MagnifyingGlassIcon } from '../storefront-icons';
import { filterOrders, orderFilterLabels, orderFilters, type OrderFilter } from '../../lib/account/orders';
import { AccountGate, useAccountSession, type AccountState } from './account-session';
import { OrderCard } from './order-card';
import { useOrderProducts } from './use-order-products';

function Orders({ orders, ordersFailed, user, cloudName }: AccountState & { cloudName?: string | undefined }) {
  const { a } = useAccountCopy();
  const [filter, setFilter] = useState<OrderFilter>('all'), [query, setQuery] = useState('');
  const shown = filterOrders(orders ?? [], filter, query);
  const products = useOrderProducts(shown);
  return <div className="account-column">
    <Link href="/account" className="account-back"><ArrowLeftIcon className="size-4 rtl:rotate-180" aria-hidden="true" />{a('Your account')}</Link>
    <h1 className="account-title">{a('My orders')}</h1>
    {ordersFailed ? <div role="alert" className="account-card"><p className="m-0 text-sm">{a('Your purchase history is temporarily unavailable. Your account is still signed in.')}</p><Button variant="outline" type="button" className="mt-3" onClick={() => window.location.reload()}>{a('Try again')}</Button></div>
      : orders === null ? <div role="status" className="account-card text-sm">{a('Loading your orders…')}</div>
        : !orders.length ? <div className="account-card"><p className="text-sm">{a('No matching online orders yet. Purchases made using your verified email will appear here.')}</p><Link className="button text-sm" href="/products">{a('Keep shopping')}</Link></div>
          : <>
            <label className="order-search"><MagnifyingGlassIcon aria-hidden="true" /><span className="sr-only">{a('Search your orders')}</span><input type="search" value={query} maxLength={80} placeholder={a('Search by product or order number')} onChange={event => setQuery(event.target.value)} /></label>
            <div className="order-filters" role="group" aria-label={a('Filter orders')}>{orderFilters.map(value => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{a(orderFilterLabels[value])}</button>)}</div>
            {shown.length ? <div className="order-list">{shown.map(order => <OrderCard key={order.orderId} order={order} products={products} cloudName={cloudName} />)}</div>
              : <div role="status" className="account-card"><p className="m-0 text-sm">{a('No orders match. Try another search or filter.')}</p></div>}
            <p className="account-footnote">{a('Showing your most recent online orders, up to 30, placed with ')}<bdi>{user.email}</bdi></p>
          </>}
  </div>;
}
export function OrdersScreen({ nonce, cloudName }: { nonce?: string | undefined; cloudName?: string | undefined }) {
  const { account, ...session } = useAccountSession();
  return account ? <Orders {...account} cloudName={cloudName} /> : <AccountGate {...session} nonce={nonce} />;
}
