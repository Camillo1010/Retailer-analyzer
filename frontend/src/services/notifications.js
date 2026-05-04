// Phase-2 scaffold. Asks for browser notification permission, fires a
// morning summary at 8 AM local time, and reminders relative to event
// times. All client-side; replace with FCM/web-push when we want
// notifications to work while the tab is closed.

import { api } from './api.js';
import { todayISO } from './dates.js';

let summaryTimer = null;
let reminderTimer = null;

export async function requestPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.requestPermission();
}

export function notificationsEnabled() {
  return 'Notification' in window && Notification.permission === 'granted';
}

function notify(title, body) {
  if (!notificationsEnabled()) return;
  try {
    new Notification(title, { body, icon: '/icon-192.png' });
  } catch {
    /* ignore */
  }
}

function msUntil(hour, minute) {
  const now = new Date();
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next - now;
}

async function fireMorningSummary() {
  try {
    const today = todayISO();
    const { events } = await api.listEvents({ from: today, to: today });
    if (!events.length) return;
    const lines = events
      .slice(0, 5)
      .map((e) => `${e.time || 'All day'} — ${e.title}`)
      .join('\n');
    const more = events.length > 5 ? `\n+${events.length - 5} more` : '';
    notify(`Today: ${events.length} event${events.length === 1 ? '' : 's'}`, lines + more);
  } catch {
    /* ignore */
  }
}

function scheduleMorningSummary() {
  if (summaryTimer) clearTimeout(summaryTimer);
  summaryTimer = setTimeout(() => {
    fireMorningSummary();
    scheduleMorningSummary();
  }, msUntil(8, 0));
}

// Naive: every 5 min, look for events whose configured reminder window
// just elapsed. Real push notifications need a service worker — this
// only fires while the tab is open.
function scheduleReminderSweep() {
  if (reminderTimer) clearInterval(reminderTimer);
  const fired = new Set();
  reminderTimer = setInterval(async () => {
    if (!notificationsEnabled()) return;
    try {
      const today = todayISO();
      const { events } = await api.listEvents({ from: today, to: today });
      const now = Date.now();
      for (const e of events) {
        if (!e.time || !e.reminders?.length) continue;
        const [h, m] = e.time.split(':').map(Number);
        const [y, mo, d] = e.date.split('-').map(Number);
        const eventTime = new Date(y, mo - 1, d, h, m).getTime();
        for (const r of e.reminders) {
          const offset = r === '1d' ? 86400000 : r === '1h' ? 3600000 : 0;
          const fireAt = eventTime - offset;
          const key = `${e.id}:${r}`;
          if (now >= fireAt && now - fireAt < 5 * 60 * 1000 && !fired.has(key)) {
            notify(`Reminder: ${e.title}`, `${e.time} — ${e.description || ''}`.trim());
            fired.add(key);
          }
        }
      }
    } catch {
      /* ignore */
    }
  }, 5 * 60 * 1000);
}

export function startNotifications() {
  if (!notificationsEnabled()) return;
  scheduleMorningSummary();
  scheduleReminderSweep();
}

export function stopNotifications() {
  if (summaryTimer) clearTimeout(summaryTimer);
  if (reminderTimer) clearInterval(reminderTimer);
  summaryTimer = null;
  reminderTimer = null;
}
