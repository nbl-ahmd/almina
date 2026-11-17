/** Pure boundary, shared by every proof data/metadata entry. Never enabled in a production build. */
export function directionProofAllowed(env: Record<string, string | undefined>) {
  if (
    env.NODE_ENV !== "development" ||
    env.APP_ENV !== "development" ||
    env.ALMINA_DIRECTION_PROOF !== "1"
  )
    return false;
  return ["API_ORIGIN", "LEGACY_API_ORIGIN"].every((key) => {
    try {
      const url = new URL(env[key] ?? "");
      return (
        url.protocol === "http:" &&
        ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) &&
        !url.username &&
        !url.password &&
        url.pathname === "/" &&
        !url.search &&
        !url.hash
      );
    } catch {
      return false;
    }
  });
}
