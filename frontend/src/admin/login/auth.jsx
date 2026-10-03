import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import baseURL, { apiFetch } from '../../axiosConfig';
function remember(user) {
  // Display hints only. These fields are never used by the server or route guard for authorization.
  for (const key of ['name', 'role']) localStorage.setItem(key, user[key]);
  localStorage.setItem('cities', JSON.stringify(user.cities));
  localStorage.removeItem('token');
}
export const authenticateUser = async (username, password) => {
  const response = await apiFetch(`${baseURL}/api/auth/login`, { method: 'POST',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
  if (!response.ok) throw new Error('Login failed');
  const user = await response.json();
  remember(user);
  return user;
};
export const logoutUser = async () => {
  const response = await apiFetch(`${baseURL}/api/auth/logout`, { method: 'POST' });
  if (!response.ok && response.status !== 401) throw new Error('Logout failed');
  for (const key of ['token', 'name', 'role', 'cities']) localStorage.removeItem(key);
};
export function SessionRoute({ children, role }) {
  const [identity, setIdentity] = useState(undefined);
  useEffect(() => {
    const controller = new AbortController();
    apiFetch(`${baseURL}/api/auth/me`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) { setIdentity(null); return; }
        const user = await response.json(); remember(user); setIdentity(user);
      }).catch(() => { if (!controller.signal.aborted) setIdentity(null); });
    return () => controller.abort();
  }, []);
  if (identity === undefined) return <p role="status">Checking session…</p>;
  if (!identity || (role === 'admin' && identity.role !== 'admin')) return <Navigate to="/admin/login" replace />;
  return children;
}
export const useAuthentication = () => {
  const navigate = useNavigate();
  return {
    authenticate: async (username, password) => {
      const user = await authenticateUser(username, password);
      navigate(user.role === 'admin' ? '/admindash' : '/admin');
    },
    logout: async () => {
      try { await logoutUser(); navigate('/admin/login'); }
      catch { window.alert('Logout failed. Please retry.'); }
    },
  };
};
