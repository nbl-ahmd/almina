import type { ReactNode } from 'react';
export type IconName = 'home' | 'grid' | 'search' | 'bag' | 'tag' | 'arrow' | 'check' | 'leaf' | 'plus' | 'minus';
const paths: Record<IconName, ReactNode> = {
  plus: <path d="M5 12h14M12 5v14" />,
  minus: <path d="M5 12h14" />,
  home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" /></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
  bag: <><path d="M5 7h14l2 14H3L5 7Z" /><path d="M8 8V6a4 4 0 0 1 8 0v2" /></>,
  tag: <><path d="M3 3h8l10 10-8 8L3 11V3Z" /><circle cx="7.5" cy="7.5" r=".5" /></>,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,
  leaf: <><path d="M20 3C8 2 2 8 5 16c8 5 16-1 15-13Z" /><path d="m4 21 11-11" /></>,
};
/** One project-owned stroke icon family; icons supplement visible text. */
export function Icon({ name }: { name: IconName }) {
  return <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{paths[name]}</svg>;
}
