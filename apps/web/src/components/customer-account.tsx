'use client';
import { useAccountCopy } from './account-locale';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Field, FieldLabel } from './ui/field';
import Link from './app-link';
import { CustomerRewards } from './customer-rewards';
import { CustomerAddressBook } from './customer-address-book';
import { CustomerReminders } from './customer-reminders';
import { accountRequest } from './customer-sign-in';
import { ChatBubbleLeftRightIcon, HeartIcon, MapPinIcon, ShoppingBagIcon, ChevronRightIcon } from './storefront-icons';
import { AccountGate, useAccountSession, type AccountState } from './account/account-session';
import { OrderCard } from './account/order-card';
import { useOrderProducts } from './account/use-order-products';

/** Account home (Swiggy / Flipkart account screens): who is signed in, four shortcuts, the latest orders, then saved details. */
function AccountHome({ user, setUser, orders, ordersFailed, signOut, busy, message, setMessage, cloudName }: AccountState & { cloudName?: string | undefined }) {
  const { a } = useAccountCopy();
  const recent = (orders ?? []).slice(0, 3);
  const products = useOrderProducts(recent);
  const tiles = [
    { href: '/account/orders', label: 'Orders', icon: ShoppingBagIcon },
    { href: '/saved', label: 'Saved products', icon: HeartIcon },
    { href: '#addresses', label: 'Addresses', icon: MapPinIcon },
    { href: '/contact', label: 'Help', icon: ChatBubbleLeftRightIcon },
  ];
  return <div className="account-column">
    <header className="account-card account-profile">
      <span className="account-avatar" aria-hidden="true">{user.email.slice(0, 1).toUpperCase()}</span>
      <div className="min-w-0"><h1 className="account-title">{a('Your Al Mina account')}</h1><p className="m-0 break-all text-sm">{a('Signed in as ')}<bdi>{user.email}</bdi></p></div>
    </header>
    {message ? <p role="status" className="account-card text-sm">{a(message)}</p> : null}
    <nav className="account-tiles" aria-label={a('Account shortcuts')}>{tiles.map(tile => { const Icon = tile.icon; const content = <><Icon aria-hidden="true" /><span>{a(tile.label)}</span></>; return tile.href.startsWith('#') ? <a key={tile.href} href={tile.href}>{content}</a> : <Link key={tile.href} href={tile.href}>{content}</Link>; })}</nav>

    <section aria-labelledby="account-orders" className="account-orders">
      <div className="account-section-head"><h2 id="account-orders" className="account-heading">{a('Recent orders')}</h2>{recent.length ? <Link href="/account/orders">{a('View all orders')}<ChevronRightIcon className="size-4 rtl:rotate-180" aria-hidden="true" /></Link> : null}</div>
      {ordersFailed ? <p role="alert" className="account-card m-0 text-sm">{a('Your account is signed in, but orders could not load. Please refresh to try again.')}</p>
        : orders === null ? <p role="status" className="account-card m-0 text-sm">{a('Loading your orders…')}</p>
          : recent.length ? <div className="order-list">{recent.map(order => <OrderCard key={order.orderId} order={order} products={products} cloudName={cloudName} />)}</div>
            : <p className="account-card m-0 text-sm">{a('No matching online orders yet. Purchases made using your verified email will appear here.')}</p>}
    </section>

    <CustomerRewards />
    <div id="addresses" className="scroll-mt-24"><CustomerAddressBook /></div>
    <CustomerReminders />
    <section className="account-card"><h2 className="account-heading">{a('Your communication preferences')}</h2><p className="m-0 text-sm">{a('Optional email offers are separate from essential order updates. You can change your choice at any time.')}</p><Field orientation="horizontal" className="min-h-11"><Checkbox id="customer-account-field-1" className="w-5" checked={user.marketingEmail === true} onCheckedChange={event => { const checked = (event === true); void accountRequest('preferences', { marketingEmail: checked, marketingWhatsapp: user.marketingWhatsapp === true }).then(() => setUser(current => current?.id === user.id ? { ...current, marketingEmail: checked } : current)).catch(error => setMessage(error.message)); }} /><FieldLabel htmlFor="customer-account-field-1" className="min-h-11 flex-1 cursor-pointer">{a('Email me eligible Al Mina offers and product updates')}</FieldLabel></Field></section>
    <Link className="button button-secondary text-sm" href="/products">{a('Keep shopping')}</Link>
    <Button variant="outline" size="default" type="button" className="account-signout" disabled={busy} onClick={signOut}>{a('Sign out')}</Button>
  </div>;
}
export function CustomerAccount({ nonce, cloudName }: { nonce?: string | undefined; cloudName?: string | undefined }) {
  const { account, ...session } = useAccountSession();
  return account ? <AccountHome key={account.user.id} {...account} cloudName={cloudName} /> : <AccountGate {...session} nonce={nonce} />;
}
