// Customer reads that the API answers only for a signed-in session. Without a
// session cookie the API always replies 401, so the web proxy can give the same
// answer itself instead of spending an upstream request on every guest page view.
export const sessionOnlyReads = ['me', 'orders', 'addresses', 'saved', 'rewards', 'reminders'] as const;
export const guestReadBody = { error: { code: 'UNAUTHORIZED', message: 'Authentication is required.' } } as const;

export function answersGuestLocally(method: string, action: string, token: string) {
  return !token && (method === 'GET' || method === 'HEAD') && (sessionOnlyReads as readonly string[]).includes(action);
}
