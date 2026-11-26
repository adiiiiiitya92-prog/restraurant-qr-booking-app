// Builds the link that goes inside each table's QR code.
//
// QR codes are printed once and stuck on tables, so the link must point at the
// LIVE site, not at whatever address the admin happens to be using (e.g.
// http://localhost:5173 while testing). Set VITE_PUBLIC_SITE_URL in .env /
// Netlify to the live address, e.g. https://order.junio8.in

const configured = (import.meta.env.VITE_PUBLIC_SITE_URL || '').trim().replace(/\/+$/, '');

export function getPublicBaseUrl() {
  return configured || window.location.origin;
}

export function getTableOrderUrl(tableId) {
  return `${getPublicBaseUrl()}/order/${encodeURIComponent(tableId)}`;
}

/** True when QR codes would point at a computer-only address that phones can't open. */
export function isQrBaseLocal() {
  try {
    const host = new URL(getPublicBaseUrl()).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local') || /^192\.168\./.test(host) || /^10\./.test(host);
  } catch {
    return true;
  }
}

/** Old sample tables use guessable ids like "table_01"; new ones get a random part. */
export function isGuessableTableId(tableId) {
  return /^table_\d+$/.test(String(tableId || ''));
}
