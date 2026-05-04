import { useCallback, useEffect, useState } from 'react';
import Login from './components/Login.jsx';
import Calendar from './components/Calendar.jsx';
import Dashboard from './components/Dashboard.jsx';
import EventDetail from './components/EventDetail.jsx';
import EventCreate from './components/EventCreate.jsx';
import { clearSession, getUser, isAuthenticated } from './services/auth.js';
import { api } from './services/api.js';
import {
  notificationsEnabled,
  requestPermission,
  startNotifications,
  stopNotifications,
} from './services/notifications.js';

export default function App() {
  const [user, setUser] = useState(getUser());
  const [tab, setTab] = useState('dashboard');
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [createDate, setCreateDate] = useState(null);
  const [creating, setCreating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [notifyReady, setNotifyReady] = useState(notificationsEnabled());

  useEffect(() => {
    function onExpired() {
      setUser(null);
    }
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, []);

  // Validate token on load.
  useEffect(() => {
    if (!isAuthenticated()) return;
    api.me().catch(() => {
      clearSession();
      setUser(null);
    });
  }, []);

  useEffect(() => {
    if (user && notifyReady) startNotifications();
    return () => stopNotifications();
  }, [user, notifyReady]);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  function handleLogout() {
    clearSession();
    stopNotifications();
    setUser(null);
  }

  async function enableNotifications() {
    const result = await requestPermission();
    if (result === 'granted') setNotifyReady(true);
  }

  if (!user) {
    return <Login onLoggedIn={(u) => setUser(u)} />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-base font-semibold">Family Calendar</h1>
          <div className="flex items-center gap-2">
            {!notifyReady ? (
              <button
                onClick={enableNotifications}
                className="text-xs rounded-md px-2 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100"
              >
                Enable notifications
              </button>
            ) : null}
            <span className="text-sm text-slate-600 hidden sm:inline">
              {user.displayName || user.username}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm rounded-md px-2 py-1.5 hover:bg-slate-100"
            >
              Sign out
            </button>
          </div>
        </div>
        <nav className="max-w-3xl mx-auto px-4 -mb-px flex gap-1 border-b border-transparent">
          <TabButton active={tab === 'dashboard'} onClick={() => setTab('dashboard')}>
            Today
          </TabButton>
          <TabButton active={tab === 'calendar'} onClick={() => setTab('calendar')}>
            Calendar
          </TabButton>
        </nav>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-4 sm:py-6">
        <div key={refreshKey}>
          {tab === 'dashboard' ? (
            <Dashboard
              onSelectEvent={(e) => setSelectedEventId(e.id)}
              onAddEvent={() => {
                setCreateDate(null);
                setCreating(true);
              }}
            />
          ) : (
            <Calendar
              onSelectDate={(date) => {
                setCreateDate(date);
                setCreating(true);
              }}
              onSelectEvent={(e) => setSelectedEventId(e.id)}
            />
          )}
        </div>
      </main>

      {selectedEventId ? (
        <EventDetail
          eventId={selectedEventId}
          onClose={() => setSelectedEventId(null)}
          onChanged={refresh}
        />
      ) : null}

      {creating ? (
        <EventCreate
          initialDate={createDate}
          onClose={() => setCreating(false)}
          onCreated={() => refresh()}
        />
      ) : null}
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={[
        'px-3 py-2 text-sm font-medium rounded-t-md',
        active ? 'border-b-2 border-slate-900 text-slate-900' : 'text-slate-500 hover:text-slate-900',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
