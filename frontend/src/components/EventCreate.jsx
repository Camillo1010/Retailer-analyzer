import { api } from '../services/api.js';
import EventForm from './EventForm.jsx';
import { todayISO } from '../services/dates.js';

export default function EventCreate({ initialDate, onClose, onCreated }) {
  async function handleSubmit(values) {
    const { event } = await api.createEvent(values);
    onCreated?.(event);
    onClose?.();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 px-0 sm:px-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">New event</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-900 text-xl leading-none w-9 h-9"
            aria-label="Close"
          >
            ×
          </button>
        </header>
        <div className="p-4 sm:p-5">
          <EventForm
            initial={{ date: initialDate || todayISO() }}
            onSubmit={handleSubmit}
            onCancel={onClose}
            submitLabel="Create event"
          />
        </div>
      </div>
    </div>
  );
}
