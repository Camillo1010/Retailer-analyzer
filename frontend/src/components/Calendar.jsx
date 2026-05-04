import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api.js';
import { MONTHS, WEEKDAYS_SHORT, monthGrid, todayISO } from '../services/dates.js';

const CATEGORY_DOT = {
  appointment: 'bg-category-appointment',
  bill: 'bg-category-bill',
  reminder: 'bg-category-reminder',
  milestone: 'bg-category-milestone',
  other: 'bg-category-other',
};

export default function Calendar({ onSelectDate, onSelectEvent }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const cells = useMemo(() => monthGrid(year, month), [year, month]);
  const today = todayISO();

  useEffect(() => {
    const from = cells[0];
    const to = cells[cells.length - 1];
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .listEvents({ from, to })
      .then((data) => {
        if (!cancelled) setEvents(data.events || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [year, month, cells]);

  const byDate = useMemo(() => {
    const map = new Map();
    for (const e of events) {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date).push(e);
    }
    return map;
  }, [events]);

  function prev() {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function next() {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  return (
    <section aria-label="Calendar" className="bg-white rounded-2xl shadow-sm border border-slate-200">
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <h2 className="text-lg font-semibold">
          {MONTHS[month]} {year}
        </h2>
        <div className="flex items-center gap-1">
          <NavButton onClick={prev} label="Previous month">‹</NavButton>
          <button
            onClick={() => {
              const d = new Date();
              setYear(d.getFullYear());
              setMonth(d.getMonth());
            }}
            className="text-sm px-3 py-1.5 rounded-md hover:bg-slate-100"
          >
            Today
          </button>
          <NavButton onClick={next} label="Next month">›</NavButton>
        </div>
      </header>

      <div className="grid grid-cols-7 text-xs text-slate-500 border-b border-slate-200">
        {WEEKDAYS_SHORT.map((w) => (
          <div key={w} className="px-2 py-2 text-center font-medium">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((iso) => {
          const [y, m] = iso.split('-').map(Number);
          const inMonth = m - 1 === month && y === year;
          const dayNum = Number(iso.slice(8, 10));
          const dayEvents = byDate.get(iso) || [];
          const isToday = iso === today;
          return (
            <button
              key={iso}
              onClick={() => onSelectDate?.(iso)}
              className={[
                'min-h-[72px] sm:min-h-[96px] text-left px-1.5 sm:px-2 py-1.5 border-r border-b border-slate-100',
                'flex flex-col gap-1 hover:bg-slate-50 focus:outline-none focus:bg-slate-100',
                inMonth ? '' : 'bg-slate-50/60 text-slate-400',
              ].join(' ')}
            >
              <span
                className={[
                  'text-xs sm:text-sm font-medium inline-flex items-center justify-center w-6 h-6 rounded-full',
                  isToday ? 'bg-slate-900 text-white' : '',
                ].join(' ')}
              >
                {dayNum}
              </span>
              <ul className="space-y-0.5 overflow-hidden">
                {dayEvents.slice(0, 3).map((e) => (
                  <li key={e.id}>
                    <button
                      onClick={(ev) => {
                        ev.stopPropagation();
                        onSelectEvent?.(e);
                      }}
                      className="w-full text-[11px] leading-tight truncate flex items-center gap-1 hover:underline"
                      title={e.title}
                    >
                      <span className={`inline-block w-1.5 h-1.5 rounded-full ${CATEGORY_DOT[e.category] || 'bg-slate-400'}`} />
                      <span className="truncate">{e.time ? `${e.time} ` : ''}{e.title}</span>
                    </button>
                  </li>
                ))}
                {dayEvents.length > 3 ? (
                  <li className="text-[11px] text-slate-500">+{dayEvents.length - 3} more</li>
                ) : null}
              </ul>
            </button>
          );
        })}
      </div>

      <div className="px-4 py-2 text-xs text-slate-500 min-h-[28px]">
        {loading ? 'Loading…' : error ? <span className="text-red-600">{error}</span> : null}
      </div>
    </section>
  );
}

function NavButton({ onClick, label, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="w-9 h-9 inline-flex items-center justify-center text-lg rounded-md hover:bg-slate-100"
    >
      {children}
    </button>
  );
}
