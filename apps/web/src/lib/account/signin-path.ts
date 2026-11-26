/** Screens that can show Google sign-in (the wholesale gate and every account screen). Only these documents carry the security
 *  headers Google's button needs. */
export const signInPath = /^\/(?:wholesale|account(?:\/orders(?:\/[A-Za-z0-9-]{1,40})?)?)$/;
