const CURRENCY_SYMBOL = import.meta.env.VITE_RESTAURANT_CURRENCY || '₹';

/**
 * Formats a numeric price to display format (e.g. ₹450)
 */
export function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return `${CURRENCY_SYMBOL}${num.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Generates a human-friendly order identifier (e.g. #T3-841)
 */
export function formatOrderNumber(tableNumber, docId) {
  if (!docId) return `#T${tableNumber || '?'}-001`;
  // Take last 4 alphanumeric characters of docId or random slice
  const cleanId = docId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const shortCode = cleanId.slice(-4) || '101';
  return `#T${tableNumber || '0'}-${shortCode}`;
}

/**
 * Formats a date or Firestore timestamp to a readable time (e.g. 02:45 PM)
 */
export function formatTime(timestamp) {
  if (!timestamp) return '--:--';
  const date = parseTimestamp(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Formats a date or Firestore timestamp to full date & time (e.g. Aug 20, 2:45 PM)
 */
export function formatDateTime(timestamp) {
  if (!timestamp) return '--';
  const date = parseTimestamp(timestamp);
  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Returns elapsed time in minutes from a timestamp
 */
export function getElapsedMinutes(timestamp) {
  if (!timestamp) return 0;
  const date = parseTimestamp(timestamp);
  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - date.getTime());
  return Math.floor(diffMs / 60000);
}

/**
 * Helper to safely convert Firestore Timestamp, string, or Date to JS Date
 */
export function parseTimestamp(val) {
  if (!val) return new Date();
  if (val && typeof val.toDate === 'function') {
    return val.toDate();
  }
  if (val && val.seconds) {
    return new Date(val.seconds * 1000);
  }
  if (typeof val === 'string' || typeof val === 'number') {
    const parsed = new Date(val);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }
  if (val instanceof Date) {
    return val;
  }
  return new Date();
}
