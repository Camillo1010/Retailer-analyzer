/**
 * One-shot seed: writes the two family users to Realtime Database
 * with bcrypt-hashed passwords. Idempotent on username.
 *
 *   cp .env.example .env  (fill in SEED_USER_*)
 *   npm run seed
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { db, initFirebase } = require('../firebase');

async function upsertUser({ username, password, displayName }) {
  if (!username || !password) {
    throw new Error('username and password are required');
  }
  const ref = db().ref('users');
  const existing = await ref.orderByChild('username').equalTo(username).once('value');
  const passwordHash = await bcrypt.hash(password, 12);

  if (existing.exists()) {
    const [id] = Object.keys(existing.val());
    await ref.child(id).update({ passwordHash, displayName: displayName || username });
    return { id, action: 'updated' };
  }
  const created = await ref.push({
    username,
    displayName: displayName || username,
    passwordHash,
    createdAt: Date.now(),
  });
  return { id: created.key, action: 'created' };
}

(async () => {
  initFirebase();
  const users = [
    {
      username: process.env.SEED_USER_1_USERNAME,
      password: process.env.SEED_USER_1_PASSWORD,
      displayName: process.env.SEED_USER_1_DISPLAY_NAME,
    },
    {
      username: process.env.SEED_USER_2_USERNAME,
      password: process.env.SEED_USER_2_PASSWORD,
      displayName: process.env.SEED_USER_2_DISPLAY_NAME,
    },
  ].filter((u) => u.username && u.password);

  for (const u of users) {
    const r = await upsertUser(u);
    // eslint-disable-next-line no-console
    console.log(`[seed] ${r.action} user ${u.username} (id=${r.id})`);
  }
  process.exit(0);
})().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
