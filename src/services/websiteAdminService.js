// Talks to api/website-admin.js, which manages the Junio 8 WEBSITE's data
// (table/PS5 bookings, enquiries, settings) from this admin panel.

import { auth } from './firebase';

const ENDPOINT = '/api/website-admin';

export class WebsiteNotConfiguredError extends Error {}

export async function callWebsiteAdmin(action, payload = {}) {
  const user = auth?.currentUser;
  if (!user) throw new Error('Please sign in as admin.');
  const idToken = await user.getIdToken();

  let res;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ action, ...payload }),
    });
  } catch {
    throw new Error('Could not reach the server. Check the internet connection.');
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 503 && /Website connection is not set up/i.test(data?.error || '')) {
      throw new WebsiteNotConfiguredError(data.error);
    }
    if (res.status === 404 && !data) throw new Error('Server function not found (/api/website-admin). Restart the dev server or redeploy.');
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}

export const getWebsiteStats = () => callWebsiteAdmin('stats');
export const listWebsiteBookings = (filters) => callWebsiteAdmin('listBookings', filters);
export const updateWebsiteBooking = (ref, changes) => callWebsiteAdmin('updateBooking', { ref, ...changes });
export const listWebsiteEnquiries = (status = '') => callWebsiteAdmin('listEnquiries', { status });
export const updateWebsiteEnquiry = (id, changes) => callWebsiteAdmin('updateEnquiry', { id, ...changes });
export const getWebsiteSettings = () => callWebsiteAdmin('getSettings');
export const saveWebsiteSettings = (settings) => callWebsiteAdmin('saveSettings', { settings });

/* ---------- display helpers (same wording as the website's admin) ---------- */
export const STATUS_LABEL = {
  pending: 'Pending', confirmed: 'Confirmed', completed: 'Completed', no_show: 'No-show', cancelled: 'Cancelled',
  new: 'New', contacted: 'Contacted', closed: 'Closed',
};

export const STATUS_STYLE = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  completed: 'bg-slate-100 text-slate-700 border-slate-200',
  no_show: 'bg-rose-50 text-rose-700 border-rose-200',
  cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
  new: 'bg-amber-100 text-amber-800 border-amber-200',
  contacted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  closed: 'bg-slate-100 text-slate-700 border-slate-200',
};

export const fmt12 = (m) => `${((Math.floor(m / 60) + 11) % 12) + 1}:${String(m % 60).padStart(2, '0')} ${m % 1440 >= 720 ? 'PM' : 'AM'}`;

export function niceDate(iso) {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00+05:30`);
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
}

export function niceDateTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });
}

export const durationLabel = (min) => (min >= 60 ? `${min / 60} hr${min > 60 ? 's' : ''}`.replace('.5 hr', '½ hr') : `${min} min`);

export const todayIST = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
export function addDaysISO(iso, days) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const whatsappLink = (phone, text) => `https://wa.me/91${encodeURIComponent(phone)}?text=${encodeURIComponent(text)}`;

const what = (b) => (b.type === 'ps5' ? 'PS5 slot' : 'table');

export function bookingConfirmMessage(b) {
  return (
    `Hi ${b.name}! Your Junio 8 ${what(b)} booking is confirmed ✅\n\n` +
    `Date: ${niceDate(b.date)}\nTime: ${b.timeLabel}\n` +
    (b.type === 'table' ? `Guests: ${b.guests}\n` : `Players: ${b.players}\n`) +
    `Booking ID: ${b.ref}\n\nSee you soon! – Junio 8 Café, Trimurti Nagar`
  );
}

export function bookingCancelMessage(b) {
  return `Hi ${b.name}, sorry, we can't take your Junio 8 ${what(b)} booking for ${niceDate(b.date)} at ${fmt12(b.start)} (ID ${b.ref}). Reply here and we'll help you find another time.`;
}
