const admin = require('firebase-admin');

let initialized = false;

function initFirebase() {
  if (initialized) return admin;

  const databaseURL = process.env.FIREBASE_DATABASE_URL;
  if (!databaseURL) {
    throw new Error('FIREBASE_DATABASE_URL is not set');
  }

  let credential;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    credential = admin.credential.cert(parsed);
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    credential = admin.credential.applicationDefault();
  } else {
    throw new Error(
      'No Firebase credentials. Set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS.'
    );
  }

  admin.initializeApp({ credential, databaseURL });
  initialized = true;
  return admin;
}

function db() {
  initFirebase();
  return admin.database();
}

module.exports = { initFirebase, db, admin };
