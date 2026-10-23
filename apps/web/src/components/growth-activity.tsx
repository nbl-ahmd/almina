'use client';
import {useEffect,useRef,type ReactNode} from 'react';
import {recordCommerceEvent} from '../lib/telemetry/browser';
export function GrowthActivity({kind,matched=false,campaign,children}:{kind:'search'|'product'|'campaign';matched?:boolean;campaign?:string|undefined;children?:ReactNode}){
 const sent=useRef(false);
 useEffect(()=>{const timer=setTimeout(()=>{if(sent.current)return;sent.current=true;if(kind==='search'){recordCommerceEvent('search_performed');if(matched)recordCommerceEvent('search_matched');}else if(kind==='product')recordCommerceEvent('product_viewed');else if(campaign)recordCommerceEvent('campaign_viewed',campaign);},0);return()=>clearTimeout(timer);},[kind,matched,campaign]);
 return children?<div onClick={event=>{if(kind==='campaign'&&campaign&&event.target instanceof Element&&event.target.closest('a,button'))recordCommerceEvent('campaign_clicked',campaign);}}>{children}</div>:null;
}
