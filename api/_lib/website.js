// Admin-side logic for the Junio 8 WEBSITE's data (bookings, enquiries, settings).
//
// Ported from the website repo (junio8foxwebsite/server/bookings.js, enquiries.js,
// settings.js) so both admin panels follow exactly the same rules: same statuses,
// same capacity check when re-opening a booking, same settings validation.
// If you change a rule there, change it here too.

import { FieldValue } from 'firebase-admin/firestore';
import { HttpError } from './firebaseApps.js';

/* ---------- constants (keep in sync with the website) ---------- */
export const TYPES = ['table', 'ps5'];
export const STATUSES = ['pending', 'confirmed', 'completed', 'no_show', 'cancelled'];
export const ENQUIRY_STATUSES = ['new', 'contacted', 'closed'];

const TIME_ZONE = 'Asia/Kolkata';
const STEP = 30; // minutes per slot
const MIN_NOTICE = 30;
const LAST_TABLE_BEFORE_CLOSE = 30;
const PS5_DURATIONS = [30, 60, 90, 120, 180];

/* ---------- time helpers (India time) ---------- */
const partsFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});
export function nowIST() {
  const p = Object.fromEntries(partsFmt.formatToParts(new Date()).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
}
export function addDays(iso, days) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export const isRealDate = (iso) =>
  /^\d{4}-\d{2}-\d{2}$/.test(iso) && new Date(iso + 'T00:00:00Z').toISOString().slice(0, 10) === iso;

const clean = (v, max) =>
  String(v ?? '').replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

const toHHMM = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const toMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };

const tsToISO = (v) => v?.toDate?.().toISOString() ?? null;
const toJSON = (doc) => {
  const d = doc.data();
  const { userAgent: _ua, ...rest } = d;
  return { ...rest, id: doc.id, createdAt: tsToISO(d.createdAt), updatedAt: tsToISO(d.updatedAt) };
};

/* ---------- settings ---------- */
// Used only if the website has never saved settings/site. The website's own
// defaults come from ITS .env, so the UI warns the admin before saving these.
const envInt = (name, fallback) => {
  const n = Number.parseInt(process.env[name], 10);
  return Number.isFinite(n) ? n : fallback;
};
export const DEFAULTS = Object.freeze({
  bookingEnabled: true,
  tablesEnabled: true,
  ps5Enabled: true,
  whatsappNumber: String(process.env.WEBSITE_WHATSAPP_NUMBER || '').replace(/\D/g, ''),
  openTime: process.env.WEBSITE_OPEN_TIME || '13:30',
  closeTime: process.env.WEBSITE_CLOSE_TIME || '23:30',
  ps5Consoles: envInt('WEBSITE_PS5_CONSOLES', 1),
  tableCount: envInt('WEBSITE_TABLE_COUNT', 6),
  tableDuration: envInt('WEBSITE_TABLE_DURATION_MIN', 90),
  daysAhead: envInt('WEBSITE_DAYS_AHEAD', 30),
  closedDates: [],
  announcement: { enabled: false, text: '' },
});

function resolve(s) {
  return {
    ...s,
    open: toMin(s.openTime),
    close: toMin(s.closeTime),
    step: STEP,
    minNotice: MIN_NOTICE,
    lastTableBeforeClose: LAST_TABLE_BEFORE_CLOSE,
    ps5Durations: PS5_DURATIONS,
    timeZone: TIME_ZONE,
  };
}

const bool = (v, d) => (typeof v === 'boolean' ? v : d);
const int = (v, min, max, name) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw new HttpError(400, `${name} must be a whole number from ${min} to ${max}.`);
  return n;
};

