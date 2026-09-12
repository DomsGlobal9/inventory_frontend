/**
 * One row model, whichever file the merchant used.
 *
 * A shop keeps its catalogue in Excel; the app has always spoken CSV. Rather than build two
 * import systems, both formats are turned into the same list of rows here, at the very edge,
 * and nothing downstream ever learns which one it was.
 *
 * Parsing happens in the browser because that is where the existing bulk update already
 * parses its CSV, and because it keeps file uploads out of the API entirely -- the server
 * receives rows, not bytes.
 */

/** Spreadsheet headings are written by people. "Base Price", "baseprice" and "BASE_PRICE" are one column. */
const normaliseHeader = (h) => String(h || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const COLUMN_MAP = {
  productcode: 'productCode',
  productkey: 'productKey',
  sku: 'sku',
  title: 'title',
  productname: 'title',
  description: 'description',
  category: 'category',
  dresstype: 'dressType',
  fabric: 'fabric',
  craft: 'craft',
  brand: 'brand',
  baseprice: 'basePrice',
  size: 'size',
  color: 'color',
  colour: 'color',
  quantity: 'quantity',
  qty: 'quantity',
  costprice: 'costPrice',
  cost: 'costPrice',
  sellingprice: 'sellingPrice',
  reorderlevel: 'reorderLevel',
  location: 'locationCode'
};

const NUMERIC = new Set(['basePrice', 'quantity', 'costPrice', 'sellingPrice', 'reorderLevel']);

function toRow(raw, index) {
  const row = { rowNumber: index + 2 }; // +2: one for the header, one because people count from 1
  for (const [key, value] of Object.entries(raw)) {
    const field = COLUMN_MAP[normaliseHeader(key)];
    if (!field) continue;
    const v = typeof value === 'string' ? value.trim() : value;
    // An empty cell is not a value. It must reach the server as absent rather than as "",
    // because absent means "leave this alone" and "" would be a change.
    if (v === '' || v === null || v === undefined) continue;
    if (NUMERIC.has(field)) {
      const n = Number(String(v).replace(/[, ₹]/g, ''));
      if (Number.isFinite(n)) row[field] = n;
    } else {
      row[field] = String(v);
    }
  }
  return row;
}

const isBlank = (row) => Object.keys(row).filter(k => k !== 'rowNumber').length === 0;

export async function parseImportFile(file) {
  const name = String(file?.name || '').toLowerCase();
  const isExcel = name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.xlsm');

  let raw;
  if (isExcel) {
    // Loaded on demand: the spreadsheet reader is large, and most sessions never import.
    const XLSX = await import('xlsx');
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    if (!sheet) throw new Error('That spreadsheet has no sheets in it.');
    raw = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  } else {
    const Papa = (await import('papaparse')).default;
    const text = await file.text();
    const result = Papa.parse(text, { header: true, skipEmptyLines: true });
    if (result.errors?.length) {
      const first = result.errors[0];
      throw new Error(`Could not read the file: ${first.message} (row ${(first.row ?? 0) + 2}).`);
    }
    raw = result.data;
  }

  // Trailing blank lines are normal in a hand-edited sheet and are not an error.
  return raw.map(toRow).filter(r => !isBlank(r));
}

/** The columns, in the order the template writes them. */
export const TEMPLATE_COLUMNS = [
  'ProductCode', 'ProductKey', 'Title', 'Category', 'DressType', 'Fabric', 'Brand',
  'BasePrice', 'SKU', 'Size', 'Color', 'Quantity', 'CostPrice', 'SellingPrice', 'ReorderLevel'
];

/**
 * A template with two worked examples rather than an empty grid.
 *
 * The first two rows are one saree in two colours sharing a ProductKey; the third is a
 * different product. Somebody who has never seen this file learns the ProductKey idea from
 * looking at it, which no amount of help text achieves.
 */
export function buildTemplateCsv() {
  const example = [
    ['', 'kanchi-silk', 'Kanchipuram Silk Saree', 'WOMEN', 'Saree', 'Silk', '', '12500', '', 'Free Size', 'Red', '4', '8000', '', '5'],
    ['', 'kanchi-silk', '', '', '', '', '', '', '', 'Free Size', 'Blue', '3', '8000', '', '5'],
    ['', 'mysore-crepe', 'Mysore Crepe Saree', 'WOMEN', 'Saree', 'Crepe', '', '6500', '', 'Free Size', 'Green', '6', '4200', '', '5']
  ];
  return [TEMPLATE_COLUMNS.join(','), ...example.map(r => r.join(','))].join('\n');
}
