'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from '../app-link';
import { Button } from '../ui/button';
import { useAccountCopy } from '../account-locale';
import { CustomerSignIn, accountRequest, AccountRequestError } from '../customer-sign-in';
import { resetSavedAccount, loadSavedAccount } from '../../lib/catalog/saved-account';
import type { AccountOrder } from '../../lib/account/orders';

export type Customer = { id: string; email: string; marketingEmail?: boolean; marketingWhatsapp?: boolean };
export type AccountState = {
  user: Customer; setUser: (update: (current: Customer | null) => Customer | null) => void;
  /** null while loading. */
  orders: AccountOrder[] | null; ordersFailed: boolean;
  setOrders: (update: (current: AccountOrder[] | null) => AccountOrder[] | null) => void;
  signOut: () => void; busy: boolean; message: string; setMessage: (value: string) => void;
};

/** Shared by every account screen: reads the session and loads the shopper's orders. An order outage never signs the shopper
 *  out, and a late response never repopulates a signed-out screen. Render AccountGate while `account` is null. */
export function useAccountSession() {
  const [user, setUser] = useState<Customer | null>(null), [orders, setOrders] = useState<AccountOrder[] | null>(null);
  const [loading, setLoading] = useState(true), [loadFailed, setLoadFailed] = useState(false), [ordersFailed, setOrdersFailed] = useState(false);
  const [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  const generation = useRef(0);

  const loadOrders = useCallback(async (current: number) => {
    try { const rows = await accountRequest('orders') as AccountOrder[]; if (current === generation.current) setOrders(rows); }
    catch { if (current === generation.current) { setOrders([]); setOrdersFailed(true); } }
  }, []);

  async function signedIn() {
    const current = ++generation.current;
    const me = await accountRequest('me') as Customer; if (current !== generation.current) return;
    setUser(me); setOrders(null); setOrdersFailed(false); setLoadFailed(false); setMessage(''); resetSavedAccount(); void loadSavedAccount();
    await loadOrders(current);
  }
  useEffect(() => {
    let active = true; const current = ++generation.current;
    void accountRequest('me').then(async value => {
      if (!active || current !== generation.current) return;
      setUser(value as Customer); setLoading(false);
      await loadOrders(current);
    }).catch(error => { if (active && current === generation.current && !(error instanceof AccountRequestError && error.status === 401)) setLoadFailed(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [loadOrders]);

  function signOut() {
    generation.current++; setBusy(true);
    void accountRequest('logout', {}).then(() => { setUser(null); setOrders(null); resetSavedAccount(); })
      .catch(error => setMessage(error.message)).finally(() => setBusy(false));
  }

  const account: AccountState | null = !loading && !loadFailed && user ? { user, setUser, orders, setOrders, ordersFailed, signOut, busy, message, setMessage } : null;
  return { account, loading, loadFailed, signedIn };
}

/** Loading, outage and sign-in states shown before an account screen. */
export function AccountGate({ loading, loadFailed, signedIn, nonce }: Pick<ReturnType<typeof useAccountSession>, 'loading' | 'loadFailed' | 'signedIn'> & { nonce?: string | undefined }) {
  const { a } = useAccountCopy();
  if (loading) return <div role="status" className="account-card mx-auto max-w-3xl text-sm">{a('Loading your account…')}</div>;
  if (loadFailed) return <div className="account-card mx-auto max-w-xl"><h1 className="text-2xl">{a('We could not load your account')}</h1><p className="text-sm">{a('Your connection may have been interrupted. Please try again.')}</p><Button variant="outline" size="default" type="button" onClick={() => window.location.reload()}>{a('Try again')}</Button><Link href="/checkout" className="ms-4 text-sm">{a('Guest checkout')}</Link></div>;
  return <CustomerSignIn nonce={nonce} onSignedIn={signedIn} />;
}