/** Same validation as the website's settings.js sanitize(). */
export function sanitizeSettings(input, { lenient = false } = {}) {
  const src = input && typeof input === 'object' ? input : {};
  const out = {};
  const field = (key, fn) => {
    try { out[key] = fn(src[key]); } catch (err) { if (!lenient) throw err; out[key] = DEFAULTS[key]; }
  };

  field('bookingEnabled', (v) => bool(v, DEFAULTS.bookingEnabled));
  field('tablesEnabled', (v) => bool(v, DEFAULTS.tablesEnabled));
  field('ps5Enabled', (v) => bool(v, DEFAULTS.ps5Enabled));
  field('whatsappNumber', (v) => {
    const d = String(v ?? '').replace(/\D/g, '');
    if (d && !/^\d{10,15}$/.test(d)) throw new HttpError(400, 'WhatsApp number must include the country code, e.g. 919876543210.');
    return d.length === 10 ? '91' + d : d;
  });
  const time = (name) => (v) => {
    const s = String(v ?? '');
    if (!/^([01]\d|2[0-3]):(00|30)$/.test(s)) throw new HttpError(400, `${name} must be on the hour or half hour, e.g. 13:30.`);
    return s;
  };
  field('openTime', time('Opening time'));
  field('closeTime', time('Closing time'));
  if (toMin(out.closeTime) - toMin(out.openTime) < 60) {
    if (!lenient) throw new HttpError(400, 'Closing time must be at least 1 hour after opening time.');
    out.openTime = DEFAULTS.openTime; out.closeTime = DEFAULTS.closeTime;
  }
  field('ps5Consoles', (v) => int(v, 1, 50, 'PS5 consoles'));
  field('tableCount', (v) => int(v, 1, 200, 'Tables'));
  field('tableDuration', (v) => {
    const n = int(v, 30, 360, 'Table time');
    if (n % 30) throw new HttpError(400, 'Table time must be in steps of 30 minutes.');
    return n;
  });
  field('daysAhead', (v) => int(v, 1, 180, 'Booking window'));
  field('closedDates', (v) => {
    if (!Array.isArray(v)) throw new HttpError(400, 'Closed dates must be a list.');
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(new Date());
    const list = [...new Set(v.map(String).filter(isRealDate))].filter((d) => d >= today).sort();
    if (list.length > 120) throw new HttpError(400, 'Too many closed dates (max 120).');
    return list;
  });
  field('announcement', (v) => {
    const a = v && typeof v === 'object' ? v : {};
    const text = String(a.text ?? '').replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim();
    if (text.length > 160) throw new HttpError(400, 'Announcement must be 160 characters or fewer.');
    return { enabled: bool(a.enabled, false) && text.length > 0, text };
  });
  return out;
}

/** Returns { settings, saved } where saved=false means the website never stored settings yet. */
export async function getSettings(db) {
  const snap = await db.collection('settings').doc('site').get();
  const saved = snap.exists ? snap.data() : {};
  const settings = sanitizeSettings({ ...DEFAULTS, ...saved }, { lenient: true });
  return { settings, saved: snap.exists, updatedAt: tsToISO(saved.updatedAt), updatedBy: saved.updatedBy || null };
}

export async function saveSettings(db, input, adminEmail) {
  const cleanSettings = sanitizeSettings(input);
  await db.collection('settings').doc('site').set({
    ...cleanSettings,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: adminEmail,
  });
  return getSettings(db);
}

/* ---------- bookings ---------- */
const capacityOf = (type, S) => (type === 'ps5' ? S.ps5Consoles : S.tableCount);
const HOLDS_SLOT = (b) => b.status !== 'cancelled' && b.status !== 'no_show';

function occupancy(bookings, step) {
  const load = {};
  for (const b of bookings.filter(HOLDS_SLOT)) {
    for (let t = b.start; t < b.end; t += step) load[t] = (load[t] || 0) + 1;
  }
  return load;
}
const fits = (load, start, end, capacity, step) => {
  for (let t = start; t < end; t += step) if ((load[t] || 0) >= capacity) return false;
  return true;
};
const dayQuery = (db, type, date) => db.collection('bookings').where('type', '==', type).where('date', '==', date);

