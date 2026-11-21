import {
  AdjustmentsHorizontalIcon, ArrowLeftIcon, ArrowRightIcon, CheckCircleIcon,
  HomeIcon, MagnifyingGlassIcon, MapPinIcon, MinusIcon, PhoneIcon, PlusIcon,
  ShoppingCartIcon, XMarkIcon, SparklesIcon, Squares2X2Icon, BuildingStorefrontIcon, TagIcon, TrashIcon,
} from '@heroicons/react/24/outline';
export type IconName = 'home' | 'grid' | 'search' | 'bag' | 'tag' | 'arrow' | 'check' | 'leaf' | 'plus' | 'minus' | 'pin' | 'phone' | 'filter' | 'shop' | 'back' | 'close' | 'trash';
const icons = {
  home: HomeIcon, grid: Squares2X2Icon, search: MagnifyingGlassIcon,
  bag: ShoppingCartIcon, tag: TagIcon, arrow: ArrowRightIcon, check: CheckCircleIcon,
  leaf: SparklesIcon, plus: PlusIcon, minus: MinusIcon, pin: MapPinIcon,
  phone: PhoneIcon, filter: AdjustmentsHorizontalIcon, shop: BuildingStorefrontIcon,
  back: ArrowLeftIcon, close: XMarkIcon, trash: TrashIcon,
};
/** One Heroicons outline family. Icons supplement accessible text or control names. */
export function Icon({ name }: { name: IconName }) {
  const Glyph = icons[name];
  return <Glyph className={`icon size-5 shrink-0${name === 'arrow' || name === 'back' ? ' rtl:rotate-180' : ''}`} aria-hidden="true" focusable="false" />;
}
