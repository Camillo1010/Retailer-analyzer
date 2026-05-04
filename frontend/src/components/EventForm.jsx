import { useEffect, useState } from 'react';

const CATEGORIES = [
  { value: 'appointment', label: 'Appointment' },
  { value: 'bill', label: 'Bill' },
  { value: 'reminder', label: 'Reminder' },
  { value: 'milestone', label: 'Milestone' },
  { value: 'other', label: 'Other' },
];

const REMINDERS = [
  { value: '1d', label: '1 day before' },
  { value: '1h', label: '1 hour before' },
  { value: 'at-time', label: 'At time of event' },
];

export default function EventForm({ initial, onSubmit, onCancel, submitLabel = 'Save' }) {
  const [title, setTitle] = useState(initial?.title || '');
  const [date, setDate] = useState(initial?.date || '');
  const [time, setTime] = useState(initial?.time || '');
  const [category, setCategory] = useState(initial?.category || 'appointment');
  const [description, setDescription] = useState(initial?.description || '');
  const [reminders, setReminders] = useState(initial?.reminders || []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initial) {
      setTitle(initial.title || '');
      setDate(initial.date || '');
      setTime(initial.time || '');
      setCategory(initial.category || 'appointment');
      setDescription(initial.description || '');
      setReminders(initial.reminders || []);
    }
  }, [initial]);

  function toggleReminder(value) {
    setReminders((prev) =>
      prev.includes(value) ? prev.filter((r) => r !== value) : [...prev, value]
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        title: title.trim(),
        date,
        time: time || null,
        category,
        description: description.trim(),
        reminders,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Title">
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
          placeholder="Dentist appointment"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date">
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </Field>
        <Field label="Time (optional)">
          <input
            type="time"
            value={time || ''}
            onChange={(e) => setTime(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </Field>
      </div>
      <Field label="Category">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Description">
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
          placeholder="Notes…"
        />
      </Field>
      <Field label="Reminders">
        <div className="space-y-1.5">
          {REMINDERS.map((r) => (
            <label key={r.value} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={reminders.includes(r.value)}
                onChange={() => toggleReminder(r.value)}
                className="rounded border-slate-300"
              />
              {r.label}
            </label>
          ))}
        </div>
      </Field>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={busy}
          className="flex-1 rounded-lg bg-slate-900 text-white py-2.5 font-medium hover:bg-slate-800 disabled:opacity-60"
        >
          {busy ? 'Saving…' : submitLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg bg-slate-100 text-slate-700 py-2.5 font-medium hover:bg-slate-200"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1">{label}</span>
      {children}
    </label>
  );
}
