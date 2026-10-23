"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef, useState, type ComponentType, type ReactNode, type SVGProps } from 'react';
import { Dialog } from 'radix-ui';
import {
  ArrowTopRightOnSquareIcon,
  Bars3Icon,
  BellIcon,
  ChartBarSquareIcon,
  ChatBubbleLeftRightIcon,
  ChevronRightIcon,
  ClipboardDocumentCheckIcon,
  Cog6ToothIcon,
  CubeIcon,
  DocumentArrowUpIcon,
  EllipsisHorizontalIcon,
  PhotoIcon,
  RectangleGroupIcon,
  ShoppingBagIcon,
  Squares2X2Icon,
  TableCellsIcon,
  UsersIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { OrderMonitor, SessionControls } from './controls';

type Icon = ComponentType<SVGProps<SVGSVGElement>>;
type NavItem = { id: string; label: string; href: string; icon: Icon };
type NavGroup = { label: string; items: NavItem[] };

const groups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', href: '/admin', icon: Squares2X2Icon },
      { id: 'operations', label: 'Operations', href: '/admin/operations', icon: ChartBarSquareIcon },
      { id: 'needs-action', label: 'Needs action', href: '/admin/needs-action', icon: ClipboardDocumentCheckIcon },
    ],
  },
  {
    label: 'Catalogue',
    items: [
      { id: 'products', label: 'Products', href: '/admin/products', icon: CubeIcon },
      { id: 'categories', label: 'Categories', href: '/admin/categories', icon: RectangleGroupIcon },
      { id: 'banners', label: 'Banners', href: '/admin/banners', icon: PhotoIcon },
      { id: 'catalog-import', label: 'Catalog import', href: '/admin/catalog-import', icon: TableCellsIcon },
    ],
  },
  {
    label: 'Commerce',
    items: [
      { id: 'wholesale', label: 'Wholesale', href: '/admin/wholesale', icon: UsersIcon },
      { id: 'orders', label: 'Orders', href: '/admin/orders', icon: ShoppingBagIcon },
    ],
  },
  {
    label: 'Engagement',
    items: [
      { id: 'marketing', label: 'Email marketing', href: '/admin/marketing', icon: ChatBubbleLeftRightIcon },
      { id: 'growth', label: 'Website & growth', href: '/admin/growth', icon: ChartBarSquareIcon },
      { id: 'whatsapp', label: 'WhatsApp', href: '/admin/whatsapp', icon: ChatBubbleLeftRightIcon },
      { id: 'notifications', label: 'Notifications', href: '/admin/notifications', icon: BellIcon },
    ],
  },
  {
    label: 'Administration',
    items: [
      { id: 'users', label: 'Users', href: '/admin/users', icon: UsersIcon },
      { id: 'settings', label: 'Store settings', href: '/admin/settings', icon: Cog6ToothIcon },
      { id: 'batch', label: 'Product recovery', href: '/admin/batch', icon: DocumentArrowUpIcon },
    ],
  },
];

/* The phone tab bar keeps the four most-used destinations, then opens the full
   sheet. It is a different navigation model, not a squeezed sidebar. */
const mobilePrimary = ['dashboard', 'orders', 'products'] as const;

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

