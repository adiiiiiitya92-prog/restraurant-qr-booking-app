// Signs Cloudinary uploads for Junio 8 menu photos.
//
// The Cloudinary account is shared with another project, so:
//   - the API secret stays here on the server (never in the browser),
//   - only a signed-in Junio 8 ADMIN gets a signature,
//   - every upload is forced into the junio8/menu folder (the other
//     project's folders cannot be written to, and nothing is overwritten
//     because no public_id is signed; Cloudinary picks a random one).
//
// Server env vars (Vercel → Project → Settings → Environment Variables, and .env for local):
//   CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
//   VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_API_KEY (already set for the app)

import crypto from 'node:crypto';

const FOLDER = 'junio8/menu';
const ALLOWED_FORMATS = 'jpg,jpeg,png,webp';
const INCOMING_TRANSFORMATION = 'c_limit,w_1600'; // shrink big phone photos before storing

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function decodeJwtPayload(token) {
  const part = token.split('.')[1];
  if (!part) return null;
  try {
    return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

/**
 * Confirms the caller is an active Junio 8 admin.
 * We read staff/{uid} from Firestore WITH the caller's own ID token. Firestore
 * verifies the token itself, and the security rules only let a user read their
 * own staff record, so a forged or someone else's token is rejected there.
 */
async function isJunio8Admin(idToken, projectId, apiKey) {
  const payload = decodeJwtPayload(idToken);
  const uid = payload?.user_id || payload?.sub;
  if (!uid || payload?.aud !== projectId) return false;

  const url =
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/staff/${encodeURIComponent(uid)}` +
    (apiKey ? `?key=${encodeURIComponent(apiKey)}` : '');
  const res = await fetch(url, { headers: { Authorization: `Bearer ${idToken}` } });
  if (!res.ok) return false;

  const doc = await res.json();
  const role = doc?.fields?.role?.stringValue;
  const active = doc?.fields?.active?.booleanValue;
  return role === 'admin' && active !== false;
}

function signParams(params, apiSecret) {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return crypto.createHash('sha1').update(toSign + apiSecret).digest('hex');
}

// Vercel Function (Web handler): POST /api/<file name>. Other methods get 405 from Vercel.
export async function POST(req) {

  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  const firebaseApiKey = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY;

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET || !projectId) {
    return json(500, { error: 'Photo upload is not configured on the server.' });
  }

  const auth = req.headers.get('authorization') || '';
  const idToken = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!idToken) return json(401, { error: 'Please sign in as admin.' });

  let allowed = false;
  try {
    allowed = await isJunio8Admin(idToken, projectId, firebaseApiKey);
  } catch (err) {
    console.error('Admin check failed:', err);
  }
  if (!allowed) return json(403, { error: 'Only a Junio 8 admin can upload photos.' });

  const params = {
    allowed_formats: ALLOWED_FORMATS,
    folder: FOLDER,
    timestamp: Math.floor(Date.now() / 1000),
    transformation: INCOMING_TRANSFORMATION,
  };

  return json(200, {
    cloudName: CLOUDINARY_CLOUD_NAME,
    apiKey: CLOUDINARY_API_KEY,
    signature: signParams(params, CLOUDINARY_API_SECRET),
    ...params,
  });
}
