export const cn = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

/** Radix portals render into the console root so its font and reset apply. */
export const adminPortal = (): HTMLElement | undefined => (typeof document === 'undefined' ? undefined : document.querySelector<HTMLElement>('.admin-app') ?? undefined);
