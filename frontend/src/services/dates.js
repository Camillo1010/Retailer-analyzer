// Local-time date helpers. We use "YYYY-MM-DD" strings everywhere
// so events display on the same calendar day regardless of timezone.

export function pad(n) {
  return String(n).padStart(2, '0');
}

export function toISODate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO() {
  return toISODate(new Date());
}

export function addDays(iso, days) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return toISODate(dt);
}

export function startOfMonth(year, month /* 0-11 */) {
  return new Date(year, month, 1);
}

export function endOfMonth(year, month) {
  return new Date(year, month + 1, 0);
}

// Returns a 6×7 grid of ISO date strings starting on Sunday.
export function monthGrid(year, month) {
  const first = startOfMonth(year, month);
  const startWeekday = first.getDay();
  const gridStart = new Date(year, month, 1 - startWeekday);
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push(toISODate(d));
  }
  return cells;
}

export function formatLongDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatShortDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
