---
title: Download, print and share
summary: Every place in ScaleEzy where you can download a spreadsheet, save a PDF, print or share, and what each file holds.
for: Everyone
minutes: 4
keywords: export download csv excel spreadsheet google sheets pdf print printer share whatsapp report file save labels barcode receipt day book purchase order codes backup list
---

ScaleEzy doesn't have one big "export everything" button. Each screen that can give you a file has its own button. This page lists all of them. You only see the ones your role can open.

## Everything you can download or print

| Where | Button | What you get | Read more |
|---|---|---|---|
| **Products** | **Export** | A spreadsheet (CSV) of the products in the list | [Products](/help/products/publish-archive-delete) |
| A product, **Variants** tab | **Export** | A spreadsheet of that product's sizes and colours | [Variants and barcodes](/help/products/variants-and-barcodes) |
| A product, **Variants** tab | **Print All Labels**, **Print Labels**, or the printer on a row | A PDF of barcode price labels | [Variants and barcodes](/help/products/variants-and-barcodes) |
| A product, **Inventory History** tab | **Export** | A spreadsheet of that product's stock movements | [The product page](/help/products/product-page) |
| **Inventory Alerts** | **Export Report** | A spreadsheet of out of stock or low stock items | [Low stock alerts](/help/inventory/low-stock-alerts) |
| **Settings → Day Book** | **PDF** | A PDF of one day | [Day Book](/help/settings/day-book) |
| **Settings → Day Book** | **Send on WhatsApp** | Sends the day, or several days, as a PDF to the owner's WhatsApp | [Day Book](/help/settings/day-book) |
| A purchase order | **Download PDF** | The purchase order as a PDF, to print or send | [Raise a purchase order](/help/purchase-orders/create-a-purchase-order) |
| A purchase order | **Send on WhatsApp**, **Email to supplier** | Sends the order to the supplier (draft orders only) | [Raise a purchase order](/help/purchase-orders/create-a-purchase-order) |
| A purchase order | **Download receipt PDF**, **Receipt PDF** | The goods receipt for one delivery | [Receive a delivery](/help/purchase-orders/receive-a-delivery) |
| A counter sale | **Print receipt** | An 80 mm receipt, printed from your browser | [Print a receipt](/help/orders/receipts) |
| An offer with single-use codes | **CSV**, **Copy unused** | Every code in a spreadsheet, or the unused codes copied | [Offer codes](/help/offers/offer-codes) |
| **Shelves → Racks & shelves** | **Print all labels**, **Labels** | Shelf labels with QR codes, printed from your browser | [Set up racks](/help/shelves/set-up-racks) |
| **Import Products** window | **Download template** | An empty spreadsheet with the right columns | [Import products](/help/products/import-products) |
| **Settings → Storefront** | **Save what we hold** | The data a Shopify customer asked for | [Connect Shopify](/help/settings/connect-shopify) |

:::note No download on these screens
**Inventory**, the ledger (**View Ledger**), **Orders**, **Returns**, **Customers**, **Purchase Orders** (the list), **Suppliers**, **Transfers**, **Stock counts** and the **Dashboard** have no Export button yet.
:::

## Spreadsheets (CSV files)

A spreadsheet download is a **CSV** file. Its name is the list name and today's date, for example *Products_2026-09-17.csv*. Your browser saves it in your **Downloads** folder.

### Products

On **Products**, click [[2]] **Export**.

![The Products screen. Products is marked 1 in the menu and Export is marked 2.](1-products-export.webp "Export saves the products you see in the list.")

- The file has only the products the list is showing. Change **Active & Drafts** first to export drafts, published, archived or trashed products.
- The list, and so the file, shows at most **50 products**.
- Columns: ID, Title, Code, Category, BasePrice, Status, VariantCount and TotalUnits.

### A product's sizes and colours

Open a product, click the **Variants** tab, then click [[1]] **Export**. [[2]] **Print All Labels** makes the barcode labels as a PDF.

![The top of the Variants tab. Export is marked 1 and Print All Labels is marked 2.](2-variants-export.webp "Tick some rows first to print labels for only those.")

