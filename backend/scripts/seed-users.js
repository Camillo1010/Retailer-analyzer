/**
 * Seed users into whichever store is configured.
 *
 *   cp .env.example .env  (fill in SEED_USER_*)
 *   npm run seed
 *
 * In demo (memory) mode, this script just shows the hardcoded demo
 * users — `npm run dev` already seeds them on startup. The script is
 * primarily useful in Firebase mode.
 */
require('dotenv').config();
const { store, isDemoMode } = require('../store');

(async () => {
  if (isDemoMode) {
    // eslint-disable-next-line no-console
    console.log('[seed] demo mode — users are auto-created on `npm run dev`.');
    console.log('[seed]   alex / demo');
    console.log('[seed]   sam  / demo');
    process.exit(0);
  }

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
    const r = await store.upsertUser(u);
    // eslint-disable-next-line no-console
    console.log(`[seed] ${r.action} user ${u.username} (id=${r.id})`);
  }
  process.exit(0);
})().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
