export type CatalogOperation = 'products' | 'product' | 'categories' | 'category' | 'banners' | 'store' | 'sitemap';
export type CatalogQueryObserver = (measurement: { operation: CatalogOperation; durationMs: number; success: boolean }) => void;
export async function measureCatalogQuery<T>(operation: CatalogOperation, query: () => Promise<T>, observe?: CatalogQueryObserver): Promise<T> {
  const start = performance.now();
  let success = false;
  try { const result = await query(); success = true; return result; }
  finally {
    // Monitoring must never change the result/error of a database operation.
    try { observe?.({ operation, durationMs: performance.now() - start, success }); } catch { /* Isolate monitoring failures. */ }
  }
}
