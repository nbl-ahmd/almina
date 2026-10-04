// Private tab-local retry receipts; never send fingerprints to analytics or logs.
// Do not evict uncertain keys automatically. Closing the tab ends this browser recovery boundary.
export async function whatsappRetryKey(path: string, payload: Record<string, unknown>, storage: Pick<Storage, 'getItem' | 'setItem'> = sessionStorage,
  cryptography: Pick<Crypto, 'subtle' | 'randomUUID'> = crypto) {
  const encoded = JSON.stringify([path, Object.entries(payload).sort(([a], [b]) => a.localeCompare(b))]);
  const fingerprint = Array.from(new Uint8Array(await cryptography.subtle.digest('SHA-256', new TextEncoder().encode(encoded))), byte => byte.toString(16).padStart(2, '0')).join('');
  const name = 'almina-whatsapp-retry-v1';
  try {
    const raw = storage.getItem(name); if (raw && raw.length > 15000) throw new Error('Invalid receipt storage');
    const records: unknown = raw ? JSON.parse(raw) : {};
    if (!records || typeof records !== 'object' || Array.isArray(records)
      || Object.entries(records).some(([key, value]) => !/^[a-f0-9]{64}$/.test(key) || typeof value !== 'string' || !/^[a-f0-9-]{36}$/.test(value))) throw new Error('Invalid receipt storage');
    const keys = records as Record<string, string>;
    if (keys[fingerprint]) return keys[fingerprint];
    if (Object.keys(keys).length >= 100) throw new Error('Receipt capacity reached');
    const key = cryptography.randomUUID(); keys[fingerprint] = key; storage.setItem(name, JSON.stringify(keys)); return key;
  } catch { throw new Error('Send recovery storage is unavailable or full. Review delivery records before starting another send.'); }
}
