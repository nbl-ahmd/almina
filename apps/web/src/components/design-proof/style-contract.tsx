"use client";
import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { StorefrontMenu } from '../storefront-menu';
import s from './proof.module.css';
/** A gated diagnostic for real shared controls and portals, not the P2-03 component gallery. */
export function StyleContract({lang}:{lang:'en'|'ar'}) {
 const [added,setAdded]=useState(false);
 return <section className={s.modePanel}>
  <h1>{lang==='ar'?'فحص حدود التنسيق':'Style boundary checks'}</h1>
  <p>Local diagnostic states only. No order, account or provider is simulated.</p>
  <span data-testid="foreground-probe" className="text-primary-foreground">Foreground alias probe</span>
  <div className={s.modeActions}>
   <Button data-testid="primary-utility" className="bg-primary text-primary-foreground">Primary utility</Button>
   <Button data-testid="added-variant" data-added={added} onClick={()=>setAdded(!added)}>Toggle added state</Button>
   <Button data-testid="pending-variant" aria-busy="true" disabled>Checking state</Button>
   <Button data-testid="disabled-variant" disabled>Unavailable state</Button>
   <Button data-testid="ghost-variant" variant="ghost">Ghost action</Button>
   <Button data-testid="outline-variant" variant="outline">Outline action</Button>
   <Button data-testid="secondary-variant" variant="secondary">Secondary action</Button>
   <Button data-testid="link-variant" variant="link">Link action</Button>
  </div>
  <label>Normal field<Input data-testid="normal-field" defaultValue="Synthetic normal value" /></label>
  <label>Invalid field<Input aria-invalid="true" defaultValue="Synthetic invalid value" data-testid="invalid-variant" /></label>
  <div data-testid="desktop-portal"><StorefrontMenu locale={lang} categories={[{name:'Synthetic category',href:'/design-proof/products'}]} /></div>
  <div data-testid="mobile-portal"><StorefrontMenu locale={lang} mobile categories={[{name:'Synthetic category',href:'/design-proof/products'}]} /></div>
 </section>;
}
