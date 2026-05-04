// In-memory store. Data lives only in process memory and disappears
// on restart. Used for the no-config demo mode.

const bcrypt = require('bcryptjs');

const users = new Map(); // userId -> user
const events = new Map(); // eventId -> event
const comments = new Map(); // eventId -> Map<commentId, comment>

let counter = 0;
function genId(prefix) {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter}`;
}

const store = {
  kind: 'memory',

  async findUserByUsername(username) {
    for (const u of users.values()) {
      if (u.username === username) return { ...u };
    }
    return null;
  },
  async findUserById(id) {
    const u = users.get(id);
    return u ? { ...u } : null;
  },
  async upsertUser({ username, password, displayName }) {
    // bcrypt cost 10 (vs 12 for prod) — faster startup in demo.
    const passwordHash = await bcrypt.hash(password, 10);
    const existing = await store.findUserByUsername(username);
    if (existing) {
      const updated = {
        ...users.get(existing.id),
        passwordHash,
        displayName: displayName || username,
      };
      users.set(existing.id, updated);
      return { id: existing.id, action: 'updated' };
    }
    const id = genId('u');
    users.set(id, {
      id,
      username,
      displayName: displayName || username,
      passwordHash,
      createdAt: Date.now(),
    });
    return { id, action: 'created' };
  },

  async listEvents({ from, to } = {}) {
    let list = [...events.values()];
    if (from) list = list.filter((e) => e.date >= from);
    if (to) list = list.filter((e) => e.date <= to);
    list.sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
    return list;
  },
  async getEvent(id) {
    const e = events.get(id);
    return e ? { ...e } : null;
  },
  async createEvent(event) {
    const id = genId('e');
    const stored = { id, ...event };
    events.set(id, stored);
    return stored;
  },
  async updateEvent(id, patch) {
    const existing = events.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...patch };
    events.set(id, updated);
    return updated;
  },
  async deleteEvent(id) {
    const had = events.delete(id);
    comments.delete(id);
    return had;
  },

  async listComments(eventId) {
    const map = comments.get(eventId);
    if (!map) return [];
    return [...map.values()].sort((a, b) => a.createdAt - b.createdAt);
  },
  async createComment(eventId, comment) {
    let map = comments.get(eventId);
    if (!map) {
      map = new Map();
      comments.set(eventId, map);
    }
    const id = genId('c');
    const stored = { id, ...comment };
    map.set(id, stored);
    return stored;
  },
  async getComment(eventId, commentId) {
    const map = comments.get(eventId);
    if (!map) return null;
    const c = map.get(commentId);
    return c ? { ...c } : null;
  },
  async deleteComment(eventId, commentId) {
    const map = comments.get(eventId);
    if (!map) return false;
    return map.delete(commentId);
  },
};

module.exports = store;
