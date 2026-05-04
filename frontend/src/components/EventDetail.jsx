import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api.js';
import { getUser } from '../services/auth.js';
import { formatLongDate } from '../services/dates.js';
import EventForm from './EventForm.jsx';

const CATEGORY_LABEL = {
  appointment: 'Appointment',
  bill: 'Bill',
  reminder: 'Reminder',
  milestone: 'Milestone',
  other: 'Other',
};

export default function EventDetail({ eventId, onClose, onChanged }) {
  const [event, setEvent] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draftComment, setDraftComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const me = getUser();

  // Refresh comments every 5s while open — cheap "real-time-ish".
  const pollRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([api.getEvent(eventId), api.listComments(eventId)])
      .then(([e, c]) => {
        if (cancelled) return;
        setEvent(e.event);
        setComments(c.comments || []);
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));

    pollRef.current = setInterval(async () => {
      try {
        const c = await api.listComments(eventId);
        if (!cancelled) setComments(c.comments || []);
      } catch {
        /* ignore transient errors */
      }
    }, 5000);

    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [eventId]);

  async function handleEditSubmit(patch) {
    const { event: updated } = await api.updateEvent(eventId, patch);
    setEvent(updated);
    setEditing(false);
    onChanged?.();
  }

  async function handleDelete() {
    if (!confirm('Delete this event? This cannot be undone.')) return;
    await api.deleteEvent(eventId);
    onChanged?.();
    onClose?.();
  }

  async function handlePostComment(e) {
    e.preventDefault();
    if (!draftComment.trim()) return;
    setPostingComment(true);
    try {
      const { comment } = await api.addComment(eventId, draftComment.trim());
      setComments((prev) => [...prev, comment]);
      setDraftComment('');
    } catch (err) {
      setError(err.message);
    } finally {
      setPostingComment(false);
    }
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
          <h2 className="text-base font-semibold">{editing ? 'Edit event' : 'Event'}</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-900 text-xl leading-none w-9 h-9"
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div className="p-4 sm:p-5 space-y-5">
          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : !event ? (
            <p className="text-sm text-slate-500">Not found.</p>
          ) : editing ? (
            <EventForm
              initial={event}
              onSubmit={handleEditSubmit}
              onCancel={() => setEditing(false)}
              submitLabel="Save changes"
            />
          ) : (
            <>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  {CATEGORY_LABEL[event.category] || 'Other'}
                </p>
                <h3 className="text-xl font-semibold mt-1">{event.title}</h3>
                <p className="text-sm text-slate-600 mt-1">
                  {formatLongDate(event.date)}
                  {event.time ? ` · ${event.time}` : ' · All day'}
                </p>
              </div>
              {event.description ? (
                <p className="text-sm whitespace-pre-wrap text-slate-800">{event.description}</p>
              ) : null}
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(true)}
                  className="flex-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 py-2 text-sm font-medium"
                >
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 py-2 text-sm font-medium"
                >
                  Delete
                </button>
              </div>

              <section aria-label="Discussion" className="border-t border-slate-200 pt-4">
                <h4 className="text-sm font-semibold mb-2">Discussion</h4>
                {comments.length === 0 ? (
                  <p className="text-sm text-slate-500">No notes yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {comments.map((c) => {
                      const mine = me && c.authorId === me.id;
                      return (
                        <li
                          key={c.id}
                          className={[
                            'rounded-2xl px-3 py-2 text-sm max-w-[85%]',
                            mine
                              ? 'ml-auto bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-900',
                          ].join(' ')}
                        >
                          <p className="whitespace-pre-wrap">{c.body}</p>
                          <p className={`text-[10px] mt-1 ${mine ? 'text-blue-100' : 'text-slate-500'}`}>
                            {c.authorName} · {new Date(c.createdAt).toLocaleString()}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <form onSubmit={handlePostComment} className="mt-3 flex gap-2">
                  <input
                    value={draftComment}
                    onChange={(e) => setDraftComment(e.target.value)}
                    placeholder="Add a note…"
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={postingComment || !draftComment.trim()}
                    className="rounded-lg bg-slate-900 text-white px-3 text-sm font-medium hover:bg-slate-800 disabled:opacity-60"
                  >
                    Send
                  </button>
                </form>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
