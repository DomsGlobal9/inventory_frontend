// Money goes to the paisa: at most two digits after the point. The same rule the server applies
// (backend/src/validations/money.ts), said in the box before anything is sent. A third digit used
// to be rounded away by the database with a success toast: 1499.999 was saved as 1500.
export const PAISA_MESSAGE = 'Prices go to the paisa: use at most 2 digits after the point, for example 1499.50.';

/** True for a typed amount with a third digit after the point, such as "12.345". */
export function hasPartPaise(value) {
  const n = Number(value);
  if (value === '' || value === null || value === undefined || !Number.isFinite(n)) return false;
  return Math.abs(n * 100 - Math.round(n * 100)) >= 1e-6;
}

/** Rupees with Indian grouping and two decimals: ₹9,99,99,999.99. */
export function formatRupees(value) {
  const n = Number(value);
  if (value === null || value === undefined || value === '' || !Number.isFinite(n)) return '—';
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
