'use client';
import {storedCart,saveCart} from '../catalog/browser-cart';
const receiptKey='almina.stripe.paid-carts.v1';
export async function reconcilePaidCart(orderId:string,items:readonly {productId:string;quantity:number}[]){
  const reconcile=()=>{
    const raw=localStorage.getItem(receiptKey),receipts:unknown=raw?JSON.parse(raw):[];
    if(!Array.isArray(receipts)||receipts.some(id=>typeof id!=='string')||receipts.includes(orderId))return;
    const quantities=new Map(items.map(item=>[item.productId,item.quantity]));
    const next=storedCart().map(line=>({...line,quantity:Math.max(0,line.quantity-(quantities.get(line.id)??0))})).filter(line=>line.quantity>0);
    // Record first: a storage failure must not repeatedly remove newly added products.
    localStorage.setItem(receiptKey,JSON.stringify([...receipts.slice(-99),orderId]));saveCart(next);
  };
  if(navigator.locks)await navigator.locks.request('almina-stripe-paid-cart',reconcile);else reconcile();
}
