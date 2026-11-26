// Staff management for Junio 8 admins: create staff logins, edit details,
// change passwords and block / unblock accounts.
//
// Changing another person's password or disabling their login needs the
// Firebase Admin SDK, which must run on a server. Only an active Junio 8 admin
// (staff/{uid}.role == 'admin') can call this.
//
// Server env vars (Netlify → Site configuration → Environment variables, and .env for local):
//   FIREBASE_CLIENT_EMAIL   from the service-account JSON ("client_email")
//   FIREBASE_PRIVATE_KEY    from the service-account JSON ("private_key"), keep the \n
//   VITE_FIREBASE_PROJECT_ID (already set for the app)

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const ROLES = ['admin', 'kitchen'];
const MIN_PASSWORD = 8;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

// Accepts the key however it was pasted into .env / Netlify: with literal \n,
// real newlines, Windows \r\n, wrapping quotes, or a trailing "," from the JSON.
// Rebuilds a clean PEM from the base64 body.
function normalizePrivateKey(raw) {
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

function adminApp() {
  if (getApps().length) return getApps()[0];
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  const clientEmail = String(process.env.FIREBASE_CLIENT_EMAIL || '').trim().replace(/^["']|["'],?$/g, '');
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);
  if (!projectId || !clientEmail || !privateKey) {
    throw new HttpError(500, 'Staff management is not configured on the server (service account missing).');
  }
  if (!privateKey.includes('-----BEGIN PRIVATE KEY-----') || !privateKey.includes('-----END PRIVATE KEY-----')) {
    throw new HttpError(500, 'FIREBASE_PRIVATE_KEY looks incomplete. Copy the whole "private_key" value from the JSON, including BEGIN/END lines, inside double quotes.');
  }
  try {
    return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  } catch (err) {
    // err.message here describes the parse problem (e.g. "Invalid PEM formatted message"), never the key itself.
    const why = String(err?.message || '').replace(/-----BEGIN[\s\S]*?-----END[^-]*-----/g, '[key]').slice(0, 160);
    // Non-secret shape hints: a normal Firebase key body is ~1620-1700 chars with one BEGIN line.
    const raw = String(process.env.FIREBASE_PRIVATE_KEY || '');
    const begins = (raw.match(/BEGIN PRIVATE KEY/g) || []).length;
    const bodyLen = privateKey.replace(/-----[A-Z ]+-----/g, '').replace(/\s/g, '').length;
    throw new HttpError(
      500,
      `Service account key could not be read: ${why || err?.code || 'invalid key'} [key body ${bodyLen} chars, BEGIN lines: ${begins}; expected ~1620-1700 and 1]`
    );
  }
}

function cleanName(name) {
  const n = String(name || '').trim();
  if (!n) throw new HttpError(400, 'Please enter a name.');
  if (n.length > 60) throw new HttpError(400, 'Name is too long.');
  return n;
}

function cleanEmail(email) {
  const e = String(email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(e)) throw new HttpError(400, 'Please enter a valid email address.');
  return e;
}

function cleanPassword(password) {
  const p = String(password || '');
  if (p.length < MIN_PASSWORD) {
    throw new HttpError(400, `Password must be at least ${MIN_PASSWORD} characters.`);
  }
  return p;
}

function cleanRole(role) {
  if (!ROLES.includes(role)) throw new HttpError(400, 'Role must be kitchen or admin.');
  return role;
}

function friendlyFirebaseError(err) {
  switch (err?.code) {
    case 'auth/email-already-exists':
      return new HttpError(409, 'An account with this email already exists.');
    case 'auth/user-not-found':
      return new HttpError(404, 'This staff login no longer exists.');
    case 'auth/invalid-password':
      return new HttpError(400, `Password must be at least ${MIN_PASSWORD} characters.`);
    case 'auth/invalid-email':
      return new HttpError(400, 'Please enter a valid email address.');
    case 'app/invalid-credential':
      return new HttpError(500, 'Firebase rejected the service account key (app/invalid-credential). Check FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY belong to this project, and the key was not deleted.');
    default:
      if (err instanceof HttpError) return err;
      // Only the error code/type goes to the browser, never key material.
      return new HttpError(500, `Something went wrong (${err?.code || err?.name || 'unknown'}). Check the dev server terminal.`);
  }
}

async function requireAdmin(req, auth, db) {
  const header = req.headers.get('authorization') || '';
  const idToken = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!idToken) throw new HttpError(401, 'Please sign in as admin.');

  let decoded;
  try {
    decoded = await auth.verifyIdToken(idToken, true);
  } catch {
    throw new HttpError(401, 'Your session has expired. Please sign in again.');
  }

  const snap = await db.doc(`staff/${decoded.uid}`).get();
  const me = snap.exists ? snap.data() : null;
  if (!me || me.role !== 'admin' || me.active === false) {
    throw new HttpError(403, 'Only a Junio 8 admin can manage staff.');
  }
  return decoded.uid;
}

async function countActiveAdmins(db) {
  const snap = await db.collection('staff').where('role', '==', 'admin').get();
  return snap.docs.filter((d) => d.data().active !== false).length;
}

export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  try {
    const app = adminApp();
    const auth = getAuth(app);
    const db = getFirestore(app);
    const myUid = await requireAdmin(req, auth, db);

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    if (action === 'create') {
      const name = cleanName(body.name);
      const email = cleanEmail(body.email);
      const password = cleanPassword(body.password);
      const role = cleanRole(body.role || 'kitchen');

      const user = await auth.createUser({ email, password, displayName: name });
      await db.doc(`staff/${user.uid}`).set({
        uid: user.uid,
        name,
        email,
        role,
        active: true,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdBy: myUid,
      });
      return json(200, { ok: true, uid: user.uid });
    }

    // Every other action works on an existing staff member
    const uid = String(body.uid || '');
    if (!uid) throw new HttpError(400, 'Missing staff id.');
    const ref = db.doc(`staff/${uid}`);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpError(404, 'Staff member not found.');
    const current = snap.data();

    if (action === 'update') {
      const name = cleanName(body.name);
      const email = cleanEmail(body.email);
      const role = cleanRole(body.role);

      if (uid === myUid && role !== 'admin') {
        throw new HttpError(400, 'You cannot remove your own admin role.');
      }
      if (current.role === 'admin' && role !== 'admin' && (await countActiveAdmins(db)) <= 1) {
        throw new HttpError(400, 'At least one active admin is needed.');
      }

      await auth.updateUser(uid, { email, displayName: name });
      await ref.update({ name, email, role, updatedAt: FieldValue.serverTimestamp() });
      if (current.role !== role) await auth.revokeRefreshTokens(uid); // pick up the new role
      return json(200, { ok: true });
    }

    if (action === 'setPassword') {
      const password = cleanPassword(body.password);
      await auth.updateUser(uid, { password });
      if (uid !== myUid) await auth.revokeRefreshTokens(uid); // sign them out everywhere
      await ref.update({ passwordChangedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
      return json(200, { ok: true });
    }

    if (action === 'setBlocked') {
      const blocked = Boolean(body.blocked);
      if (uid === myUid && blocked) throw new HttpError(400, 'You cannot block your own account.');
      if (blocked && current.role === 'admin' && current.active !== false && (await countActiveAdmins(db)) <= 1) {
        throw new HttpError(400, 'At least one active admin is needed.');
      }

      await auth.updateUser(uid, { disabled: blocked });
      if (blocked) await auth.revokeRefreshTokens(uid);
      await ref.update({ active: !blocked, updatedAt: FieldValue.serverTimestamp() });
      return json(200, { ok: true });
    }

    throw new HttpError(400, 'Unknown action.');
  } catch (err) {
    const e = friendlyFirebaseError(err);
    if (e.status >= 500) console.error('staff-admin error:', err);
    return json(e.status, { error: e.message });
  }
};
