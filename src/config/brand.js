// Single source of truth for the café's branding (matches the Junio 8 website).
// Kept in code rather than .env so an old VITE_RESTAURANT_NAME can't override it.
export const BRAND = {
  name: 'Junio 8 Café',
  shortName: 'Junio 8',
  tagline: 'Play · Sip · Conquer',
};
