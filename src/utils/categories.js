// Menu categories come from the menu items themselves: whatever category an
// item is saved with exists. The admin can type a brand-new one when adding an
// item, and it shows up everywhere (admin filters, customer menu) automatically.

// Suggested starting categories, and the order they appear in when used.
export const DEFAULT_CATEGORIES = ['Starters', 'Main Course', 'Snacks', 'Beverages', 'Desserts'];

export const MAX_CATEGORY_LENGTH = 40;

/** Trims, collapses spaces and caps length. Returns '' for blank input. */
export function normalizeCategoryName(name) {
  return String(name || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_CATEGORY_LENGTH);
}

/** Finds an existing category ignoring case ("beverages" → "Beverages"). */
export function findCategory(list, name) {
  const key = normalizeCategoryName(name).toLowerCase();
  return list.find((c) => c.toLowerCase() === key) || null;
}

/**
 * Unique, ordered list of categories used by `items`.
 * Known defaults keep their usual order; any new ones follow alphabetically.
 * With includeDefaults, unused defaults are added too (handy as suggestions for the admin).
 */
export function buildCategoryList(items, { includeDefaults = false } = {}) {
  const found = new Map(); // lowercased -> display name
  if (includeDefaults) DEFAULT_CATEGORIES.forEach((c) => found.set(c.toLowerCase(), c));
  for (const item of items || []) {
    const name = normalizeCategoryName(item?.category);
    if (name && !found.has(name.toLowerCase())) found.set(name.toLowerCase(), name);
  }

  const order = DEFAULT_CATEGORIES.map((c) => c.toLowerCase());
  return [...found.entries()]
    .sort(([a], [b]) => {
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
      if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      return a.localeCompare(b);
    })
    .map(([, display]) => display);
}
