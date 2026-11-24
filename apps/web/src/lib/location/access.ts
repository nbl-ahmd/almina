/** Browser location access for the delivery flow.
 *
 *  Browsers show the location prompt once. After a "Block" (or inside embedded browsers that have no prompt at all) every request
 *  fails at once with PERMISSION_DENIED and nothing is shown, which looks like the app never asked. This module tells those cases
 *  apart so the customer is told what to do, and keeps the decision logic pure so it can be tested. */

export type Platform = 'android' | 'ios' | 'desktop';
export type LocationEnvironment = {
  platform: Platform;
  /** Opened from inside another app's built-in browser (Instagram, Facebook, TikTok, Snapchat, Line, a bare WebView). */
  embedded: boolean;
  /** Running as an installed home-screen app. */
  installed: boolean;
  secure: boolean;
  supported: boolean;
};
export type PermissionState = 'granted' | 'prompt' | 'denied' | 'unknown';
export type LocationFailure = 'denied' | 'timeout' | 'unavailable' | 'unsupported' | 'insecure';

export function detectEnvironment(input: { userAgent: string; standalone: boolean; secure: boolean; supported: boolean }): LocationEnvironment {
  const ua = input.userAgent;
  const platform: Platform = /android/i.test(ua) ? 'android' : /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && /mobile/i.test(ua)) ? 'ios' : 'desktop';
  const embedded = /FBAN|FBAV|FB_IAB|Instagram|Snapchat|TikTok|musical_ly|BytedanceWebview|Line\/|MicroMessenger|; wv\)|WebView/i.test(ua);
  return { platform, embedded, installed: input.standalone, secure: input.secure, supported: input.supported };
}

export function browserEnvironment(): LocationEnvironment {
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches === true || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return detectEnvironment({ userAgent: navigator.userAgent, standalone, secure: window.isSecureContext, supported: 'geolocation' in navigator });
}

export async function permissionState(): Promise<PermissionState> {
  try {
    if (!navigator.permissions?.query) return 'unknown';
    const status = await navigator.permissions.query({ name: 'geolocation' });
    return status.state === 'granted' || status.state === 'denied' || status.state === 'prompt' ? status.state : 'unknown';
  } catch { return 'unknown'; }
}

export type Guidance = { title: string; steps: string[] };

