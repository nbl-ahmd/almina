import Image from 'next/image';
import Link from './app-link';
import { Icon } from './icon';
export function PharmacyHelp({ compact = false }: { compact?: boolean }) {
  return <section className={`pharmacy-help rounded-xl border border-border bg-surface p-4 shadow-sm ${compact ? '' : 'md:grid md:grid-cols-[200px_minmax(0,1fr)] md:gap-8 md:bg-ocean md:p-8 md:text-white'}`}>
    <div className="flex items-center gap-3 md:flex-col md:items-start"><div className="flex h-14 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-white p-2"><Image className="h-auto max-h-full w-full object-contain" src="/logo.png" alt="" width={2789} height={910} sizes="94px" /></div><div><h2 className="mb-1 text-base font-bold">Al Mina Pharmacy</h2><span className={`text-xs ${compact ? 'text-ocean' : 'text-ocean md:text-white'}`}>Ras Al Khaimah, UAE</span></div></div>
    <div><p className={`mt-3 mb-4 text-sm leading-relaxed ${compact ? 'text-muted' : 'text-muted md:mt-0 md:text-white'}`}>For product, delivery or order enquiries, get in touch with your neighbourhood pharmacy.</p><div className="flex gap-2 border-t border-border pt-3"><Link className="button button-secondary min-h-11 flex-1 rounded-lg border-border bg-subtle px-3 py-2 text-xs font-semibold text-teal md:flex-none" href="/contact"><Icon name="phone" />Contact pharmacy</Link><a className="button button-secondary min-h-11 flex-1 rounded-lg border-border bg-subtle px-3 py-2 text-xs font-semibold text-ocean md:flex-none" href="tel:+971504825007"><Icon name="phone" />Call pharmacy</a></div></div>
  </section>;
}
