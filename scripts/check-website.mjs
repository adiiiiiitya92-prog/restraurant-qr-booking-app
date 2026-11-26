// Read-only check of the Junio 8 WEBSITE connection (WEBSITE_FIREBASE_* in .env).
// Prints only counts and settings shape, never customer names or phone numbers.
// Usage: node scripts/check-website.mjs

import { loadEnv } from 'vite';

const env = loadEnv('development', process.cwd(), '');
for (const [k, v] of Object.entries(env)) if (process.env[k] === undefined) process.env[k] = v;

const { websiteDb, isWebsiteConfigured } = await import('../api/_lib/firebaseApps.js');
const { bookingStats, getSettings, listBookings, listEnquiries, nowIST, addDays } = await import('../api/_lib/website.js');

console.log(`Website project: ${process.env.WEBSITE_FIREBASE_PROJECT_ID || '(not set)'}`);
console.log(`QR app project : ${process.env.VITE_FIREBASE_PROJECT_ID}`);
if (!isWebsiteConfigured()) {
  console.log('\nWEBSITE_FIREBASE_* is not fully set in .env');
  process.exit(1);
}
if (process.env.WEBSITE_FIREBASE_PROJECT_ID === process.env.VITE_FIREBASE_PROJECT_ID) {
  console.log('\nNOTE: website and QR app point at the SAME project id. Was that intended?');
}

try {
  const db = websiteDb();
  const stats = await bookingStats(db);
  console.log('\nStats:', JSON.stringify(stats));

  const today = nowIST().date;
  const upcoming = await listBookings(db, { from: today, to: addDays(today, 30), type: '', status: '' });
  const byStatus = upcoming.reduce((m, b) => ({ ...m, [b.status]: (m[b.status] || 0) + 1 }), {});
  console.log(`Bookings next 30 days: ${upcoming.length}`, JSON.stringify(byStatus));

  const enquiries = await listEnquiries(db, { status: '' });
  console.log(`Enquiries (latest 300): ${enquiries.length}`);

  const s = await getSettings(db);
  console.log(`Settings saved on website: ${s.saved ? 'yes' : 'NO (defaults shown)'}`);
  console.log(
    `  booking ${s.settings.bookingEnabled ? 'on' : 'off'}, tables ${s.settings.tablesEnabled ? 'on' : 'off'}, ps5 ${s.settings.ps5Enabled ? 'on' : 'off'}, ` +
      `${s.settings.openTime}-${s.settings.closeTime}, tables=${s.settings.tableCount}, ps5=${s.settings.ps5Consoles}, ` +
      `closedDates=${s.settings.closedDates.length}, whatsapp ${s.settings.whatsappNumber ? 'set' : 'EMPTY'}`
  );
  console.log('\nWebsite connection OK.');
  process.exit(0);
} catch (err) {
  console.log(`\nFAILED: ${err.status ? err.message : err.code || err.message}`);
  if (/index/i.test(err.message || '')) console.log('A Firestore index is required; the error message above contains the link to create it.');
  process.exit(1);
}
