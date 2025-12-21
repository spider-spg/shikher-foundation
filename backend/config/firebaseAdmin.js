const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    const serviceAccountPath = path.join(__dirname, '../../ServiceAccountKey.json');

    // Helper to normalize keys for admin.credential.cert
    const normalizeCred = (obj) => {
      if (!obj) return null;
      const projectId = obj.project_id || obj.projectId || process.env.FIREBASE_PROJECT_ID;
      const clientEmail = obj.client_email || obj.clientEmail || process.env.FIREBASE_CLIENT_EMAIL;
      let privateKey = obj.private_key || obj.privateKey || process.env.FIREBASE_PRIVATE_KEY;
      if (typeof privateKey === 'string') privateKey = privateKey.replace(/\\n/g, '\n');
      if (!projectId || !clientEmail || !privateKey) return null;
      return { projectId, clientEmail, privateKey };
    };

    let certObj = null;

    // 1) Prefer explicit JSON provided via env var (useful in CI or hosting platforms)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        certObj = normalizeCred(parsed);
        if (!certObj) throw new Error('FIREBASE_SERVICE_ACCOUNT missing required keys');
        admin.initializeApp({ credential: admin.credential.cert(certObj) });
        console.log('Firebase Admin initialized with FIREBASE_SERVICE_ACCOUNT env var');
      } catch (e) {
        throw new Error('Invalid JSON in FIREBASE_SERVICE_ACCOUNT: ' + e.message);
      }
    }

    // 2) GOOGLE_APPLICATION_CREDENTIALS path (common on GCP)
    if (!certObj && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      try {
        const creds = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
        certObj = normalizeCred(creds);
        if (!certObj) throw new Error('Credentials file missing required keys');
        admin.initializeApp({ credential: admin.credential.cert(certObj) });
        console.log('Firebase Admin initialized with GOOGLE_APPLICATION_CREDENTIALS file');
      } catch (e) {
        throw new Error('Failed to load GOOGLE_APPLICATION_CREDENTIALS: ' + e.message);
      }
    }

    // 3) ServiceAccountKey.json next to repo root
    if (!certObj && fs.existsSync(serviceAccountPath)) {
      try {
        const raw = fs.readFileSync(serviceAccountPath, 'utf8');
        const parsed = JSON.parse(raw);
        certObj = normalizeCred(parsed);
        if (!certObj) throw new Error('ServiceAccountKey.json missing required keys');
        admin.initializeApp({ credential: admin.credential.cert(certObj) });
        console.log('Firebase Admin initialized with ServiceAccountKey.json');
      } catch (e) {
        throw new Error('Failed to parse ServiceAccountKey.json: ' + e.message);
      }
    }

    // 4) Last-resort: separate env vars for pieces
    if (!certObj) {
      const fallback = normalizeCred({
        project_id: process.env.FIREBASE_PROJECT_ID,
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        private_key: process.env.FIREBASE_PRIVATE_KEY,
      });
      if (fallback) {
        admin.initializeApp({ credential: admin.credential.cert(fallback) });
        console.log('Firebase Admin initialized with FIREBASE_* env vars');
      } else {
        throw new Error('No valid Firebase credentials found. Provide ServiceAccountKey.json or set FIREBASE_SERVICE_ACCOUNT / GOOGLE_APPLICATION_CREDENTIALS / FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY.');
      }
    }

  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
    process.exit(1);
  }
}

// Export Firebase services
const auth = admin.auth();
const firestore = admin.firestore();
const db = firestore;
const FieldValue = admin.firestore.FieldValue;

// Set Firestore settings
firestore.settings({
  timestampsInSnapshots: true
});

module.exports = {
  admin,
  auth,
  firestore,
  db,
  FieldValue
};