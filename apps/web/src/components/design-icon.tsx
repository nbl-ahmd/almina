import { Icon, type IconName } from './icon';
export type DesignIconName = 'pin' | 'search' | 'shop' | 'bag' | 'add' | 'arrow' | 'phone' | 'home' | 'grid' | 'plus' | 'back';

const family: Record<DesignIconName, IconName> = {
  pin: 'pin', search: 'search', shop: 'shop', bag: 'bag', add: 'bag',
  arrow: 'arrow', phone: 'phone', home: 'home', grid: 'grid', plus: 'plus', back: 'back',
};
/** Reference layouts use the same project-owned stroke family as the rest of the storefront. */
export function DesignIcon({ name }: { name: DesignIconName }) {
  return <span className="design-icon inline-flex shrink-0 items-center justify-center" aria-hidden="true"><Icon name={family[name]} /></span>;
}
