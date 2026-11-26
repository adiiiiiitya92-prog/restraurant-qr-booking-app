// Brings the Junio 8 WEBSITE's admin data into the QR app's admin panel:
// table/PS5 bookings, enquiries, dashboard stats and website settings.
//
// Only an active QR-app admin may call this. It reads/writes the website's own
// Firebase project with the Admin SDK (the website's Firestore stays locked to
// browsers). Rules are the same as the website's own admin (see _lib/website.js).
//
// Server env vars (Vercel → Project → Settings → Environment Variables, and .env locally):
//   WEBSITE_FIREBASE_PROJECT_ID, WEBSITE_FIREBASE_CLIENT_EMAIL, WEBSITE_FIREBASE_PRIVATE_KEY
//   (copy FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY from the website's .env)
//   plus the QR app's FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY to check who is calling.

import { HttpError, json, requireQrAdmin, websiteDb, isWebsiteConfigured } from './_lib/firebaseApps.js';
import {
  TYPES, STATUSES, ENQUIRY_STATUSES, nowIST, addDays,
  bookingStats, listBookings, setBookingStatus, listEnquiries, updateEnquiry, getSettings, saveSettings,
} from './_lib/website.js';

export async function POST(req) {
  try {
    const admin = await requireQrAdmin(req);
    const body = await req.json().catch(() => ({}));
    const { action } = body;

    if (action === 'status') return json(200, { configured: isWebsiteConfigured() });

    const db = websiteDb();
    const by = `${admin.email} (QR app)`;

    switch (action) {
      case 'stats':
        return json(200, await bookingStats(db));

      case 'listBookings': {
        const today = nowIST().date;
        const from = String(body.from || today);
        const to = String(body.to || addDays(from, 7));
        const type = TYPES.includes(body.type) ? body.type : '';
        const status = STATUSES.includes(body.status) ? body.status : '';
        return json(200, { from, to, bookings: await listBookings(db, { from, to, type, status }) });
      }

      case 'updateBooking':
        return json(200, {
          ok: true,
          booking: await setBookingStatus(db, String(body.ref || ''), { status: body.status, adminNote: body.adminNote }, by),
        });

      case 'listEnquiries': {
        const status = ENQUIRY_STATUSES.includes(body.status) ? body.status : '';
        return json(200, { enquiries: await listEnquiries(db, { status }) });
      }

      case 'updateEnquiry':
        return json(200, {
          ok: true,
          enquiry: await updateEnquiry(db, String(body.id || ''), { status: body.status, adminNote: body.adminNote }, by),
        });

      case 'getSettings':
        return json(200, await getSettings(db));

      case 'saveSettings':
        return json(200, { ok: true, ...(await saveSettings(db, body.settings, by)) });

      default:
        throw new HttpError(400, 'Unknown action.');
    }
  } catch (err) {
    if (err instanceof HttpError) return json(err.status, { error: err.message });
    console.error('website-admin error:', err);
    const hint = err?.code === 9 || /index/i.test(err?.message || '') ? ' (Firestore index needed: see the server log for the link)' : '';
    return json(500, { error: `Something went wrong${hint}. Please try again.` });
  }
}
