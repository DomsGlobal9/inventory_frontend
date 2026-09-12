export function formatINR(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return '₹0';
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value);
}

/**
 * The same, but never hiding paise that are actually there.
 *
 * `formatINR` rounds to whole rupees, which is right almost everywhere -- a shop does not want
 * "₹12,000.00" down the length of a page. It is wrong for a column of parts that has to add up
 * to a stated whole: a ₹100 discount split across three lines as 16.65 / 41.68 / 41.67 displays
 * as ₹17 / ₹42 / ₹42, which sums to ₹101 against a total the same screen says is ₹100.
 *
 * So: whole rupees when the amount is whole, and two decimal places when it is not. Nothing
 * changes for the ordinary case, and the column adds up in the one case where it would not have.
 */
export function formatINRExact(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return '₹0';
  }
  const isWhole = Math.abs(Number(value) - Math.round(Number(value))) < 0.005;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: isWhole ? 0 : 2
  }).format(value);
}

export function formatNumber(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }
  return new Intl.NumberFormat('en-IN').format(value);
}
