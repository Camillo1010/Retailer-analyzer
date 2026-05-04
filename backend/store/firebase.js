// Firebase Realtime Database-backed store. Implements the same
// interface as backend/store/memory.js so routes don't care which is
// in use.

const bcrypt = require('bcryptjs');
const { db } = require('../firebase');

function snapToList(snap) {
  const val = snap.val() || {};
  return Object.entries(val).map(([id, v]) => ({ id, ...v }));
}

const store = {
  kind: 'firebase',

  async findUserByUsername(username) {
    const snap = await db().ref('users').orderByChild('username').equalTo(username).once('value');
    const val = snap.val();
    if (!val) return null;
    const [id, user] = Object.entries(val)[0];
    return { id, ...user };
  },
  async findUserById(id) {
    const snap = await db().ref(`users/${id}`).once('value');
    const v = snap.val();
    return v ? { id, ...v } : null;
  },
  async upsertUser({ username, password, displayName }) {
    const passwordHash = await bcrypt.hash(password, 12);
    const existing = await store.findUserByUsername(username);
    if (existing) {
      await db().ref(`users/${existing.id}`).update({
        passwordHash,
        displayName: displayName || username,
      });
      return { id: existing.id, action: 'updated' };
    }
    const ref = await db().ref('users').push({
      username,
      displayName: displayName || username,
      passwordHash,
      createdAt: Date.now(),
    });
    return { id: ref.key, action: 'created' };
  },

  async listEvents({ from, to } = {}) {
    const snap = await db().ref('events').orderByChild('date').once('value');
    let list = snapToList(snap);
    if (from) list = list.filter((e) => e.date >= from);
    if (to) list = list.filter((e) => e.date <= to);
    list.sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
    return list;
  },
  async getEvent(id) {
    const snap = await db().ref(`events/${id}`).once('value');
    const v = snap.val();
    return v ? { id, ...v } : null;
  },
  async createEvent(event) {
    const ref = await db().ref('events').push(event);
    return { id: ref.key, ...event };
  },
  async updateEvent(id, patch) {
    const ref = db().ref(`events/${id}`);
    const before = await ref.once('value');
    if (!before.exists()) return null;
    await ref.update(patch);
    const after = await ref.once('value');
    return { id, ...after.val() };
  },
  async deleteEvent(id) {
    const ref = db().ref(`events/${id}`);
    const snap = await ref.once('value');
    if (!snap.exists()) return false;
    await ref.remove();
    await db().ref(`comments/${id}`).remove();
    return true;
  },

  async listComments(eventId) {
    const snap = await db()
      .ref(`comments/${eventId}`)
      .orderByChild('createdAt')
      .once('value');
    const list = snapToList(snap);
    list.sort((a, b) => a.createdAt - b.createdAt);
    return list;
  },
  async createComment(eventId, comment) {
    const ref = await db().ref(`comments/${eventId}`).push(comment);
    return { id: ref.key, ...comment };
  },
  async getComment(eventId, commentId) {
    const snap = await db().ref(`comments/${eventId}/${commentId}`).once('value');
    const v = snap.val();
    return v ? { id: commentId, ...v } : null;
  },
  async deleteComment(eventId, commentId) {
    const ref = db().ref(`comments/${eventId}/${commentId}`);
    const snap = await ref.once('value');
    if (!snap.exists()) return false;
    await ref.remove();
    return true;
  },
};

module.exports = store;
