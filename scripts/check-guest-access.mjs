// Acts like a customer who is NOT signed in and checks the Firestore rules
// allow/deny the right things. Creates nothing: every write attempted here is
// one the rules are supposed to REJECT.
//
// Usage: node scripts/check-guest-access.mjs

import { loadEnv } from 'vite';
import { initializeApp } from 'firebase/app';
import { initializeFirestore, doc, getDoc, getDocs, setDoc, collection, serverTimestamp, terminate } from 'firebase/firestore';

const env = loadEnv('development', process.cwd(), '');
const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
});
const db = initializeFirestore(app, { experimentalForceLongPolling: true });

let failures = 0;
async function expect(label, shouldBeAllowed, fn) {
  let allowed = true;
  let detail = '';
  try {
    detail = (await fn()) ?? '';
  } catch (err) {
    allowed = false;
    detail = err.code || err.message;
  }
  const ok = allowed === shouldBeAllowed;
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  -> ${allowed ? 'allowed' : 'denied'} ${detail ? `(${detail})` : ''}`);
}

console.log(`Project: ${env.VITE_FIREBASE_PROJECT_ID} (guest, not signed in)\n`);

await expect('guest can read the menu', true, async () => `${(await getDocs(collection(db, 'menuItems'))).size} items`);
await expect('guest can open one table by its QR id', true, async () => `exists=${(await getDoc(doc(db, 'tables', 'does-not-exist'))).exists()}`);
await expect('guest CANNOT list all tables (would reveal QR links)', false, () => getDocs(collection(db, 'tables')));
await expect('guest CANNOT list orders', false, () => getDocs(collection(db, 'orders')));
await expect('guest CANNOT read staff', false, () => getDocs(collection(db, 'staff')));
await expect('guest CANNOT list waiter calls', false, () => getDocs(collection(db, 'waiterCalls')));

const fakeId = `ord_ruletest_${Date.now()}`;
await expect('guest CANNOT order for a table that does not exist', false, () =>
  setDoc(doc(db, 'orders', fakeId), {
    id: fakeId, orderNumber: '#T9-TEST', tableId: 'does-not-exist', tableNumber: 9,
    items: [{ itemId: 'x', name: 'Test', price: 1, qty: 1, notes: '', isVeg: true }],
    subtotal: 1, taxPercent: 5, taxAmount: 0, totalAmount: 1, customerNotes: '',
    status: 'pending', createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  })
);
await expect('guest CANNOT change the menu', false, () => setDoc(doc(db, 'menuItems', 'ruletest'), { name: 'hack', price: 0 }));
await expect('guest CANNOT create a table', false, () => setDoc(doc(db, 'tables', 'ruletest'), { tableNumber: 99 }));

console.log(`\n${failures ? `${failures} check(s) FAILED: publish the latest firestore.rules` : 'All guest checks passed.'}`);
await terminate(db);
process.exit(failures ? 1 : 0);
