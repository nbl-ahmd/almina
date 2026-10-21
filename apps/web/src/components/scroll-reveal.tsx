"use client";
import { useRef, type ReactNode } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/** Editorial enhancement only: commerce controls and product shelves remain static. */
export function ScrollReveal({children}:{children:ReactNode}) {
 const root=useRef<HTMLDivElement>(null);
 useGSAP(()=>{
  gsap.registerPlugin(ScrollTrigger);
  const media=gsap.matchMedia();
  media.add('(prefers-reduced-motion: no-preference)',()=>{
   const cards=gsap.utils.toArray<HTMLElement>('[data-editorial-stack]',root.current);
   cards.forEach((card,index)=>gsap.fromTo(card,{y:Math.min(index*5,20)},{y:0,ease:'none',scrollTrigger:{trigger:card,start:'top 95%',end:'top 65%',scrub:0.3}}));
   gsap.utils.toArray<HTMLElement>('[data-reveal-text]',root.current).forEach(text=>{
    gsap.fromTo(text,{opacity:0.75},{opacity:1,ease:'none',scrollTrigger:{trigger:text,start:'top 90%',end:'top 65%',scrub:0.25}});
   });
  });
  return()=>media.revert();
 },{scope:root});
 return <div ref={root} className="contents">{children}</div>;
}
