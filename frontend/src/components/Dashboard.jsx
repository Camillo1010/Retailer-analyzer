import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { addDays, formatLongDate, formatShortDate, todayISO } from '../services/dates.js';

const CATEGORY_DOT = {
  appointment: 'bg-category-appointment',
  bill: 'bg-category-bill',
  reminder: 'bg-category-reminder',
  milestone: 'bg-category-milestone',
  other: 'bg-category-other',
};

export default function Dashboard({ onSelectEvent, onAddEvent }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const today = todayISO();
    const to = addDays(today, 7);
    setLoading(true);
    api
      .listEvents({ from: today, to })
      .then((data) => {
        if (!cancelled) setEvents(data.events || []);
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const today = todayISO();
  const todays = events.filter((e) => e.date === today);
  const upcoming = events.filter((e) => e.date > today);

  return (
    <section aria-label="Dashboard" className="space-y-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Today</p>
            <h2 className="text-xl font-semibold">{formatLongDate(today)}</h2>
          </div>
          <button
            onClick={onAddEvent}
            className="shrink-0 rounded-lg bg-slate-900 text-white px-3 py-2 text-sm font-medium hover:bg-slate-800"
          >
            + Add event
          </button>
        </div>
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : todays.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing scheduled today.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {todays.map((e) => (
              <EventRow key={e.id} event={e} onClick={() => onSelectEvent?.(e)} showDate={false} />
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5">
        <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Next 7 days</p>
        {loading ? null : upcoming.length === 0 ? (
          <p className="text-sm text-slate-500">No upcoming events.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {upcoming.map((e) => (
              <EventRow key={e.id} event={e} onClick={() => onSelectEvent?.(e)} showDate />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function EventRow({ event, onClick, showDate }) {
  return (
    <li>
      <button
        onClick={onClick}
        className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-slate-50 -mx-2 px-2 rounded-lg"
      >
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${CATEGORY_DOT[event.category] || 'bg-slate-400'}`} />
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{event.title}</p>
          <p className="text-xs text-slate-500 truncate">
            {showDate ? formatShortDate(event.date) : null}
            {showDate && event.time ? ' · ' : ''}
            {event.time || (showDate ? '' : 'All day')}
            {event.description ? ` · ${event.description}` : ''}
          </p>
        </div>
        <span aria-hidden className="text-slate-400">›</span>
      </button>
    </li>
  );
}
