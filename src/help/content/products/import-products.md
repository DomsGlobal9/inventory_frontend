---
title: Import products from a sheet
summary: Add many products at once from an Excel or CSV file. ScaleEzy shows you what will happen before anything is saved.
for: Owners, admins and inventory managers
minutes: 5
app: /products
appLabel: Products
keywords: import excel csv xlsx sheet spreadsheet bulk upload many products template catalogue productkey productcode
---

Use this when you have many products to add, for example your whole catalogue from Excel. Each row of the sheet is one variant: one colour and size of a product.

## 1. Open Import Products

1. In the menu on the left, click [[1]] **Products**.
2. At the top, click [[2]] **Import Products**.

![The Products screen. Products is marked 1 in the menu and the Import Products button is marked 2.](1-open.webp "Import Products is next to Add Product.")

## 2. Download the template and fill it in

1. Click [[1]] **Download template**. You get a file called *product-import-template.csv*. Open it in Excel or Google Sheets.
2. The template already has three example rows. Replace them with your own products. Keep the first row (the column names) as it is.
3. Save the file as **.xlsx** or **.csv**.
4. Back in ScaleEzy, click [[2]] **Choose a file, or drop one here** and choose your file. You can also drag the file onto the box.

![The Import products window. Download template is marked 1 and the file box is marked 2.](2-template-and-file.webp "Nothing is saved until you press the import button.")

### What goes in each column

| Column | What to type |
|---|---|
| **ProductKey** | A short name you make up, for example *kanchi-silk*. Give every row of the same product the same key. It is only used to group the rows. |
| **Title** | The product name. Needed once for each new product. |
| **Category** | WOMEN, MEN, KIDS or UNISEX. Needed for each new product. |
| **DressType**, **Fabric**, **Brand** | Optional. |
| **BasePrice** | The selling price. Needed for each new product. |
| **Size**, **Color** | Each row needs at least a size or a colour. For a saree use *Free Size*. |
| **Quantity** | How many pieces you have now. Whole numbers only. It goes into one store, see *Check which store got the stock* below. |
| **CostPrice** | What one piece cost you. |
| **SellingPrice** | Only if this colour or size sells at a different price from BasePrice. |
| **ReorderLevel** | Warn me when stock falls to this number. |
| **SKU** | Leave empty. ScaleEzy makes one. |
| **ProductCode** | Leave empty for new products. To add sizes and colours to a product you already have, or to change their prices, type its product code here (for example *PRD-000012*, shown under the product name). |

:::tip An empty cell changes nothing
If you leave a cell empty, ScaleEzy leaves that detail as it is.
:::

:::note What a product code can change
For a product you already have, the import changes only three things of each size and colour: **SellingPrice**, **CostPrice** and **ReorderLevel**. It also adds any new size or colour, with its **Quantity**.

**Title**, **BasePrice**, **Category**, **DressType**, **Fabric** and **Brand** stay as they were, even if you type something new. The **Quantity** of a size or colour you already have is ignored. To change that stock, use [Change stock or reorder levels in bulk](/help/products/bulk-updates).
:::

## 3. Check what will happen

ScaleEzy reads the file and shows you what it will do. Nothing is saved yet.

1. [[1]] **New** shows how many new variants and products will be added. **Update** counts sizes and colours you already have whose selling price, cost or reorder level will change. **Unchanged** counts the ones that stay the same.
2. [[2]] **Worth checking** lists things you should read. **Must be fixed** (in red) lists mistakes. The row number tells you which line of your sheet to fix.
3. When there are warnings, read them and tick [[3]] **I have read the warnings above and want to import anyway.**

![The preview. New shows 3 variants and 2 products, marked 1. The warning list is marked 2 and the tick box 3.](3-check-the-preview.webp "New products always arrive as drafts, because a sheet cannot carry photos.")

:::note Something must be fixed?
Fix the rows in your sheet, save it, and press **Choose another file** to load it again.
:::

## 4. Import

Click [[1]] **Import 3 variants**. The number is how many variants will be added or changed.

![The import button, marked 1, after the warnings box is ticked.](4-import.webp "It takes a few seconds for a big file.")

A message like *Imported 2 products and 3 variants* shows at the bottom of the screen.

## 5. Find your new products

New products are **drafts**. At the top of **Products**, choose **Drafts only** to see them. [[1]] Your imported products are in the list.

![The Products list filtered to Drafts only, with Printed Cotton Kurti and Chanderi Cotton Saree marked 1.](5-drafts.webp "Status DRAFT: not on sale yet.")

Next: add photos and publish them. See [Product photos](/help/products/photos) and [Publish, archive and delete](/help/products/publish-archive-delete).

:::warning Check which store got the stock
Imported stock goes into **one** location: the active store whose code comes first in A to Z order. It does not use the store chosen at the top of the screen. In a shop with *GODOWN* and *MAIN*, the stock goes to the Godown. Check in **Inventory**, and use a [transfer](/help/transfers/transfers) to move it if needed.
:::

## Common problems

:::faq "This file creates new products. You do not have permission to add products."
Your role cannot add products. Only the owner, an admin or an inventory manager can. The same kind of message appears for prices (*This file sets selling prices*) and costs (*This file sets cost prices*).
:::

:::faq "…already exists, so its Quantity is ignored"
The row is for a variant you already have. Importing again never adds the stock twice. To change stock of items you already have, use [Change stock or reorder levels in bulk](/help/products/bulk-updates).
:::

:::faq "You already have a product called …"
A product with this name already exists, so the file would add a second one. To add sizes and colours to the one you have, or change their prices, put its product code in the **ProductCode** column. The name and the base price cannot be changed this way.
:::

:::faq "This file has changed since it was previewed."
The file was changed after you loaded it. Press **Choose another file** and load it again.
:::

:::faq My file is very big
One file can have up to 2,000 rows. Split a bigger sheet into smaller files.
:::
