const admin = require("firebase-admin");

if (!admin.apps.length) {
  try {
    // Try env var first (production), then fall back to file (local dev)
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
      : require("./serviceAccount.json");

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (err) {
    console.warn("⚠️ Firebase Admin init failed:", err.message);
    console.warn("Push notifications and auth verification will not work.");
    // Initialize without credentials so the app doesn't crash
    admin.initializeApp();
  }
}

module.exports = admin;