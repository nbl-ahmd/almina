'use client';
import { useAccountCopy } from "./account-locale";
import { Button } from './ui/button';
import { CurrencyAmount } from './currency-amount';
import { StorefrontIntro } from './storefront-intro';
import { Icon } from './icon';
import styles from './storefront-information.module.css';
import { Checkbox } from './ui/checkbox';
import { Field, FieldLabel } from './ui/field';

import Link from './app-link';
import { resetSavedAccount,loadSavedAccount } from '../lib/catalog/saved-account';
import { CustomerRewards } from './customer-rewards';
import { CustomerAddressBook } from './customer-address-book';
import { CustomerReminders } from './customer-reminders';
import { CustomerSignIn, accountRequest, AccountRequestError } from './customer-sign-in';
import { useEffect,useRef,useState } from 'react';
import { checkAddition } from '../app/(storefront)/cart/actions';
import { storedCart,saveCart } from '../lib/catalog/browser-cart';
type Customer={id:string;email:string;marketingEmail?:boolean;marketingWhatsapp?:boolean};
type Order={channel?:'wholesale';orderId:string;status:string;createdAt:string;totals:{totalMinor:number;lines:{productId:string;name:string;quantity:number}[]}};
function BuyAgain({order}:{order:Order}){
 const {a}=useAccountCopy();
const [busy,setBusy]=useState(false),[message,setMessage]=useState('');async function add(){setBusy(true);try{const before=storedCart(),available:{id:string;quantity:number}[]=[];for(const item of order.totals.lines.slice(0,30)){const current=before.find(line=>line.id===item.productId)?.quantity??0;if(!await checkAddition(item.productId,current+item.quantity))available.push({id:item.productId,quantity:current+item.quantity});}if(JSON.stringify(before)!==JSON.stringify(storedCart()))throw new Error('Your cart changed. Please try again.');saveCart([...before.filter(line=>!available.some(item=>item.id===line.id)),...available]);setMessage(`${available.length} available items added. Unavailable products were skipped. Current prices apply at checkout.`);}catch{setMessage('Unable to add these items. Please try again.');}finally{setBusy(false);}}return <><Button variant="outline" size="default" type="button" className="mt-3" disabled={busy} onClick={()=>void add()}>{busy?a("Checking stock…"):a("Buy available items again")}</Button><p role="status" className="mt-2 mb-0 text-xs text-muted">{a(message)}</p></>;}
export function CustomerAccount({nonce}:{nonce?:string|undefined}){
 const {a, locale}=useAccountCopy();

const [user,setUser]=useState<Customer|null>(null),[orders,setOrders]=useState<Order[]>([]),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[loadFailed,setLoadFailed]=useState(false),[ordersFailed,setOrdersFailed]=useState(false);
const generation=useRef(0);
async function refresh(){
  const current=++generation.current;
  const me=await accountRequest('me') as Customer;if(current!==generation.current)return;
  setUser(me);setOrders([]);setOrdersFailed(false);setLoadFailed(false);resetSavedAccount();void loadSavedAccount();
  try{const rows=await accountRequest('orders') as Order[];if(current===generation.current)setOrders(rows);}catch{if(current===generation.current){setOrdersFailed(true);setMessage('Your account is signed in, but orders could not load. Please refresh to try again.');}}
}
useEffect(()=>{let active=true;const current=++generation.current;void accountRequest('me').then(async value=>{if(!active||current!==generation.current)return;setUser(value as Customer);try{const rows=await accountRequest('orders') as Order[];if(active&&current===generation.current)setOrders(rows);}catch{if(active&&current===generation.current){setOrdersFailed(true);setMessage('Orders could not load. Please refresh to try again.');}}}).catch(error=>{if(active&&current===generation.current&&!(error instanceof AccountRequestError&&error.status===401))setLoadFailed(true);}).finally(()=>{if(active&&current===generation.current)setLoading(false);});return()=>{active=false;};},[]);
  if (loading) return <p role="status" className={`${styles.panel} ${styles.state} mx-auto`}>{a("Loading your account…")}</p>;
  if (loadFailed) return <section className={`${styles.panel} ${styles.state} mx-auto`}>
    <StorefrontIntro title={a("We could not load your account")} description={a("Your connection may have been interrupted. Please try again.")} />
    <div className={styles.actions}>
      <Button variant="outline" size="sm" type="button" onClick={() => window.location.reload()}>{a("Try again")}</Button>
      <Button asChild variant="ghost" size="sm"><Link href="/checkout">{a("Guest checkout")}</Link></Button>
    </div>
  </section>;
  if (!user) return <div className={styles.signIn}><CustomerSignIn nonce={nonce} onSignedIn={refresh} /></div>;

  return <div className={styles.account}>
    <StorefrontIntro title={a("Your Al Mina account")} description={a("Your purchases, preferences and everyday essentials.")} />
    {message ? <p role="status" className={styles.panel}>{a(message)}</p> : null}
    <div className={`${styles.panel} ${styles.identity}`}>
      <p>{a("Signed in as ")}<bdi>{user.email}</bdi></p>
      <div className={styles.actions}>
        <Button asChild variant="outline" size="sm"><Link href="/saved">{a("Saved products")}<Icon name="arrow" /></Link></Button>
        <Button asChild variant="ghost" size="sm"><Link href="/products">{a("Keep shopping")}</Link></Button>
        <Button variant="ghost" size="sm" type="button" disabled={busy} onClick={() => {
          generation.current++;
          setBusy(true);
          void accountRequest('logout', {}).then(() => {
            setUser(null);
            setOrders([]);
            resetSavedAccount();
          }).catch(error => setMessage(error.message)).finally(() => setBusy(false));
        }}>{a("Sign out")}</Button>
      </div>
    </div>
    <section aria-labelledby="account-purchases">
      <h2 id="account-purchases">{a("Buy again")}</h2>
      {ordersFailed ? <p className="m-0 text-sm text-muted">{a("Your purchase history is temporarily unavailable. Your account is still signed in.")}</p>
        : orders.length ? <div className="grid gap-3 md:grid-cols-2">
          {orders.map(order => <article className="min-w-0 rounded-xl bg-subtle p-4" key={order.orderId}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="m-0 text-base"><bdi>{order.orderId}</bdi></h3>
              <span className="text-xs text-muted">{order.channel === 'wholesale' ? a("Wholesale · ") : ''}{a(order.status)}</span>
            </div>
            <ul className="m-0 space-y-2 ps-4 text-sm">{order.totals.lines.map(line => <li key={line.productId}><bdi>{line.name}</bdi> × {line.quantity}</li>)}</ul>
            <p className="mt-3 mb-0 text-sm font-medium"><CurrencyAmount value={order.totals.totalMinor / 100} locale={locale} />{a(" · Original order total")}</p>
            {order.channel !== 'wholesale' && !['cancelled', 'refunded'].includes(order.status) ? <BuyAgain order={order} /> : null}
          </article>)}
        </div> : <p className="m-0 text-sm text-muted">{a("No matching online orders yet. Purchases made using your verified email will appear here.")}</p>}
    </section>
    <CustomerAddressBook />
    <section aria-labelledby="account-preferences">
      <h2 id="account-preferences">{a("Your communication preferences")}</h2>
      <p className="text-sm text-muted">{a("Optional email offers are separate from essential order updates. You can change your choice at any time.")}</p>
      <Field orientation="horizontal" className="min-h-11">
        <Checkbox id="customer-account-field-1" className="w-5" checked={user.marketingEmail === true} onCheckedChange={event => {
          const checked = event === true;
          void accountRequest('preferences', { marketingEmail: checked, marketingWhatsapp: user.marketingWhatsapp === true })
            .then(() => setUser(current => current?.id === user.id ? { ...current, marketingEmail: checked } : current))
            .catch(error => setMessage(error.message));
        }} />
        <FieldLabel htmlFor="customer-account-field-1" className="min-h-11 flex-1 cursor-pointer">{a("Email me eligible Al Mina offers and product updates")}</FieldLabel>
      </Field>
    </section>
    <CustomerRewards />
    <CustomerReminders />
  </div>;
}