/** What to tell a customer whose browser will not give a location. Wording is plain: one thing to try, in order. */
export function guidanceFor(failure: LocationFailure, env: LocationEnvironment, locale: 'en' | 'ar' = 'en'): Guidance {
  const ar = locale === 'ar';
  if (failure === 'unsupported' || failure === 'insecure') {
    return { title: ar ? 'الموقع غير متاح في هذا المتصفح' : 'Location is not available in this browser',
      steps: [ar ? 'اختر موقعك على الخريطة أو أدخل المنطقة يدوياً.' : 'Choose your spot on the map or enter your area instead.'] };
  }
  if (failure === 'timeout' || failure === 'unavailable') {
    return { title: ar ? 'تعذر تحديد موقعك' : 'We could not find your location',
      steps: [ar ? 'تأكد من تشغيل خدمة الموقع (GPS) في هاتفك ثم حاول مرة أخرى.' : 'Make sure Location (GPS) is switched on for your phone, then try again.',
        ar ? 'أو اختر موقعك على الخريطة.' : 'Or choose your spot on the map.'] };
  }
  const title = ar ? 'الموقع محظور لهذا الموقع' : 'Location is blocked for this site';
  if (env.embedded) {
    return { title, steps: [
      ar ? 'أنت تفتح الموقع داخل متصفح تطبيق آخر، وهذه المتصفحات لا تسمح بالموقع.' : 'You opened this site inside another app’s built-in browser, which cannot share your location.',
      env.platform === 'ios' ? (ar ? 'اضغط على أيقونة المشاركة ثم «فتح في Safari».' : 'Tap the share icon, then Open in Safari.') : (ar ? 'اضغط على ⋮ ثم «فتح في Chrome».' : 'Tap ⋮, then Open in Chrome.'),
      ar ? 'أو اختر موقعك على الخريطة الآن.' : 'Or choose your spot on the map now.'] };
  }
  if (env.platform === 'android') {
    return { title, steps: env.installed ? [
      ar ? 'اضغط مطولاً على أيقونة التطبيق ← معلومات التطبيق ← الأذونات ← الموقع ← «السماح أثناء استخدام التطبيق».' : 'Long-press the app icon, then App info, Permissions, Location, and choose Allow while using the app.',
      ar ? 'إن كان الخيار مقفلاً: Chrome ← الإعدادات ← إعدادات الموقع ← الموقع ← اسمح لـ alminapharmacy.com.' : 'If it is locked: open Chrome, Settings, Site settings, Location, and allow alminapharmacy.com.',
      ar ? 'ارجع إلى هنا واضغط «استخدام موقعي الحالي».' : 'Come back here and tap Use my current location.'] : [
      ar ? 'اضغط على أيقونة القفل بجانب العنوان ← الأذونات ← الموقع ← السماح.' : 'Tap the lock icon next to the address, then Permissions, Location, and choose Allow.',
      ar ? 'إن لم يظهر ذلك: Chrome ← الإعدادات ← إعدادات الموقع ← الموقع ← اسمح لـ alminapharmacy.com.' : 'If that is missing: Chrome, Settings, Site settings, Location, and allow alminapharmacy.com.',
      ar ? 'تأكد أيضاً أن Chrome مسموح له بالموقع في الإعدادات ← التطبيقات ← Chrome ← الأذونات ← الموقع.' : 'Also check that Chrome itself is allowed to use location: Settings, Apps, Chrome, Permissions, Location.',
      ar ? 'ارجع إلى هنا واضغط «استخدام موقعي الحالي».' : 'Come back here and tap Use my current location.'] };
  }
  if (env.platform === 'ios') {
    return { title, steps: [
      ar ? 'الإعدادات ← الخصوصية والأمان ← خدمات الموقع ← شغّلها.' : 'Settings, Privacy & Security, Location Services, and switch it on.',
      env.installed ? (ar ? 'ثم اختر هذا التطبيق واختر «أثناء استخدام التطبيق».' : 'Then find this app in the list and choose While Using the App.') : (ar ? 'ثم Safari Websites ← «أثناء استخدام التطبيق».' : 'Then Safari Websites, and choose While Using the App.'),
      ar ? 'ارجع إلى هنا واضغط «استخدام موقعي الحالي».' : 'Come back here and tap Use my current location.'] };
  }
  return { title, steps: [
    ar ? 'اضغط على أيقونة القفل في شريط العنوان ← الموقع ← السماح، ثم أعد تحميل الصفحة.' : 'Click the lock icon in the address bar, set Location to Allow, then reload the page.',
    ar ? 'أو اختر موقعك على الخريطة.' : 'Or choose your spot on the map.'] };
}

export type PositionResult = { ok: true; latitude: number; longitude: number; accuracy: number } | { ok: false; failure: LocationFailure };

/** One tap, one attempt. Must be called from a click handler so the browser is willing to show its prompt. */
export function requestPosition(options: { timeoutMs?: number } = {}): Promise<PositionResult> {
  return new Promise(resolve => {
    if (!('geolocation' in navigator)) { resolve({ ok: false, failure: 'unsupported' }); return; }
    if (!window.isSecureContext) { resolve({ ok: false, failure: 'insecure' }); return; }
    // Some browsers do not count the time a permission prompt is open against the GPS timeout.
    const guard = setTimeout(() => resolve({ ok: false, failure: 'timeout' }), (options.timeoutMs ?? 20000));
    try {
      navigator.geolocation.getCurrentPosition(position => {
        clearTimeout(guard);
        const { latitude, longitude, accuracy } = position.coords;
        resolve(Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180
          ? { ok: true, latitude, longitude, accuracy } : { ok: false, failure: 'unavailable' });
      }, error => {
        clearTimeout(guard);
        resolve({ ok: false, failure: error.code === 1 ? 'denied' : error.code === 3 ? 'timeout' : 'unavailable' });
      }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 });
    } catch { clearTimeout(guard); resolve({ ok: false, failure: 'unavailable' }); }
  });
}
