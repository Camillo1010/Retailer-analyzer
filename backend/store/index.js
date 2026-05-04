// Picks the storage backend. Defaults to in-memory "demo" mode unless
// the user has explicitly configured Firebase.
//
// Demo mode triggers when:
//   - STORAGE=memory (explicit), OR
//   - FIREBASE_DATABASE_URL is not set.

function isDemoMode() {
  if (process.env.STORAGE === 'memory') return true;
  if (process.env.STORAGE === 'firebase') return false;
  return !process.env.FIREBASE_DATABASE_URL;
}

let store;
if (isDemoMode()) {
  // eslint-disable-next-line global-require
  store = require('./memory');
} else {
  // eslint-disable-next-line global-require
  store = require('./firebase');
}

module.exports = { store, isDemoMode: isDemoMode() };
