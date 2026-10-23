'use client';
import { useAccountCopy } from "../account-locale";
import { useEffect, useState } from 'react';
import { wholesaleBusinessSchema, wholesaleOrdersSchema } from '@almina/contracts';
import type { z } from 'zod';
import { wholesaleRequest } from './request';
import { Button } from '../ui/button';
type Business = z.infer<typeof wholesaleBusinessSchema>;
type Orders = z.infer<typeof wholesaleOrdersSchema>;
export function BusinessAccount({ onDelivery }: { onDelivery: (business: Business) => void }) {
 const {a,locale}=useAccountCopy();

 const [business,setBusiness] = useState<Business|null>(null), [orders,setOrders] = useState<Orders|null>(null);
 const [message,setMessage] = useState(''), [busy,setBusy] = useState(false);
 const [attempt,setAttempt] = useState(0);
 useEffect(()=>{let active=true;void Promise.all([wholesaleRequest<Business>('account'),wholesaleRequest<Orders>('orders')]).then(([profile,history])=>{if(active){setBusiness(wholesaleBusinessSchema.parse(profile.data));setOrders(wholesaleOrdersSchema.parse(history.data));setMessage('');}}).catch(()=>{if(active)setMessage('Business details or orders could not load. Try again.');});return()=>{active=false;};},[attempt]);
 async function more(){if(!orders?.nextCursor)return;setBusy(true);try{const result=await wholesaleRequest<Orders>('orders?'+new URLSearchParams({cursor:orders.nextCursor}));const next=wholesaleOrdersSchema.parse(result.data);setOrders(current=>({items:[...(current?.items??[]),...next.items],nextCursor:next.nextCursor}));setMessage('');}catch{setMessage('More orders could not load. Try again.');}finally{setBusy(false);}}
 return <section className="grid gap-7" aria-label={a("Business account")}>
  {message?<div role="status"><p>{a(message)}</p><Button variant="outline" onClick={()=>setAttempt(value=>value+1)}>{a("Try again")}</Button></div>:null}
  {!business&&!message?<p role="status">{a("Loading business account…")}</p>:null}
  {business?<section className="rounded-2xl border border-border bg-white p-5"><h2 className="mb-4 text-xl font-semibold">{a("Your business details")}</h2><dl className="grid gap-4 text-sm sm:grid-cols-2">{[['Business',business.businessName],['Business type',business.typeName],['Contact',business.contactName],['Phone',business.phone],['Trade licence',business.tradeLicense],['Tax registration number',business.taxRegistrationNumber],['Delivery address',business.deliveryAddress],['Area / emirate',[business.city,business.emirate].filter(Boolean).join(', ')]].map(([label,value])=><div key={a(label)}><dt className="text-muted">{a(label)}</dt><dd className="m-0 mt-1 break-words font-medium">{value||'Not recorded'}</dd></div>)}</dl><p className="mt-5 text-sm text-muted">{a("Contact the pharmacy to update verified business details or catalogue access.")}</p><Button variant="outline" onClick={()=>onDelivery(business)}>{a("Use business delivery details")}</Button></section>:null}
  <section><h2 className="mb-4 text-xl font-semibold">{a("Wholesale order history")}</h2><p className="text-sm text-muted">{a("Recorded prices and totals from your business orders. Contact the pharmacy with the order number for fulfilment updates.")}</p>{orders?.items.length?<div className="grid gap-4 md:grid-cols-2">{orders.items.map(order=><article key={order.orderId} className="rounded-2xl border border-border bg-white p-5"><div className="mb-3 flex flex-wrap justify-between gap-2"><h3 className="m-0 text-base font-semibold">{order.orderId}</h3><span className="text-sm capitalize">{a(order.status)}</span></div><p className="text-xs text-muted">{new Date(order.createdAt).toLocaleDateString(locale==='ar'?'ar-AE':'en-AE',{timeZone:'Asia/Dubai'})}</p><ul className="pl-4 text-sm">{order.totals.lines.map(line=><li key={line.productId}>{line.name} × {line.quantity}{a(" · AED ")}{(line.lineTotalMinor/100).toFixed(2)}</li>)}</ul><p className="text-sm">{a("Delivery AED ")}{(order.totals.deliveryFeeMinor/100).toFixed(2)}{a(" · VAT ")}{order.totals.vatMode==='inclusive'?a("included"):a("added")}{a(" AED ")}{(order.totals.taxMinor/100).toFixed(2)}</p><p className="mb-0 font-semibold">{a("Total AED ")}{(order.totals.totalMinor/100).toFixed(2)}</p></article>)}</div>:orders?<p className="rounded-xl bg-subtle p-5 text-sm">{a("No wholesale orders yet. Your business purchases will appear here.")}</p>:null}{orders?.nextCursor?<Button className="mt-4" variant="outline" disabled={busy} onClick={()=>void more()}>{busy?a("Loading…"):a("Load older orders")}</Button>:null}</section>
 </section>;
}
