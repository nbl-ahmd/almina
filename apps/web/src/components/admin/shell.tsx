"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ComponentType, type ReactNode, type SVGProps } from 'react';
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
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.documentElement.style.overflow = previous;
    };
  }, [open]);

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

  return (
    <>
      <a className="admin-skip" href="#admin-main">
        Skip to content
      </a>
      <div className="admin-shell">
        <aside
          className="admin-sidebar"
          id="admin-nav"
          data-open={open}
          aria-label="Administration navigation"
        >
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
                      onClick={() => setOpen(false)}
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
            <Link className="admin-store-link" href="/" prefetch={false} onClick={() => setOpen(false)}>
              <ArrowTopRightOnSquareIcon
                className="admin-nav__icon"
                aria-hidden="true"
              />
              View storefront
            </Link>
          </div>
        </aside>
        <button
          type="button"
          className="admin-scrim"
          data-open={open}
          tabIndex={-1}
          aria-hidden="true"
          onClick={() => setOpen(false)}
        />
        <div className="admin-main">
          <header className="admin-topbar">
            <button
              ref={toggle}
              type="button"
              className="admin-menu admin-btn--secondary"
              aria-expanded={open}
              aria-controls="admin-nav"
              onClick={() => setOpen((value) => !value)}
            >
              {open ? (
                <XMarkIcon className="admin-nav__icon" aria-hidden="true" />
              ) : (
                <Bars3Icon className="admin-nav__icon" aria-hidden="true" />
              )}
              Menu
            </button>
            <span className="admin-crumbs">
              <span className="admin-crumbs__root">Administration</span>
              <ChevronRightIcon className="admin-crumbs__sep" aria-hidden="true" />
              <span className="admin-crumbs__current">
                {current?.label ?? 'Overview'}
              </span>
            </span>
            <span className="admin-topbar__spacer" />
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
          <div className="admin-livestatus">
            <OrderMonitor />
          </div>
          <main id="admin-main" tabIndex={-1} className="admin-content">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
