"use client";
import Link from '../app-link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ComponentType, type ReactNode, type SVGProps } from 'react';
import { Dialog } from 'radix-ui';
import {
  MapPinIcon,  ArrowTopRightOnSquareIcon,
  Bars3Icon,
  BellIcon,
  BuildingStorefrontIcon,
  CameraIcon,
  CpuChipIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  ChatBubbleLeftRightIcon,
  ChevronRightIcon,
  Cog6ToothIcon,
  CubeIcon,
  DocumentArrowUpIcon,
  EllipsisHorizontalIcon,
  PhotoIcon,
  MagnifyingGlassIcon,
  RectangleGroupIcon,
  ClipboardDocumentCheckIcon,
  ShoppingBagIcon,
  Squares2X2Icon,
  TableCellsIcon,
  UsersIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { AlertMonitor } from './alert-monitor';
import { OrderMonitor, SessionControls } from './controls';
import { cn } from './ui';
import { CommandPalette } from './command-palette';
import { Tip, TipProvider } from './kit';

type Icon = ComponentType<SVGProps<SVGSVGElement>>;
type NavItem = { id: string; label: string; href: string; icon: Icon };
type NavGroup = { label: string; items: NavItem[] };

const groups: NavGroup[] = [
  {
    label: 'Today',
    items: [
      { id: 'dashboard', label: 'Dashboard', href: '/admin', icon: Squares2X2Icon },
      { id: 'orders', label: 'Orders', href: '/admin/orders', icon: ShoppingBagIcon },
    ],
  },
  {
    label: 'Catalogue',
    items: [
      { id: 'products', label: 'Products', href: '/admin/products', icon: CubeIcon },
      { id: 'categories', label: 'Categories', href: '/admin/categories', icon: RectangleGroupIcon },
      { id: 'banners', label: 'Banners', href: '/admin/banners', icon: PhotoIcon },
      { id: 'image-review', label: 'Image review', href: '/admin/image-review', icon: CameraIcon },
      { id: 'catalog-import', label: 'Catalog import', href: '/admin/catalog-import', icon: TableCellsIcon },
    ],
  },
  {
    label: 'Customers & growth',
    items: [
      { id: 'growth', label: 'Website & growth', href: '/admin/growth', icon: GlobeAltIcon },
      { id: 'marketing', label: 'Email marketing', href: '/admin/marketing', icon: EnvelopeIcon },
      { id: 'whatsapp', label: 'WhatsApp', href: '/admin/whatsapp', icon: ChatBubbleLeftRightIcon },
      { id: 'search', label: 'Search', href: '/admin/search', icon: MagnifyingGlassIcon },
      { id: 'wholesale', label: 'Wholesale', href: '/admin/wholesale', icon: BuildingStorefrontIcon },
    ],
  },
  {
    label: 'Delivery',
    items: [
      { id: 'branches', label: 'Branches & delivery', href: '/admin/branches', icon: MapPinIcon },
      { id: 'notifications', label: 'Notifications', href: '/admin/notifications', icon: BellIcon },
    ],
  },
  {
    label: 'Administration',
    items: [
      { id: 'users', label: 'Team & access', href: '/admin/users', icon: UsersIcon },
      { id: 'settings', label: 'Store settings', href: '/admin/settings', icon: Cog6ToothIcon },
      { id: 'operations', label: 'Operations', href: '/admin/operations', icon: CpuChipIcon },
      { id: 'batch', label: 'Product recovery', href: '/admin/batch', icon: DocumentArrowUpIcon },
    ],
  },
];

/* Daily catalogue queues, one keystroke away from anywhere. */
const shortcuts = [
  { id: 'add-product', label: 'Add a product', href: '/admin/products/new', group: 'Shortcuts', icon: CubeIcon },
  { id: 'missing-photo', label: 'Products missing a photo', href: '/admin/products?view=hidden&filter=missing-photo', group: 'Shortcuts', icon: PhotoIcon },
  { id: 'ready', label: 'Products ready to go live', href: '/admin/products?view=hidden&filter=ready', group: 'Shortcuts', icon: CubeIcon },
  { id: 'needs-type', label: 'Products without a type', href: '/admin/products?view=hidden&filter=classification', group: 'Shortcuts', icon: ClipboardDocumentCheckIcon },
  { id: 'pending-orders', label: 'Pending orders', href: '/admin/orders?status=pending', group: 'Shortcuts', icon: ShoppingBagIcon },
];

/* The phone tab bar keeps the four most-used destinations, then opens the full
   sheet. It is a different navigation model, not a squeezed sidebar. */
const mobilePrimary = ['orders', 'dashboard', 'products', 'notifications'] as const;

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'A'
  );
}