- **Quantity** is the total of **all your stores**, not only the store picked at the top.
- **LocationPriceOverride** and **LocationName** are for the store picked at the top.
- **Cost** and **Margin** are only in the file if your role can see cost prices.
- The file name has the product's ID in it, not its name, for example *Variants_…_2026-09-17.csv*. Rename it if you keep several.

:::warning Don't import this file back as it is
**Import Updates** on Products reads the **Quantity** column as the stock **in the store picked at the top**. This file's Quantity is the total of all stores. Delete the Quantity column, or type the right number for that one store, before you import it. See [Bulk updates](/help/products/bulk-updates).
:::

### A product's stock movements

Open a product, click the **Inventory History** tab, then click **Export**.

- The file has the **newest 50** movements that the list shows, from every store. Choose a type or reason in the list first to narrow it down.
- The **Date** column is in world time (UTC), which is 5 hours 30 minutes behind India time.

### Stock alerts

On **Inventory Alerts**, choose the **Out of Stock** or **Low Stock** tab, then click [[1]] **Export Report**.

![The top of Inventory Alerts. Export Report is marked 1.](3-alerts-export.webp "The file has only the tab you are on.")

- The file has only the tab you are on, for the store picked at the top.
- If that tab is empty, nothing downloads.

## PDFs, printing and sharing

### Day Book

In **Settings → Day Book**, choose the day and the location first. Then click [[1]] **PDF** to download the day, for example *day-book-2026-09-17.pdf*, or [[2]] **Send on WhatsApp** to send the same PDF to the owner's WhatsApp number. With **From - to** you get several days in one file.

![The Day Book header. PDF is marked 1 and Send on WhatsApp is marked 2.](4-day-book-pdf-send.webp "Only people who can see money reports have Day Book.")

### Purchase orders and deliveries

On a purchase order, **Download PDF** saves the order, named with its number, for example *PO-000003.pdf*. After a delivery, **Download receipt PDF** (or **Receipt PDF** under *Deliveries received*) saves the goods receipt, for example *GRN-000001-PO-000003.pdf*. Both carry your logo and address from **Settings → General Info**.

### Labels

- **Product labels**: **Print All Labels** on a product's Variants tab downloads a PDF, for example *Labels_Cotton Kurti.pdf*, one 50 × 25 mm label per page. See [Variants and barcodes](/help/products/variants-and-barcodes).
- **Shelf labels**: **Print all labels** on Racks & shelves opens the labels in a new tab. Choose the size, then press **Print**. See [Set up racks](/help/shelves/set-up-racks).

### Receipts

**Print receipt** opens the receipt in a new tab. Right after a sale, the print window opens by itself. For an older sale, press **Print** on the receipt. See [Print a receipt](/help/orders/receipts).

:::tip Want a PDF instead of paper?
For receipts and shelf labels, choose **Save as PDF** as the printer in your browser's print window.
:::

## Open a CSV file in Excel or Google Sheets

- **Excel**: double-click the file. If names in Hindi, Telugu or another script, or the ₹ sign, look like strange letters, open Excel, go to **Data → From Text/CSV**, choose the file and pick **65001: Unicode (UTF-8)**.
- **Google Sheets**: open a new sheet, go to **File → Import → Upload**, and choose the file.

## Common problems

:::faq I clicked Export but nothing downloaded
Export is grey when the list is empty, and **Export Report** does nothing when the tab you are on has no alerts. If the list has rows, check your browser's downloads (the arrow at the top right of the browser). Some browsers ask once whether the site may download files.
:::

:::faq The Products file has fewer products than my shop
The file has only what the list shows: the filter picked in **Active & Drafts**, and at most 50 products.
:::

:::faq The Quantity in the Variants file is bigger than the stock in my store
**Quantity** is the total of all your stores. To see one store's stock, pick that store at the top and look at [Inventory](/help/inventory/see-your-stock).
:::

:::faq The PDF button keeps spinning
The screen is still loading. Wait until the numbers show, then press it again. If it says it could not make the PDF, refresh the page and try once more.
:::

:::faq The date in the file name is yesterday's
The date in a spreadsheet's name uses world time (UTC). Between midnight and 5:30 in the morning in India it is still the day before.
:::
