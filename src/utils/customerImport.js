/**
 * Reading a shop's customer file (Excel or CSV) into rows, and the Excel example file (17 Nov 2026).
 *
 * The browser reads the file; the server receives rows, never bytes (as the product import does). Headings are
 * matched loosely ("Mobile No.", "Phone Number", "WhatsApp" are all the phone), because a shop's own register
 * calls them whatever it calls them. Excel cells are read as values, not as shown: a number keeps all its
 * digits (shown as "9.19848E+11" in a narrow column, it is still 919848022338 inside), and a date cell
 * becomes 1990-08-14 rather than a day count.
 */

const norm = (h) => String(h ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** Our field -> the headings that mean it. */
const ALIASES = {
  name: ['name', 'customername', 'fullname', 'customer', 'clientname', 'buyername'],
  phone: ['phone', 'phonenumber', 'phoneno', 'mobile', 'mobilenumber', 'mobileno', 'contact', 'contactnumber', 'contactno', 'whatsapp', 'whatsappnumber', 'whatsappno', 'cell', 'cellnumber', 'number'],
  email: ['email', 'emailaddress', 'emailid', 'mail', 'mailid'],
  birthday: ['birthday', 'dateofbirth', 'dob', 'birthdate', 'bday'],
  anniversary: ['anniversary', 'weddinganniversary', 'anniversarydate', 'marriageanniversary', 'weddingdate'],
  address: ['address', 'billingaddress', 'fulladdress', 'addressline', 'address1', 'street'],
  city: ['city', 'town', 'place', 'area'],
  gstNumber: ['gst', 'gstin', 'gstnumber', 'gstno'],
  companyName: ['company', 'companyname', 'business', 'businessname', 'firm', 'firmname', 'shopname'],
  notes: ['notes', 'note', 'remarks', 'remark', 'comment', 'comments'],
};
const FIELD_OF = Object.fromEntries(Object.entries(ALIASES).flatMap(([f, hs]) => hs.map(h => [h, f])));

/** The columns the screen lists, in the example file's order. */
export const CUSTOMER_COLUMNS = [
  { head: 'Name', need: true, example: 'Lakshmi Reddy' },
  { head: 'Phone', need: true, example: '98480 22338' },
  { head: 'Email', example: 'lakshmi@gmail.com' },
  { head: 'Birthday', example: '14-08 or 14-08-1990' },
  { head: 'Anniversary', example: '02-12' },
  { head: 'Address', example: '12 MG Road, Vijayawada' },
  { head: 'GST number', example: 'for business buyers' },
  { head: 'Company', example: 'for business buyers' },
  { head: 'Notes', example: 'likes Kanchi silk' },
];

const pad = (n) => String(n).padStart(2, '0');
function cellText(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? '' : `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
  // A whole number keeps every digit (never "9.84802E+09"); a phone typed as a number arrives here.
  if (typeof v === 'number') return Number.isInteger(v) ? v.toFixed(0) : String(v);
  return String(v);
}

/**
 * The file as rows: { rowNumber, name, phone, email, birthday, anniversary, address, gstNumber, companyName, notes }.
 * Also says which headings were not used, so a column the person meant does not vanish without a word.
 */
export async function parseCustomerFile(file) {
  const fileName = String(file?.name || '');
  const lower = fileName.toLowerCase();
  if (!/\.(xlsx|xls|xlsm|csv)$/.test(lower)) throw new Error('Choose an Excel file (.xlsx) or a CSV file.');
  if (file.size > 15 * 1024 * 1024) throw new Error('That file is larger than 15 MB. A customer list that big should be split into smaller files.');

  let raw, heads;
  if (/\.(xlsx|xls|xlsm)$/.test(lower)) {
    const XLSX = await import('xlsx');
    let wb;
    try { wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true }); }
    catch { throw new Error('That file could not be opened as a spreadsheet. Open it in Excel, save it again as .xlsx, and choose it again.'); }
    // The example file's own sheet if it is there (its second sheet is the instructions), else the first.
    const sheetName = wb.SheetNames.find(n => norm(n) === 'customers') ?? wb.SheetNames[0];
    const sheet = sheetName && wb.Sheets[sheetName];
    if (!sheet) throw new Error('That spreadsheet has no sheets in it.');
    const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true, blankrows: true });
    heads = (grid[0] || []).map(cellText);
    raw = grid.slice(1).map((cells, i) => ({ cells, rowNumber: i + 2 }));
  } else {
    const Papa = (await import('papaparse')).default;
    const text = (await file.text()).replace(/^﻿/, '');
    if (!text.trim()) throw new Error('That file is empty. Choose the file with your customers in it.');
    const res = Papa.parse(text, { header: false, skipEmptyLines: false });
    const grid = res.data;
    heads = (grid[0] || []).map(cellText);
    raw = grid.slice(1).map((cells, i) => ({ cells, rowNumber: i + 2 }));
  }

  const fields = heads.map(h => FIELD_OF[norm(h)] ?? null);
  // Each field from its first column only: a second "Phone" column (a landline, say) is listed as not used.
  const firstCol = {};
  fields.forEach((f, i) => { if (f && firstCol[f] === undefined) firstCol[f] = i; });
  const unused = heads.filter((h, i) => h.trim() && (!fields[i] || firstCol[fields[i]] !== i));
  const missing = ['name', 'phone'].filter(f => firstCol[f] === undefined);
  if (missing.length) {
    const found = heads.filter(h => h.trim());
    throw new Error(`The file needs a ${missing.map(f => (f === 'name' ? 'Name' : 'Phone')).join(' and a ')} column. ${found.length ? `Its headings are: ${found.slice(0, 8).join(', ')}.` : 'Its first row is empty: put the headings there.'} Download the example file to see how.`);
  }

  const rows = [];
  for (const { cells, rowNumber } of raw) {
    const row = { rowNumber };
    for (const [f, i] of Object.entries(firstCol)) {
      const t = cellText(cells[i]).trim();
      if (t) row[f] = t;
    }
    if (row.city) { row.address = row.address ? `${row.address}, ${row.city}` : row.city; delete row.city; }
    if (Object.keys(row).length > 1) rows.push(row);
  }
  if (!rows.length) throw new Error('The file has headings but no customers under them.');
  return { fileName, rows, unused };
}

/**
 * The example file, as Excel: the columns with three worked rows, the Phone column already set to text (so Excel
 * never shortens a number), and a second sheet saying how to fill it in.
 */
export async function downloadCustomerExample() {
  const XLSX = await import('xlsx');
  // The Customers sheet is only the headings: example rows left in by mistake would be imported as customers, and a
  // made-up number can be a real person's. The worked examples are on the second sheet.
  const sheet = XLSX.utils.aoa_to_sheet([CUSTOMER_COLUMNS.map(c => c.head)]);
  // Every Phone cell is text, so a number typed later keeps all its digits (Excel shortens long numbers otherwise).
  for (let r = 1; r <= 5000; r++) sheet[XLSX.utils.encode_cell({ r, c: 1 })] = { t: 's', v: '', z: '@' };
  sheet['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 5000, c: CUSTOMER_COLUMNS.length - 1 } });
  sheet['!cols'] = [22, 18, 26, 16, 14, 30, 20, 22, 28].map(wch => ({ wch }));
  sheet['!freeze'] = { xSplit: 0, ySplit: 1 };
  const how = XLSX.utils.aoa_to_sheet([
    ['How to fill in the Customers sheet'],
    [],
    ['One customer a row on the Customers sheet. Only Name and Phone are needed; leave any other cell empty.'],
    ['Phone: a 10-digit mobile number. Spaces, +91 and a 0 in front are all fine. For another country, + and the country code.'],
    ['Birthday and Anniversary: day first, like 14-08 or 14-08-1990. The year is not kept.'],
    ['GST number and Company: only for business buyers. A GST number is 15 letters and digits.'],
    ['A number already in your customer list is left exactly as it is.'],
    ['Nobody gets WhatsApp offers from an import: each customer agrees at the till or in the shop.'],
    ['Up to 5,000 customers in one file.'],
    [],
    ['Examples (type your own customers on the Customers sheet, not here):'],
    CUSTOMER_COLUMNS.map(c => c.head),
    ['Lakshmi Reddy', '98480 22338', 'lakshmi@gmail.com', '14-08', '02-12', '12 MG Road, Vijayawada', '', '', 'Likes Kanchi silk'],
    ['Priya Sharma', '+91 99000 12345', '', '23-03-1991', '', 'Banjara Hills, Hyderabad', '', '', ''],
    ['Sri Lakshmi Textiles', '94400 55667', 'accounts@srilakshmi.in', '', '', 'Main Bazaar, Guntur', '37ABCDE1234F1Z5', 'Sri Lakshmi Textiles', 'Buys for her shop'],
  ]);
  how['!cols'] = [22, 18, 26, 16, 14, 30, 20, 22, 28].map(wch => ({ wch }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, 'Customers');
  XLSX.utils.book_append_sheet(wb, how, 'How to fill');
  XLSX.writeFile(wb, 'customers-import-example.xlsx');
}