export function AdminShell({
  user,
  allowed,
  children,
}: {
  user: { name: string; role: string };
  allowed: string[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  // The sheet is scoped to the route it was opened on, so a navigation closes it
  // without an effect that mirrors pathname into state.
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === pathname;
  const toggle = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const [portal, setPortal] = useState<HTMLDivElement | null>(null);

  const closeSheet = () => setOpenFor(null);

  const permitted = new Set(allowed);
  const navGroups = groups
    .map((group) => ({
      label: group.label,
      items: group.items.filter((item) => permitted.has(item.id)),
    }))
    .filter((group) => group.items.length);
  // The dashboard lives at /admin, which prefixes every route: pick the longest match.
  const current = navGroups
    .flatMap((group) => group.items)
    .filter(
      (item) =>
        pathname === item.href || pathname.startsWith(`${item.href}/`),
    )
    .sort((a, b) => b.href.length - a.href.length)[0];
  const primary = mobilePrimary
    .map((id) => navGroups.flatMap((group) => group.items).find((item) => item.id === id))
    .filter((item): item is NavItem => Boolean(item));

  // Radix restores focus to a Dialog.Trigger, but the sheet is opened from two
  // different controls, so return focus to whichever one the user pressed.
  const restoreFocus = () => (opener.current ?? toggle.current)?.focus();

  return (
    <>
      <a className="admin-skip" href="#admin-main">
        Skip to content
      </a>
      <div className="admin-shell">
        <aside className="admin-sidebar" id="admin-nav" aria-label="Administration navigation">
          <div className="admin-brand">
            <Link className="admin-brand__mark" href="/admin" prefetch={false}>
              <span className="admin-brand__logo" aria-hidden="true">
                A
              </span>
              <span className="admin-brand__text">
                Al Mina
                <span className="admin-brand__sub">Administration</span>
              </span>
            </Link>
          </div>
          <nav className="admin-nav" aria-label="Sections">
            {navGroups.map((group) => (
              <div className="admin-nav__group" key={group.label}>
                <p className="admin-nav__label">{group.label}</p>
                {group.items.map((item) => {
                  const active = item.id === current?.id;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.id}
                      className="admin-nav__link"
                      href={item.href}
                      prefetch={false}
                      aria-current={active ? 'page' : undefined}
                    >
                      <Icon className="admin-nav__icon" aria-hidden="true" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
          <div className="admin-sidebar__foot">
            <Link className="admin-store-link" href="/" prefetch={false}>
              <ArrowTopRightOnSquareIcon className="admin-nav__icon" aria-hidden="true" />
              View storefront
            </Link>
            <div className="admin-sidebar__user">
              <span className="admin-user__avatar" aria-hidden="true">
                {initials(user.name)}
              </span>
              <span className="admin-user__meta">
                <span className="admin-user__name">{user.name}</span>
                <span className="admin-user__role">
                  {user.role === 'admin' ? 'Administrator' : 'Staff'}
                </span>
              </span>
            </div>
          </div>
        </aside>

        <div className="admin-main">
          <header className="admin-topbar">
            <button
              ref={toggle}
              type="button"
              className="admin-menu admin-btn--secondary"
              aria-label="Menu"
              aria-expanded={open}
              aria-controls="admin-mobile-nav"
              onClick={(event) => {
                opener.current = event.currentTarget;
                setOpenFor(pathname);
              }}
            >
              <Bars3Icon className="admin-nav__icon" aria-hidden="true" />
              <span className="admin-menu__label" aria-hidden="true">Menu</span>
            </button>
            <span className="admin-crumbs">
              <span className="admin-crumbs__root">Administration</span>
              <ChevronRightIcon className="admin-crumbs__sep" aria-hidden="true" />
              <span className="admin-crumbs__current">
                {current?.label ?? 'Overview'}
              </span>
            </span>
            <span className="admin-topbar__spacer" />
            <OrderMonitor />
            <span className="admin-user">
              <span className="admin-user__avatar" aria-hidden="true">
                {initials(user.name)}
              </span>
              <span className="admin-user__meta">
                <span className="admin-user__name">{user.name}</span>
                <span className="admin-user__role">
                  {user.role === 'admin' ? 'Administrator' : 'Staff'}
                </span>
              </span>
            </span>
            <SessionControls />
          </header>
          <main id="admin-main" tabIndex={-1} className="admin-content">
            {children}
          </main>
          <nav
            className="admin-bottomnav"
            aria-label="Primary"
            aria-hidden={open || undefined}
            inert={open || undefined}
          >
            {primary.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  className="admin-bottomnav__link"
                  href={item.href}
                  prefetch={false}
                  aria-current={current?.id === item.id ? 'page' : undefined}
                >
                  <Icon aria-hidden="true" />
                  {item.label === 'Needs action' ? 'Review' : item.label}
                </Link>
              );
            })}
            <button
              type="button"
              className="admin-bottomnav__link"
              data-more="true"
              data-active={open ? 'true' : undefined}
              aria-expanded={open}
              aria-controls="admin-mobile-nav"
              onClick={(event) => {
                opener.current = event.currentTarget;
                setOpenFor(pathname);
              }}
            >
              <EllipsisHorizontalIcon aria-hidden="true" />
              More
            </button>
          </nav>
        </div>
      </div>

      <Dialog.Root open={open} onOpenChange={(value) => (value ? setOpenFor(pathname) : closeSheet())}>
        {/* Mount inside .admin-app: the sheet's colours, radii and easing are
            custom properties declared there, and a body portal would lose them. */}
        <Dialog.Portal container={portal ?? undefined}>
          <Dialog.Overlay className="admin-sheet-overlay" />
          <Dialog.Content
            className="admin-sheet"
            id="admin-mobile-nav"
            aria-describedby={undefined}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              restoreFocus();
            }}
          >
            <span className="admin-sheet__grip" aria-hidden="true" />
            <div className="admin-sheet__head">
              <Dialog.Title className="admin-sheet__title">All sections</Dialog.Title>
              <Dialog.Close asChild>
                <button type="button" className="admin-sheet__close" aria-label="Close menu">
                  <XMarkIcon width={18} height={18} aria-hidden="true" />
                </button>
              </Dialog.Close>
            </div>
            <div className="admin-sheet__body">
              {navGroups.map((group) => (
                <div className="admin-sheet__group" key={group.label}>
                  <p className="admin-sheet__group-title">{group.label}</p>
                  <div className="admin-sheet__grid">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.id}
                          className="admin-sheet__link"
                          href={item.href}
                          prefetch={false}
                          aria-current={item.id === current?.id ? 'page' : undefined}
                          onClick={closeSheet}
                        >
                          <Icon width={18} height={18} aria-hidden="true" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="admin-sheet__foot">
              <span className="admin-user">
                <span className="admin-user__avatar" aria-hidden="true">
                  {initials(user.name)}
                </span>
                <span className="admin-user__meta">
                  <span className="admin-user__name">{user.name}</span>
                  <span className="admin-user__role">
                    {user.role === 'admin' ? 'Administrator' : 'Staff'}
                  </span>
                </span>
              </span>
              <Link className="admin-store-link" href="/" prefetch={false} onClick={closeSheet}>
                <ArrowTopRightOnSquareIcon width={16} height={16} aria-hidden="true" />
                Storefront
              </Link>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <div ref={setPortal} />
    </>
  );
}
