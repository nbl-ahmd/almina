const unsafeCharacters = (value: string) =>
  value.includes("\\") ||
  Array.from(value).some((character) => character.charCodeAt(0) <= 32);
/** Proof navigation accepts only known local destinations; never forward arbitrary API/user URLs. */
export function proofListingReturn(value: unknown) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/design-proof/products") ||
    unsafeCharacters(value)
  )
    return "/design-proof/products";
  try {
    const url = new URL(value, "http://proof.invalid");
    if (
      url.origin !== "http://proof.invalid" ||
      url.pathname !== "/design-proof/products"
    )
      return "/design-proof/products";
    const query = new URLSearchParams();
    for (const key of ["q", "category", "sort", "page"]) {
      const field = url.searchParams.get(key);
      if (field) query.set(key, field.slice(0, key === "q" ? 80 : 100));
    }
    return url.pathname + (query.size ? "?" + query : "");
  } catch {
    return "/design-proof/products";
  }
}
export function proofSuggestionHref(href: unknown) {
  if (
    typeof href !== "string" ||
    !href.startsWith("/") ||
    href.startsWith("//") ||
    unsafeCharacters(href)
  )
    return null;
  try {
    const url = new URL(href, "http://proof.invalid");
    if (url.origin !== "http://proof.invalid") return null;
    if (/^\/products\/[a-zA-Z0-9_%.-]+$/.test(url.pathname))
      return "/design-proof" + url.pathname;
    if (url.pathname === "/search") {
      return proofListingReturn("/design-proof/products" + url.search);
    }
    if (url.pathname.startsWith("/categories/")) {
      const id = url.pathname.split("--").at(-1);
      return id && /^[a-f0-9]{24}$/i.test(id)
        ? "/design-proof/products?category=" + id
        : null;
    }
    if (/^\/(brands|collections)\/[a-zA-Z0-9_%.-]+$/.test(url.pathname))
      return url.pathname; // Explicit existing-site destination, labelled by the caller.
    return null;
  } catch {
    return null;
  }
}
