// Shared server helpers for Vercel functions (files under api/_lib are not routes).
//
// Two separate Firebase projects are involved:
//   - the QR app project  (FIREBASE_*)          : staff logins, used to check "is this a QR-app admin?"
//   - the website project (WEBSITE_FIREBASE_*)  : website bookings, enquiries and settings
// Both are accessed with the Admin SDK, server-side only.

import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

// Accepts the key however it was pasted (.env / Vercel): literal \n, real newlines,
// Windows \r\n, wrapping quotes or a trailing "," from the JSON. Rebuilds a clean PEM.
export function normalizePrivateKey(raw) {
  let key = String(raw || '').trim();
  key = key.replace(/,\s*$/, '').trim();
  while (key.length > 1 && /^["']/.test(key) && /["']$/.test(key)) key = key.slice(1, -1).trim();
  key = key.replace(/\\n/g, '\n').replace(/\r/g, '');
  if (!key.includes('-----BEGIN PRIVATE KEY-----') || !key.includes('-----END PRIVATE KEY-----')) return key;
  const body = key
    .split('-----BEGIN PRIVATE KEY-----')[1]
    .split('-----END PRIVATE KEY-----')[0]
    .replace(/[^A-Za-z0-9+/=]/g, '');
  if (!body) return key;
  return `-----BEGIN PRIVATE KEY-----\n${body.match(/.{1,64}/g).join('\n')}\n-----END PRIVATE KEY-----\n`;
}

const cleanEmail = (v) => String(v || '').trim().replace(/^["']|["'],?$/g, '');

function initNamed(name, { projectId, clientEmail, privateKey }, missingMessage) {
  if (getApps().some((a) => a.name === name)) return getApp(name);
  const key = normalizePrivateKey(privateKey);
  if (!projectId || !clientEmail || !key.includes('BEGIN PRIVATE KEY')) throw new HttpError(503, missingMessage);
  try {
    return initializeApp({ credential: cert({ projectId, clientEmail: cleanEmail(clientEmail), privateKey: key }) }, name);
  } catch (err) {
    throw new HttpError(503, `${missingMessage} (${err?.code || 'invalid key'})`);
  }
}

/** The QR app's own project (staff accounts). */
export function qrApp() {
  return initNamed(
    'qr',
    {
      projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY,
    },
    'Server is not configured (FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY).'
  );
}

export const isWebsiteConfigured = () =>
  Boolean(process.env.WEBSITE_FIREBASE_PROJECT_ID && process.env.WEBSITE_FIREBASE_CLIENT_EMAIL && process.env.WEBSITE_FIREBASE_PRIVATE_KEY);

/** The Junio 8 website's project (bookings, enquiries, settings). */
export function websiteDb() {
  const app = initNamed(
    'website',
    {
      projectId: process.env.WEBSITE_FIREBASE_PROJECT_ID,
      clientEmail: process.env.WEBSITE_FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.WEBSITE_FIREBASE_PRIVATE_KEY,
    },
    'Website connection is not set up (WEBSITE_FIREBASE_PROJECT_ID / WEBSITE_FIREBASE_CLIENT_EMAIL / WEBSITE_FIREBASE_PRIVATE_KEY).'
  );
  return getFirestore(app);
}

/**
 * Confirms the caller is an active admin of the QR app (staff/{uid}.role == 'admin').
 * Returns { uid, email }.
 */
export async function requireQrAdmin(req) {
  const header = req.headers.get('authorization') || '';
  const idToken = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!idToken) throw new HttpError(401, 'Please sign in as admin.');

  const app = qrApp();
  let decoded;
  try {
    decoded = await getAuth(app).verifyIdToken(idToken, true);
  } catch {
    throw new HttpError(401, 'Your session has expired. Please sign in again.');
  }
  const snap = await getFirestore(app).doc(`staff/${decoded.uid}`).get();
  const me = snap.exists ? snap.data() : null;
  if (!me || me.role !== 'admin' || me.active === false) {
    throw new HttpError(403, 'Only a Junio 8 admin can do this.');
  }
  return { uid: decoded.uid, email: decoded.email || me.email || decoded.uid };
}
