/** Do not mistake a gateway/origin denial for Google's third-party-mailbox policy. */
export function accountErrorMessage(status: number, action: string, code?: string): string {
  if (status === 429) return 'Too many attempts. Please wait before trying again.';
  if (status === 403 && action === 'google' && code === 'FORBIDDEN') return 'This Google account needs an email verification step. Use an email code if available, or contact the pharmacy for help.';
  if (status === 403) return 'Sign-in could not be completed securely. Refresh this page and try again. If it continues, contact the pharmacy.';
  if (status === 401) return action === 'google' ? 'Google sign-in could not be verified. Please choose your Google account and try again.' : 'Your code or session has expired, or the code is incorrect. Please try again.';
  return 'We could not connect to your account. Please try again.';
}