const navLink = 'flex min-h-9 items-center gap-3 rounded-lg px-3 py-1.5 text-[13.5px] font-medium leading-5 text-mute no-underline transition-colors hover:bg-fill hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ink aria-[current=page]:bg-fill aria-[current=page]:text-ink';
const roleLabel = (user: { role: string; accountType?: 'branch' | undefined }) => (user.role === 'admin' ? 'Administrator' : user.accountType === 'branch' ? 'Store account' : 'Staff');

function Account({ user }: { user: { name: string; role: string; accountType?: 'branch' | undefined } }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-lg bg-fill text-[13px] font-semibold text-ink">{initials(user.name)}</span>
      <span className="grid min-w-0 text-left leading-tight">
        <span className="truncate text-[13px] font-semibold text-ink">{user.name}</span>
        <span className="truncate text-xs text-mute">{roleLabel(user)}</span>
      </span>
    </span>
  );
}

export function AdminShell({ user, allowed, children }: {
  user: { id: string; name: string; role: string; branchId?: string | null; accountType?: 'branch' | undefined };
  allowed: string[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  // The sheet is scoped to the route it was opened on, so navigating closes it.
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === pathname;
  const toggle = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [portal, setPortal] = useState<HTMLDivElement | null>(null);
  const closeSheet = () => setOpenFor(null);

  const permitted = new Set(allowed);
  const navGroups = groups
    .map((group) => ({ label: group.label, items: group.items.filter((item) => permitted.has(item.id)) }))
    .filter((group) => group.items.length);
  const everyItem = navGroups.flatMap((group) => group.items);
  // The dashboard lives at /admin, which prefixes every route: pick the longest match.
  const current = everyItem
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
  const primary = mobilePrimary.map((id) => everyItem.find((item) => item.id === id)).filter((item): item is NavItem => Boolean(item));
  const restoreFocus = () => (opener.current ?? toggle.current)?.focus();
  const canSearch = permitted.has('products');

  useEffect(() => {
    if (!canSearch) return;
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen(value => !value);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canSearch]);

  const openSheet = (event: React.MouseEvent<HTMLButtonElement>) => {
    opener.current = event.currentTarget;
    setOpenFor(pathname);
  };

  return (
    <TipProvider delayDuration={300}>
      <a className="admin-skip" href="#admin-main">Skip to content</a>
      <div className="grid min-h-dvh lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside id="admin-nav" aria-label="Administration navigation" className="sticky top-0 hidden h-dvh flex-col gap-4 border-r border-line bg-surface p-4 lg:flex">
          <Link href="/admin" prefetch={false} className="flex items-center gap-2.5 px-1 py-1 no-underline">
            <span aria-hidden="true" className="grid size-10 place-items-center rounded-lg bg-ink text-lg font-bold text-white">A</span>
            <span className="grid leading-tight">
              <span className="text-base font-semibold text-ink">Al Mina</span>
              <span className="text-xs text-mute">Administration</span>
            </span>
          </Link>
          <nav aria-label="Sections" className="-mr-2 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pr-2">
            {navGroups.map((group) => (
              <div key={group.label} className="grid gap-0.5">
                <p className="m-0 mb-1 px-3 text-[11px] font-medium text-mute">{group.label}</p>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.id} className={navLink} href={item.href} prefetch={false} aria-current={item.id === current?.id ? 'page' : undefined}>
                      <Icon className="size-5 shrink-0" aria-hidden="true" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
          <div className="grid gap-1 border-t border-line pt-3">
            <Link className={navLink} href="/" prefetch={false}>
              <ArrowTopRightOnSquareIcon className="size-5 shrink-0" aria-hidden="true" />
              View storefront
            </Link>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col pb-24 lg:pb-0">
          <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur">
            <div className="flex h-14 items-center gap-3 border-b border-line px-3 lg:px-6">
              <button ref={toggle} type="button" aria-label="Menu" aria-expanded={open} aria-controls="admin-mobile-nav" onClick={openSheet}
                className="grid size-10 shrink-0 place-items-center rounded-lg bg-fill text-ink hover:bg-line lg:hidden">
                <Bars3Icon className="size-5" aria-hidden="true" />
              </button>
              <p className="m-0 flex min-w-0 items-center gap-1.5 text-sm text-mute lg:hidden">
                <span className="truncate font-semibold text-ink">{current?.label ?? 'Overview'}</span>
              </p>
              <p className="m-0 hidden min-w-0 items-center gap-1.5 text-sm text-mute lg:flex">
                Administration
                <ChevronRightIcon className="size-3.5" aria-hidden="true" />
                <span className="truncate font-semibold text-ink">{current?.label ?? 'Overview'}</span>
              </p>
              <span className="flex-1" />
              <button type="button" onClick={() => setPaletteOpen(true)} aria-label="Quick search" aria-keyshortcuts="Control+K"
                className="hidden h-10 w-full max-w-sm items-center gap-2 rounded-lg bg-fill px-4 text-left text-sm text-mute outline-0 hover:bg-line focus-visible:outline-2 focus-visible:outline-ink xl:flex">
                <MagnifyingGlassIcon className="size-[18px] shrink-0" aria-hidden="true" />
                <span className="flex-1 truncate">Go to or search</span>
                <kbd className="rounded-lg bg-white px-1.5 py-0.5 font-sans text-[11px]">Ctrl K</kbd>
              </button>
              <Tip label="Quick search"><button type="button" onClick={() => setPaletteOpen(true)} aria-label="Quick search" className="grid size-10 shrink-0 place-items-center rounded-lg bg-fill text-ink hover:bg-line xl:hidden"><MagnifyingGlassIcon className="size-5" aria-hidden="true" /></button></Tip>
              {permitted.has('notifications') ? (
                <Tip label="Notifications"><Link href="/admin/notifications" prefetch={false} aria-label="Notifications"
                  className="grid size-10 shrink-0 place-items-center rounded-lg bg-fill text-ink hover:bg-line">
                  <BellIcon className="size-5" aria-hidden="true" />
                </Link></Tip>
              ) : null}
              <span className="hidden sm:block"><Account user={user} /></span>
              <SessionControls />
            </div>
          </header>
          <main id="admin-main" tabIndex={-1} className="mx-auto w-full min-w-0 max-w-[1400px] flex-1 px-4 py-5 outline-none lg:px-6 lg:py-6">
            <OrderMonitor />
            <AlertMonitor actor={user.id} />
            {children}
          </main>
          <nav aria-label="Primary" aria-hidden={open || undefined} inert={open || undefined}
            className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-around rounded-xl bg-surface p-1.5 border border-line shadow-pop lg:hidden">
            {primary.map((item) => {
              const Icon = item.icon;
              const active = current?.id === item.id;
              return (
                <Link key={item.id} href={item.href} prefetch={false} aria-current={active ? 'page' : undefined}
                  className={cn('flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] font-medium no-underline', active ? 'bg-fill text-ink' : 'text-mute')}>
                  <Icon className="size-5" aria-hidden="true" />
                  <span className="max-w-full truncate max-[380px]:text-[10px]">{item.label}</span>
                </Link>
              );
            })}
            <button type="button" aria-expanded={open} aria-controls="admin-mobile-nav" onClick={openSheet}
              className={cn('flex min-h-14 min-w-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] font-medium', open ? 'bg-fill text-ink' : 'text-mute')}>
              <EllipsisHorizontalIcon className="size-5" aria-hidden="true" />
              More
            </button>
          </nav>
        </div>
      </div>

      <Dialog.Root open={open} onOpenChange={(value) => (value ? setOpenFor(pathname) : closeSheet())}>
        <Dialog.Portal container={portal ?? undefined}>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40" />
          <Dialog.Content id="admin-mobile-nav" aria-describedby={undefined}
            onCloseAutoFocus={(event) => { event.preventDefault(); restoreFocus(); }}
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col gap-4 overflow-hidden rounded-xl bg-surface p-5 border border-line shadow-pop">
            <span aria-hidden="true" className="mx-auto -mt-2 h-1 w-10 rounded-lg bg-line-strong" />
            <div className="flex items-center justify-between">
              <Dialog.Title className="m-0 text-lg font-semibold">All sections</Dialog.Title>
              <Dialog.Close asChild>
                <button type="button" aria-label="Close menu" className="grid size-10 place-items-center rounded-lg bg-fill hover:bg-line">
                  <XMarkIcon className="size-5" aria-hidden="true" />
                </button>
              </Dialog.Close>
            </div>
            <div className="grid gap-5 overflow-y-auto">
              {navGroups.map((group) => (
                <div key={group.label} className="grid gap-2">
                  <p className="m-0 text-xs font-medium text-mute">{group.label}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link key={item.id} href={item.href} prefetch={false} onClick={closeSheet} aria-current={item.id === current?.id ? 'page' : undefined}
                          className="flex min-h-12 items-center gap-2.5 rounded-lg bg-soft px-3 text-[13px] font-medium text-ink no-underline aria-[current=page]:bg-fill">
                          <Icon className="size-5 shrink-0" aria-hidden="true" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
              <Account user={user} />
              <Link href="/" prefetch={false} onClick={closeSheet} className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-line-strong px-4 text-[13px] font-medium text-ink no-underline">
                <ArrowTopRightOnSquareIcon className="size-4" aria-hidden="true" />
                Storefront
              </Link>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} items={[...everyItem.map(item => ({ id: item.id, label: item.label, href: item.href, group: navGroups.find(group => group.items.includes(item))!.label, icon: item.icon })), ...(user.role === 'admin' ? shortcuts : [])]} canSearchProducts={canSearch} />
      <div ref={setPortal} />
    </TipProvider>
  );
}
