// Temporary redirects support rollback during the additive admin cutover.
export function legacyAdminDestination(path: string): string | undefined {
  const aliases: Record<string, string> = {
    "/admindash": "/admin",
    "/admin/order": "/admin/orders",
    "/admin/productlist": "/admin/products",
    "/admin/disabled": "/admin/products?view=disabled",
    "/admin/salelist": "/admin/products?view=sale",
    "/admin/outofstock": "/admin/products?view=outofstock",
    "/admin/dispatched": "/admin/orders?status=dispatched",
    "/admin/cancelled": "/admin/orders?status=cancelled",
    "/admindash/uploadproduct": "/admin/products/new",
    "/admindash/banner": "/admin/banners",
    "/admindash/salelist": "/admin/products?view=sale",
    "/admindash/outofstock": "/admin/products?view=outofstock",
  };
  const base = path.replace(/\/search$/, "");
  if (aliases[base]) return aliases[base];
  const update =
    /^\/(?:admin|admindash)\/(productlist|categories)\/update\/([a-f0-9]{24})$/i.exec(
      path,
    );
  if (update)
    return `/admin/${update[1] === "productlist" ? "products" : "categories"}/${update[2]}`;
  const group =
    /^\/admindash\/(products|categories|orders|settings|batch|users|whatsapp)$/.exec(
      base,
    );
  return group ? `/admin/${group[1]}` : undefined;
}
