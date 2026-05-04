import { getToken, clearSession } from './auth.js';

const BASE = import.meta.env.VITE_API_BASE || '';

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401 && auth) {
    clearSession();
    window.dispatchEvent(new Event('auth:expired'));
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return data;
}

export const api = {
  // auth
  login: (username, password) =>
    request('/api/auth/login', { method: 'POST', body: { username, password }, auth: false }),
  me: () => request('/api/auth/me'),

  // events
  listEvents: ({ from, to } = {}) => {
    const q = new URLSearchParams();
    if (from) q.set('from', from);
    if (to) q.set('to', to);
    const qs = q.toString();
    return request(`/api/events${qs ? `?${qs}` : ''}`);
  },
  getEvent: (id) => request(`/api/events/${id}`),
  createEvent: (event) => request('/api/events', { method: 'POST', body: event }),
  updateEvent: (id, patch) => request(`/api/events/${id}`, { method: 'PUT', body: patch }),
  deleteEvent: (id) => request(`/api/events/${id}`, { method: 'DELETE' }),

  // comments
  listComments: (eventId) => request(`/api/events/${eventId}/comments`),
  addComment: (eventId, body) =>
    request(`/api/events/${eventId}/comments`, { method: 'POST', body: { body } }),
  deleteComment: (eventId, commentId) =>
    request(`/api/events/${eventId}/comments/${commentId}`, { method: 'DELETE' }),
};
