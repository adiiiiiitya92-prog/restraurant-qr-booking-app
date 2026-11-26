// Read-only report of the tables collection: numbers, QR ids, duplicates,
// guessable sample ids and inactive tables. Changes nothing.
//
// Usage: node scripts/check-tables.mjs
// Uses the service account from .env (same as scripts/fix-staff-records.mjs).

import { loadEnv } from 'vite';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const env = loadEnv('development', process.cwd(), '');

function normalizePrivateKey(raw) {
  let key = String(raw || '').trim().replace(/,\s*$/, '').trim();
  while (key.length > 1 && /^["']/.test(key) && /["']$/.test(key)) key = key.slice(1, -1).trim();
  key = key.replace(/\\n/g, '\n').replace(/\r/g, '');
  const body = (key.split('-----BEGIN PRIVATE KEY-----')[1] || '').split('-----END PRIVATE KEY-----')[0].replace(/[^A-Za-z0-9+/=]/g, '');
  return body ? `-----BEGIN PRIVATE KEY-----\n${body.match(/.{1,64}/g).join('\n')}\n-----END PRIVATE KEY-----\n` : key;
}

const projectId = env.FIREBASE_PROJECT_ID || env.VITE_FIREBASE_PROJECT_ID;
const db = getFirestore(
  initializeApp({
    credential: cert({
      projectId,
      clientEmail: String(env.FIREBASE_CLIENT_EMAIL || '').trim().replace(/^["']|["'],?$/g, ''),
      privateKey: normalizePrivateKey(env.FIREBASE_PRIVATE_KEY),
    }),
  })
);

const base = (env.VITE_PUBLIC_SITE_URL || '').trim().replace(/\/+$/, '');
console.log(`Project: ${projectId}`);
console.log(`QR base URL: ${base || '(not set: QR codes will use whatever address the admin opens!)'}\n`);

const snap = await db.collection('tables').get();
if (snap.empty) {
  console.log('No tables in Firestore yet.');
  process.exit(0);
}

const byNumber = new Map();
const rows = snap.docs
  .map((d) => ({ id: d.id, ...d.data() }))
  .sort((a, b) => Number(a.tableNumber) - Number(b.tableNumber));

for (const t of rows) {
  const n = Number(t.tableNumber);
  byNumber.set(n, [...(byNumber.get(n) || []), t.id]);
  const flags = [];
  if (/^table_\d+$/.test(t.id)) flags.push('GUESSABLE id (click New QR)');
  if (t.isActive === false) flags.push('inactive');
  if (typeof t.tableNumber !== 'number') flags.push(`tableNumber is ${typeof t.tableNumber}`);
  console.log(`Table ${String(n).padStart(2, '0')}  ${t.id.padEnd(22)} ${flags.join(', ')}`);
}

const dups = [...byNumber.entries()].filter(([, ids]) => ids.length > 1);
console.log('');
console.log(dups.length ? `DUPLICATE table numbers: ${dups.map(([n, ids]) => `${n} -> ${ids.join(', ')}`).join(' | ')}` : 'No duplicate table numbers.');
process.exit(0);
