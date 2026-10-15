# Inventory -- Test Report: 7 seeded bugs

This is a practice test document. Seven small bugs were added on purpose to the Inventory app.
The bugs are ONLY on the git branch "qa/seeded-bugs" (folder D:\villy\inventory\frontend-qa-bugs). The main app (branch main) is not changed.
All seven bugs are on the screen only. None of them saves wrong data, so testing them cannot damage the shop data.
For each bug: the steps to see it, what SHOULD happen (expected), what DOES happen (actual), a screenshot of both, and the exact place in the code where it breaks.

## Test setup

- Branch: qa/seeded-bugs  (frontend only; the backend is not changed)
- Bug app: http://localhost:5190  (started from frontend-qa-bugs)
- Normal app for comparison: the main frontend (npm run dev in frontend)
- Backend: local, http://localhost:4006
- Test shop: Lakshmi Silks (demo test shop) -- signed in as the owner
- Date tested: 15 Oct 2026, Microsoft Edge, screen 1366 x 900, language English (India)

## Summary

| ID | Bug | Page | Severity | Result |
|---|---|---|---|---|
| BUG-01 | Purchase order search does not find a PO when you type capital letters | Purchase Orders  (/inventory/purchase-orders) | Minor | FAIL |
| BUG-02 | Supplier search does not find a supplier by name | Suppliers  (/inventory/suppliers) | Minor | FAIL |
| BUG-03 | The "Out of Stock" tab shows a count of -1 | Stock alerts  (/inventory/alerts) | Minor | FAIL |
| BUG-04 | A stock of 0 is not shown in red | Inventory Overview  (/inventory) | Minor | FAIL |
| BUG-05 | Products page: "Stock Units" shows the number of variants, not the stock | Products  (/products) | Minor | FAIL |
| BUG-06 | Customers page: the "Created" date shows the wrong month | Customers  (/customers) | Minor | FAIL |
| BUG-07 | Dashboard: the top supplier is ranked "#0" | Dashboard, Analytics tab, "Top Suppliers" card  (/dashboard) | Minor (looks wrong) | FAIL |

---

## BUG-01: Purchase order search does not find a PO when you type capital letters

**Page:** Purchase Orders  (/inventory/purchase-orders)  
**Severity:** Minor  
**Result:** FAIL

**Steps to see it**

1. Open Purchase Orders.
2. In the search box type: PO-000002

**Expected output:** The order PO-000002 shows in the list.

**Actual output (coming output):** The list says "No purchase orders found." Typing po-000002 in small letters works, so the search only works in small letters.

| Expected (main app) | Actual (bug branch) |
|---|---|
| ![expected](screens/BUG-01-po-search-expected.png) | ![actual](screens/BUG-01-po-search-actual.png) |

**Where the system breaks**

- File: `src/pages/PurchaseOrders.jsx`, line 115
- Wrong code (now): `(po.poNumber || '').toLowerCase().includes(searchTerm)`
- Right code: `(po.poNumber || '').toLowerCase().includes(searchTerm.toLowerCase())`
- Why: The PO number is changed to small letters, but what you typed is not. "po-000002" never contains "PO-000002".

---

## BUG-02: Supplier search does not find a supplier by name

**Page:** Suppliers  (/inventory/suppliers)  
**Severity:** Minor  
**Result:** FAIL

**Steps to see it**

1. Open Purchase Orders, then the Suppliers tab.
2. In the search box type: Kanchi

**Expected output:** The supplier "Kanchi Weavers" shows in the list.

**Actual output (coming output):** The list says "No suppliers found." Search by supplier code still works.

| Expected (main app) | Actual (bug branch) |
|---|---|
| ![expected](screens/BUG-02-supplier-search-expected.png) | ![actual](screens/BUG-02-supplier-search-actual.png) |

**Where the system breaks**

- File: `src/pages/Suppliers.jsx`, line 25
- Wrong code (now): `(s.name || '').includes(searchTerm.toLowerCase())`
- Right code: `(s.name || '').toLowerCase().includes(searchTerm.toLowerCase())`
- Why: What you typed is changed to small letters ("kanchi"), but the name is not ("Kanchi Weavers"), so they never match.

---

## BUG-03: The "Out of Stock" tab shows a count of -1

**Page:** Stock alerts  (/inventory/alerts)  
**Severity:** Minor  
**Result:** FAIL

**Steps to see it**

1. Open Inventory, then click "Stock alerts".
2. Look at the first tab name.

**Expected output:** The tab says "Out of Stock (0)" -- the same as the number of rows in it.

**Actual output (coming output):** The tab says "Out of Stock (-1)". The number is always one less than the real count, and a count can never be below 0.

