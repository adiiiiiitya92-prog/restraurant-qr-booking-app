// Indian mobile numbers, same rule as the Junio 8 website's booking form:
// 10 digits starting 6-9. Accepts "+91 98765 43210", "098765-43210", etc.
export function normalizeIndianMobile(value) {
  const digits = String(value ?? '').replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '');
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

/** "9876543210" → "98765 43210" for display. */
export const formatMobile = (phone) => (phone && phone.length === 10 ? `${phone.slice(0, 5)} ${phone.slice(5)}` : phone || '');

// Remembered on the guest's own phone so they don't retype it next visit.
const KEY = 'junio8_customer_phone';
export function getSavedPhone() {
  try {
    return localStorage.getItem(KEY) || '';
  } catch {
    return '';
  }
}
export function savePhone(phone) {
  try {
    localStorage.setItem(KEY, phone);
  } catch {}
}
