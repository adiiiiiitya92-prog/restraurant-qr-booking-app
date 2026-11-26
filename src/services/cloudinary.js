// Cloudinary image uploads for Junio 8 menu photos.
//
// The Cloudinary account is shared with another project, so uploads are
// SIGNED: the browser asks our Vercel function (api/cloudinary-sign.js)
// for a one-time signature. The function checks the user is a Junio 8 admin and
// forces the junio8/menu folder. The API secret never reaches the browser.

import { auth } from './firebase';

const SIGN_ENDPOINT = '/api/cloudinary-sign';
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Uploads an image file and returns its https URL.
 * Throws an Error with a readable message on failure.
 */
export async function uploadMenuImage(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Please choose a JPG, PNG or WebP photo.');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Photo is larger than 5 MB. Please pick a smaller one.');
  }

  const user = auth?.currentUser;
  if (!user) throw new Error('Please sign in as admin to upload photos.');
  const idToken = await user.getIdToken();

  // 1. Get a signature from our server
  let signRes;
  try {
    signRes = await fetch(SIGN_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}` },
    });
  } catch {
    throw new Error('Could not reach the upload server. Check the internet connection.');
  }
  const sign = await signRes.json().catch(() => null);
  if (!signRes.ok || !sign) {
    if (signRes.status === 404) {
      throw new Error('Upload server not found (/api/cloudinary-sign). Restart the dev server, or check the Vercel deployment.');
    }
    throw new Error(sign?.error || `Upload not allowed (${signRes.status})`);
  }

  // 2. Upload straight to Cloudinary with that signature
  const body = new FormData();
  body.append('file', file);
  body.append('api_key', sign.apiKey);
  body.append('timestamp', sign.timestamp);
  body.append('signature', sign.signature);
  body.append('folder', sign.folder);
  body.append('allowed_formats', sign.allowed_formats);
  body.append('transformation', sign.transformation);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`, {
    method: 'POST',
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || `Upload failed (${res.status})`);
  }
  return data.secure_url;
}

/**
 * Returns a smaller, auto-format (WebP/AVIF) version of a Cloudinary image URL.
 * Non-Cloudinary URLs are returned unchanged.
 */
export function optimizedImageUrl(url, width = 600) {
  if (!url || !url.includes('res.cloudinary.com') || !url.includes('/image/upload/')) {
    return url;
  }
  return url.replace('/image/upload/', `/image/upload/f_auto,q_auto,c_limit,w_${width}/`);
}
