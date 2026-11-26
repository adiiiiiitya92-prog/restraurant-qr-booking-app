// Checks (and optionally repairs) staff/{uid} documents so they match firestore.rules:
//   role   must be the string "admin" or "kitchen"
//   active must be the BOOLEAN true/false (not the text "true")
//
// Usage:
//   node scripts/fix-staff-records.mjs          → report only, changes nothing
//   node scripts/fix-staff-records.mjs --fix    → repair text/odd values
//
// Reads FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY / VITE_FIREBASE_PROJECT_ID
// from .env via Vite's loader. Prints only uids, emails and field types; never keys.

import { loadEnv } from 'vite';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const FIX = process.argv.includes('--fix');
const env = loadEnv('development', process.cwd(), '');

function normalizePrivateKey(raw) {
  let key = String(raw || '').trim().replace(/,\s*$/, '').trim();
  while (key.length > 1 && /^["']/.test(key) && /["']$/.test(key)) key = key.slice(1, -1).trim();
  key = key.replace(/\\n/g, '\n').replace(/\r/g, '');
  const body = (key.split('-----BEGIN PRIVATE KEY-----')[1] || '').split('-----END PRIVATE KEY-----')[0].replace(/[^A-Za-z0-9+/=]/g, '');
  return body ? `-----BEGIN PRIVATE KEY-----\n${body.match(/.{1,64}/g).join('\n')}\n-----END PRIVATE KEY-----\n` : key;
}

const projectId = env.FIREBASE_PROJECT_ID || env.VITE_FIREBASE_PROJECT_ID;
const app = initializeApp({
  credential: cert({
    projectId,
    clientEmail: String(env.FIREBASE_CLIENT_EMAIL || '').trim().replace(/^["']|["'],?$/g, ''),
    privateKey: normalizePrivateKey(env.FIREBASE_PRIVATE_KEY),
  }),
});
const db = getFirestore(app);
const auth = getAuth(app);

const describe = (v) => (v === undefined ? 'missing' : `${typeof v} ${JSON.stringify(v)}`);

console.log(`Project: ${projectId}${FIX ? '  (FIX mode)' : '  (report only)'}`);
const snap = await db.collection('staff').get();
if (snap.empty) console.log('No documents in the staff collection.');

for (const doc of snap.docs) {
  const d = doc.data();
  let authInfo = 'NO matching Auth user (document id is not a real UID)';
  try {
    const u = await auth.getUser(doc.id);
    authInfo = `Auth user ${u.email}${u.disabled ? ' (disabled)' : ''}`;
  } catch {}

  const roleOk = d.role === 'admin' || d.role === 'kitchen';
  const activeOk = d.active === undefined || typeof d.active === 'boolean';
  console.log(`\nstaff/${doc.id}\n  ${authInfo}\n  role:   ${describe(d.role)} ${roleOk ? 'OK' : '<-- WRONG'}\n  active: ${describe(d.active)} ${activeOk ? 'OK' : '<-- WRONG'}`);

  if (FIX && (!roleOk || !activeOk)) {
    const update = {};
    if (!activeOk) update.active = String(d.active).trim().toLowerCase() !== 'false';
    if (!roleOk) {
      const r = String(d.role || '').trim().toLowerCase();
      if (r === 'admin' || r === 'kitchen') update.role = r;
    }
    if (Object.keys(update).length) {
      await doc.ref.update(update);
      console.log(`  fixed -> ${JSON.stringify(update)}`);
    } else {
      console.log('  could not fix automatically; set role to "admin" or "kitchen" in the console');
    }
  }
}
process.exit(0);
