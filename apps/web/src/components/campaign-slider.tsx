"use client";
import { shopText as u } from '../lib/i18n-storefront';
import type { Locale } from '../lib/i18n';
import { useRef, useState, type ReactNode } from "react";

export function CampaignSlider({children,locale='en',label="Product highlights",controlLabel="highlight"}:{children:ReactNode[];locale?:Locale;label?:string;controlLabel?:string}) {
  const [active,setActive]=useState(0);
  const track=useRef<HTMLDivElement>(null);
  function move(index:number){
    const next=Math.max(0,Math.min(children.length-1,index));
    const frame=track.current?.children[next];
    frame?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'nearest',inline:'start'});
  }
  function sync(){
    const node=track.current;if(!node)return;
    const edge=node.getBoundingClientRect();
    const distances=[...node.children].map(child=>{const rect=child.getBoundingClientRect();return Math.abs(locale==='ar'?rect.right-edge.right:rect.left-edge.left);});
    setActive(distances.indexOf(Math.min(...distances)));
  }
  return <div className="campaign-carousel" role="region" aria-roledescription={u(locale,'carousel')} aria-label={label}>
    <div ref={track} className="campaign-track" tabIndex={children.length>1?0:undefined} aria-label={label} onScroll={sync} onKeyDown={event=>{
      if(event.target!==event.currentTarget)return;
      if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();move(active+(event.key==='ArrowRight'?(locale==='ar'?-1:1):(locale==='ar'?1:-1)));}
      if(event.key==='Home'){event.preventDefault();move(0);}if(event.key==='End'){event.preventDefault();move(children.length-1);}
    }}>
      {children.map((child,index)=><div key={index} className="campaign-frame" role="group" aria-roledescription={u(locale,'slide')} aria-label={locale==='en'?`${index+1} of ${children.length}`:`${index+1} من ${children.length}`}>{child}</div>)}
    </div>
    {children.length > 1 && (
      <div className="campaign-pagination flex flex-wrap justify-center" role="group" aria-label={u(locale, 'Choose highlight')}>
        {children.map((_, index) => (
          <button
            key={index}
            data-slot="carousel-indicator"
            type="button"
            className="group grid size-11 min-h-11 shrink-0 place-items-center rounded-lg border-0 bg-transparent p-0"
            aria-label={locale === 'en' ? `Show ${controlLabel} ${index + 1}` : `عرض ${u(locale, controlLabel)} ${index + 1}`}
            aria-pressed={active === index}
            onClick={() => move(index)}
          >
            <span aria-hidden="true" className="h-1 w-2 rounded-full bg-control-border group-hover:bg-teal group-aria-pressed:w-5 group-aria-pressed:bg-teal" />
          </button>
        ))}
      </div>
    )}
  </div>;
}