| Expected (main app) | Actual (bug branch) |
|---|---|
| ![expected](screens/BUG-03-out-of-stock-count-expected.png) | ![actual](screens/BUG-03-out-of-stock-count-actual.png) |

**Where the system breaks**

- File: `src/pages/AlertCenter.jsx`, line 96
- Wrong code (now): `Out of Stock ({outOfStock.length - 1})`
- Right code: `Out of Stock ({outOfStock.length})`
- Why: The code takes 1 away from the real count before showing it.

---

## BUG-04: A stock of 0 is not shown in red

**Page:** Inventory Overview  (/inventory)  
**Severity:** Minor  
**Result:** FAIL

**Steps to see it**

1. Open Inventory.
2. Look at the STOCK QTY column for "Anarkali Suit Set" (status: Out of Stock).

**Expected output:** The 0 is red, so the owner sees at once that it is sold out.

**Actual output (coming output):** The 0 is black, the same as items that are fine. Only a stock below 0 would turn red.

| Expected (main app) | Actual (bug branch) |
|---|---|
| ![expected](screens/BUG-04-zero-stock-colour-expected.png) | ![actual](screens/BUG-04-zero-stock-colour-actual.png) |

**Where the system breaks**

- File: `src/pages/InventoryOverview.jsx`, line 202
- Wrong code (now): `color: variant.quantity < 0 ? 'var(--accent-danger)' : 'inherit'`
- Right code: `color: variant.quantity <= 0 ? 'var(--accent-danger)' : 'inherit'`
- Why: The check uses "less than 0" instead of "0 or less", so exactly 0 is left out.

---

## BUG-05: Products page: "Stock Units" shows the number of variants, not the stock

**Page:** Products  (/products)  
**Severity:** Minor  
**Result:** FAIL

**Steps to see it**

1. Open Products.
2. Look at the VARIANTS and STOCK UNITS columns for "Cotton Kurti".

**Expected output:** VARIANTS = 4 and STOCK UNITS = 28 (the real pieces in stock).

**Actual output (coming output):** VARIANTS = 4 and STOCK UNITS = 4. Every row shows the same number in both columns. Sold-out items (Linen Cotton Saree) show 1 unit instead of 0.

| Expected (main app) | Actual (bug branch) |
|---|---|
| ![expected](screens/BUG-05-products-stock-units-expected.png) | ![actual](screens/BUG-05-products-stock-units-actual.png) |

**Where the system breaks**

- File: `src/pages/Products.jsx`, line 372
- Wrong code (now): `{product.variantSummary?.variantCount || 0}`
- Right code: `{product.variantSummary?.totalUnits || 0}`
- Why: The STOCK UNITS column reads the variant count field instead of the total units field.

---

## BUG-06: Customers page: the "Created" date shows the wrong month

**Page:** Customers  (/customers)  
**Severity:** Minor  
**Result:** FAIL

**Steps to see it**

1. Open Customers.
2. Look at the "Created" line under each name. These customers were added on 6 October 2026.

**Expected output:** Created 6/10/2026

**Actual output (coming output):** Created 6/9/2026 -- one month early. In January it would even show month 0.

| Expected (main app) | Actual (bug branch) |
|---|---|
| ![expected](screens/BUG-06-customer-created-date-expected.png) | ![actual](screens/BUG-06-customer-created-date-actual.png) |

**Where the system breaks**

- File: `src/pages/sales/Customers.jsx`, line 186
- Wrong code (now): `Created {`${d.getDate()}/${d.getMonth()}/${d.getFullYear()}`}   (d = new Date(customer.createdAt))`
- Right code: `Created {new Date(customer.createdAt).toLocaleDateString()}`
- Why: In JavaScript getMonth() counts months from 0 (January = 0), so October comes out as 9.

---

## BUG-07: Dashboard: the top supplier is ranked "#0"

**Page:** Dashboard, Analytics tab, "Top Suppliers" card  (/dashboard)  
**Severity:** Minor (looks wrong)  
**Result:** FAIL

**Steps to see it**

1. Open Dashboard.
2. Click the Analytics tab.
3. Scroll down to "Top Suppliers".

**Expected output:** Kanchi Weavers is #1, Jaipur Cotton House is #2.

**Actual output (coming output):** Kanchi Weavers is #0, Jaipur Cotton House is #1.

| Expected (main app) | Actual (bug branch) |
|---|---|
| ![expected](screens/BUG-07-supplier-rank-expected.png) | ![actual](screens/BUG-07-supplier-rank-actual.png) |

**Where the system breaks**

- File: `src/components/dashboard/SupplierSpendWidget.jsx`, line 56
- Wrong code (now): `#{index}`
- Right code: `#{index + 1}`
- Why: The list position starts from 0 in code. The code forgot to add 1 before showing it.
