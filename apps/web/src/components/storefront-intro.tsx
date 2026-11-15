import type { ReactNode } from 'react';
/** Route identity is content, never a catalogue photo or a promotional claim. */
export function StorefrontIntro({ title, description, children }: { title: string; description: string; artwork?: 'skin' | 'family' | 'care' | 'none'; children?: ReactNode }) {
 return <div className="storefront-intro"><div><h1>{title}</h1><p>{description}</p></div>{children ? <div className="storefront-intro-meta">{children}</div> : null}</div>;
}
