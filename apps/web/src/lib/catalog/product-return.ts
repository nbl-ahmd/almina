type Entry = { id: number; depth: number; href: string };
type Visit = { source: string; product: string; control: string; occurrence: number; y: number };

const entryKey = 'alminaProductReturn';
const linkSelector = 'a[data-product-entry]';
const productPath = /^\/products\/[^/]+\/?$/;
const browsePath = /^\/$|^\/(?:products|search|categories|offers|brands|collections|ras-al-khaimah)\/?$|^\/(?:categories|offers|brands|collections|shop|routines)\/[^/]+\/?$/;
const visits = new Map<number, Visit>();
const listeners = new Set<() => void>();
let serial = 0;
let pending: Entry | null = null;
let shown: Entry | null = null;
let restoreFrame = 0;
let returning = false;

function currentHref() {
  return location.pathname + location.search + location.hash;
}

function currentEntry(): Entry | null {
  const entry: Entry | undefined = history.state?.[entryKey];
  return entry && Number.isInteger(entry.depth) && entry.depth >= 0 && entry.href === currentHref() && visits.has(entry.id) ? entry : null;
}

function mark(entry: Entry) {
  history.replaceState({ ...history.state, [entryKey]: entry }, '');
}

function productLinks(product: string, control: string) {
  return Array.from(document.querySelectorAll<HTMLAnchorElement>('main ' + linkSelector)).filter(
    link => link.dataset.productEntry === control && link.getAttribute('href') === product,
  );
}

function beginNavigation(event: MouseEvent) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.defaultPrevented) return;
  const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
  if (!link || (link.target && link.target !== '_self') || link.hasAttribute('download')) return;
  const target = new URL(link.href);
  if (target.origin !== location.origin) return;
  const href = target.pathname + target.search + target.hash;
  if (href === currentHref()) return;

  pending = null;
  cancelAnimationFrame(restoreFrame);
  if (!productPath.test(target.pathname)) return;

  const previous = currentEntry();
  if (previous?.depth && link.hasAttribute('data-product-variant')) {
    pending = { ...previous, depth: previous.depth + 1, href };
    return;
  }

  const control = link.dataset.productEntry;
  if (!control || !browsePath.test(location.pathname)) return;
  const source = currentHref();
  const occurrence = productLinks(href, control).indexOf(link);
  if (occurrence < 0) return;

  const id = ++serial;
  visits.set(id, { source, product: href, control, occurrence, y: scrollY });
  // Return context is limited to this document and only the latest journeys.
  if (visits.size > 8) visits.delete(visits.keys().next().value!);
  mark({ id, depth: 0, href: source });
  pending = { id, depth: 1, href };
}

function publish() {
  shown = currentEntry();
  returning = false;
  for (const listener of listeners) listener();
}

export function commitProductNavigation() {
  if (pending?.href === currentHref()) mark(pending);
  pending = null;
  publish();
}

function restoreBrowsePosition(visit: Visit) {
  const deadline = performance.now() + 2500;
  const restore = () => {
    if (currentHref() !== visit.source) return;
    const link = productLinks(visit.product, visit.control)[visit.occurrence];
    if ((!link || document.querySelector('main .pdp-page')) && performance.now() < deadline) {
      restoreFrame = requestAnimationFrame(restore);
      return;
    }
    (link ?? document.getElementById('main-content'))?.focus({ preventScroll: true });
    window.scrollTo({ top: visit.y, behavior: 'instant' });
  };
  restoreFrame = requestAnimationFrame(() => { restoreFrame = requestAnimationFrame(restore); });
}

function onHistoryNavigation() {
  const previous = shown;
  pending = null;
  cancelAnimationFrame(restoreFrame);
  publish();
  if (previous?.depth && shown?.depth === 0 && previous.id === shown.id) {
    const visit = visits.get(shown.id);
    if (visit) restoreBrowsePosition(visit);
  }
}

export function observeProductNavigation() {
  document.addEventListener('click', beginNavigation, true);
  window.addEventListener('popstate', onHistoryNavigation);
  return () => {
    document.removeEventListener('click', beginNavigation, true);
    window.removeEventListener('popstate', onHistoryNavigation);
    cancelAnimationFrame(restoreFrame);
  };
}

export function subscribeProductReturn(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function productReturnDestination() {
  const entry = currentEntry();
  return entry?.depth ? visits.get(entry.id)?.source ?? null : null;
}

export function returnToProductSource(href: string) {
  const entry = currentEntry();
  if (!entry?.depth || visits.get(entry.id)?.source !== href) return false;
  if (!returning) {
    returning = true;
    history.go(-entry.depth);
  }
  return true;
}