export async function listBookings(db, { from, to, type, status }) {
  if (!isRealDate(from) || !isRealDate(to) || from > to) throw new HttpError(400, 'Pick a valid date range.');
  if (addDays(from, 93) < to) throw new HttpError(400, 'Date range can be at most 3 months.');
  const snap = await db.collection('bookings').where('date', '>=', from).where('date', '<=', to).limit(2000).get();
  return snap.docs
    .map(toJSON)
    .filter((b) => (!type || b.type === type) && (!status || b.status === status))
    .sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start || a.type.localeCompare(b.type));
}

/** Same as the website: re-activating a cancelled / no-show booking re-checks capacity. */
export async function setBookingStatus(db, ref, { status, adminNote }, adminEmail) {
  if (!/^J8-[A-Z2-9]{6}$/.test(String(ref))) throw new HttpError(400, 'Invalid booking ID.');
  const update = {};
  if (status !== undefined) {
    if (!STATUSES.includes(status)) throw new HttpError(400, 'Invalid status.');
    update.status = status;
  }
  if (adminNote !== undefined) update.adminNote = clean(adminNote, 300);
  if (!Object.keys(update).length) throw new HttpError(400, 'Nothing to update.');

  const S = resolve((await getSettings(db)).settings);
  const bookingRef = db.collection('bookings').doc(ref);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(bookingRef);
    if (!snap.exists) throw new HttpError(404, 'Booking not found.');
    const b = snap.data();
    if (update.status && !HOLDS_SLOT(b) && HOLDS_SLOT(update)) {
      const lockRef = db.collection('slotLocks').doc(`${b.type}_${b.date}`);
      await tx.get(lockRef);
      const day = await tx.get(dayQuery(db, b.type, b.date));
      const others = day.docs.filter((d) => d.id !== ref).map((d) => d.data());
      if (!fits(occupancy(others, S.step), b.start, b.end, capacityOf(b.type, S), S.step)) {
        throw new HttpError(409, "That slot is now full, so this booking can't be re-activated.");
      }
      tx.set(lockRef, { updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    }
    tx.update(bookingRef, { ...update, updatedAt: FieldValue.serverTimestamp(), updatedBy: adminEmail });
  });
  return toJSON(await bookingRef.get());
}

export async function bookingStats(db) {
  const today = nowIST().date;
  const [todaySnap, pendingSnap, newEnq] = await Promise.all([
    db.collection('bookings').where('date', '==', today).get(),
    db.collection('bookings').where('status', '==', 'pending').limit(1000).get(),
    db.collection('enquiries').where('status', '==', 'new').count().get(),
  ]);
  const todays = todaySnap.docs.map((d) => d.data()).filter(HOLDS_SLOT);
  return {
    today,
    todayTotal: todays.length,
    todayTables: todays.filter((b) => b.type === 'table').length,
    todayPs5: todays.filter((b) => b.type === 'ps5').length,
    pendingUpcoming: pendingSnap.docs.map((d) => d.data()).filter((b) => b.date >= today).length,
    newEnquiries: newEnq.data().count,
  };
}

/* ---------- enquiries ---------- */
export async function listEnquiries(db, { status }) {
  const snap = await db.collection('enquiries').orderBy('createdAt', 'desc').limit(300).get();
  return snap.docs.map(toJSON).filter((e) => !status || e.status === status);
}

export async function updateEnquiry(db, id, { status, adminNote }, adminEmail) {
  if (!/^[A-Za-z0-9]{10,40}$/.test(String(id))) throw new HttpError(400, 'Invalid enquiry ID.');
  const update = {};
  if (status !== undefined) {
    if (!ENQUIRY_STATUSES.includes(status)) throw new HttpError(400, 'Invalid status.');
    update.status = status;
  }
  if (adminNote !== undefined) update.adminNote = clean(adminNote, 300);
  if (!Object.keys(update).length) throw new HttpError(400, 'Nothing to update.');
  const ref = db.collection('enquiries').doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpError(404, 'Enquiry not found.');
  await ref.update({ ...update, updatedAt: FieldValue.serverTimestamp(), updatedBy: adminEmail });
  return toJSON(await ref.get());
}
