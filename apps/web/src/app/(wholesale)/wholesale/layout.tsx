import { getLocale } from '../../../lib/server/i18n';
import Link from '../../../components/app-link';
import Image from 'next/image';
import localFont from 'next/font/local';
import type { ReactNode } from 'react';
import '../../(storefront)/storefront.css';
const font=localFont({src:'../../fonts/Geist-Variable.ttf',weight:'400 700',display:'swap'});
export async function generateMetadata(){return {title:await getLocale()==='ar'?'بوابة الميناء للأعمال':'Al Mina Business Portal',robots:{index:false,follow:false}};}
export default async function WholesaleLayout({children}:{children:ReactNode}){const locale=await getLocale(),ar=locale==='ar';return <div lang={locale} dir={ar?'rtl':'ltr'} style={ar?{fontFamily:'Arial, Tahoma, sans-serif'}:undefined} className={`storefront-shell min-h-dvh bg-page text-ink ${font.className}`}><header className="border-b border-border bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4"><Link href="/wholesale" aria-label={ar?'بوابة الميناء للأعمال':'Al Mina Business Portal'}><Image src="/logo.png" alt="Al Mina Pharmacy" priority width={2789} height={910} className="h-auto w-28" /></Link><span className="text-sm font-semibold">{ar?'بوابة الأعمال':'Business portal'}</span><Link className="text-sm text-muted" href="/contact">{ar?'تواصل مع الصيدلية':'Contact pharmacy'}</Link></div></header><main className="mx-auto max-w-6xl px-4 py-6 md:py-10">{children}</main></div>;}
