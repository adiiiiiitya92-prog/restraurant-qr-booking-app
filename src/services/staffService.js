// Staff management (admin only).
// The list is read live from Firestore (rules allow admins to list staff).
// Creating logins, editing, password changes and blocking go through the
// Vercel function api/staff-admin.js, because they need the
// Firebase Admin SDK.

import { collection, onSnapshot } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from './firebase';

const ENDPOINT = '/api/staff-admin';

export function subscribeStaff(callback, onError) {
  if (!isFirebaseConfigured || !db) {
    callback([]);
    return () => {};
  }
  try {
    return onSnapshot(
      collection(db, 'staff'),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ ...d.data(), uid: d.id }))
          .sort((a, b) => {
            if (a.role !== b.role) return a.role === 'admin' ? -1 : 1;
            return String(a.name || '').localeCompare(String(b.name || ''));
          });
        callback(list);
      },
      (err) => {
        console.error('Staff list error:', err);
        onError?.(err);
      }
    );
  } catch (err) {
    // Don't crash the page if the Firestore client is in a bad state; show an error instead.
    console.error('Could not subscribe to staff list:', err);
    onError?.(err);
    return () => {};
  }
}

async function callStaffAdmin(action, payload = {}) {
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
    if (res.status === 404 && !data) {
      throw new Error('Staff server not found (/api/staff-admin). Restart the dev server, or check the Vercel deployment.');
    }
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}

export const createStaff = (data) => callStaffAdmin('create', data);
export const updateStaff = (uid, data) => callStaffAdmin('update', { uid, ...data });
export const setStaffPassword = (uid, password) => callStaffAdmin('setPassword', { uid, password });
export const setStaffBlocked = (uid, blocked) => callStaffAdmin('setBlocked', { uid, blocked });
export const deleteStaff = (uid) => callStaffAdmin('delete', { uid });
