export function cloudinaryImage(value: unknown, cloudName: string | undefined): string | null {
  if (!cloudName || typeof value !== 'string' || value.length > 1000) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com' || url.port || url.username || url.password
      || url.search || url.hash || !url.pathname.startsWith(`/${cloudName}/image/upload/`)
      || !/\.(avif|webp|png|jpe?g)$/i.test(url.pathname) || /%2e|%2f|%5c/i.test(url.pathname)) return null;
    return url.href;
  } catch { return null; }
}
