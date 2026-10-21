import Link from 'next/link';
import Image from 'next/image';
import localFont from 'next/font/local';
import type { ReactNode } from 'react';
import '../../(storefront)/storefront.css';
const font=localFont({src:'../../fonts/Geist-Variable.ttf',weight:'400 700',display:'swap'});
export const metadata={title:'Al Mina Business Portal',robots:{index:false,follow:false}};
export default function WholesaleLayout({children}:{children:ReactNode}){return <div className={`storefront-shell min-h-dvh bg-page text-ink ${font.className}`}><header className="border-b border-border bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4"><Link href="/wholesale" aria-label="Al Mina Business Portal"><Image src="/logo.png" alt="Al Mina Pharmacy" priority width={2789} height={910} className="h-auto w-28" /></Link><span className="text-sm font-semibold">Business portal</span><Link className="text-sm text-muted" href="/contact">Contact pharmacy</Link></div></header><main className="mx-auto max-w-6xl px-4 py-6 md:py-10">{children}</main></div>;}
