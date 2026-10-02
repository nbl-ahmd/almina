import axios from 'axios';
// Cookie auth requires a same-origin reverse proxy or explicitly configured same-site API.
const baseURL = process.env.REACT_APP_API_ORIGIN || window.location.origin;
const apiOrigin = new URL(baseURL, window.location.origin).origin;
localStorage.removeItem('token'); // Purge the compromised legacy JWT representation.
axios.interceptors.request.use(config => {
  const target = new URL(config.url, config.baseURL || window.location.origin);
  if (target.origin === apiOrigin && target.pathname.startsWith('/api/')) {
    config.withCredentials = true;
    if (!['get', 'head', 'options'].includes((config.method || 'get').toLowerCase())) config.headers['X-CSRF-Protection'] = '1';
  }
  return config;
});
export function apiFetch(url, options = {}) {
  const target = new URL(url, window.location.origin);
  if (target.origin !== apiOrigin || !target.pathname.startsWith('/api/')) return fetch(url, options);
  const headers = new Headers(options.headers);
  if (!['GET', 'HEAD', 'OPTIONS'].includes((options.method || 'GET').toUpperCase())) headers.set('X-CSRF-Protection', '1');
  return fetch(url, { ...options, headers, credentials: 'include' });
}
export default baseURL;
