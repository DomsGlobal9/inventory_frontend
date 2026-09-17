---
title: Change stock or reorder levels in bulk
summary: Set new stock numbers or reorder levels for many items at once, from a small CSV file with one row per SKU.
for: Owners, admins and inventory managers
minutes: 3
app: /products
appLabel: Products
keywords: import updates bulk csv stock quantity reorder level sku change many update sheet
---

**Import Updates** changes items you already have. It finds each item by its **SKU** (the item code, for example *SAR-MYS-GRN*). To add new products, use [Import products from a sheet](/help/products/import-products) instead.

## 1. Open Import Updates

1. In the menu on the left, click [[1]] **Products**.
2. At the top, click [[2]] **Import Updates**.

![The Products screen. Products is marked 1 in the menu and Import Updates is marked 2.](1-open.webp "Import Updates is next to Export.")

## 2. Make your file

The window shows [[1]] the columns your file needs. There is no template to download. Make the file yourself in Excel or Google Sheets:

- The first row has the column names: **sku**, **quantity**, **priceOverride**, **reorderLevel**. Type them exactly like this. Only these other spellings also work: **SKU**, **Quantity**, **PriceOverride** and **ReorderLevel**. A name like *Reorder Level* or *QTY* is not read.
- Then one row for each item. Only **sku** is needed. Leave a cell empty to keep that detail as it is.
- **quantity**: the new number of pieces **in one store** (you choose the store in the next step). It is the new total there, not pieces to add.
- **reorderLevel**: warn me when stock falls to this number. This applies in every store.
- Save it as **CSV**.

For example:

| sku | quantity | priceOverride | reorderLevel |
|---|---|---|---|
| SAR-MYS-GRN | 8 | | |
| KUR-COT-BLU-L | 6 | | 4 |

:::warning Using the Export from a product's Variants tab?
Its **Quantity** column is the stock of **all** your stores added together, but here **quantity** means the stock of **one** store. Delete that column before you import the file, or the store you choose gets the total of all stores.
:::

Click [[2]] **Click to select CSV file** and choose your file.

![The Import Bulk Updates window. The example columns are marked 1 and Click to select CSV file is marked 2.](2-the-format.webp "Type the column names exactly as shown.")

:::note The priceOverride column does not change your selling price
A number in **priceOverride** is saved as the old, crossed-out price that a connected website can show next to your price. It does not change the price at your counter or on the product page. To change selling prices for many items, use [Import products from a sheet](/help/products/import-products) with the **SellingPrice** column. To change one item, see [Sizes, colours and barcodes](/help/products/variants-and-barcodes).
:::

## 3. Choose the store and import

1. When your file has a **quantity** column, choose [[1]] the store under **Apply these quantities to**. It starts with the store chosen at the top of the screen.
2. Check the green line [[2]], for example *Ready to import 2 valid updates into Main Store.*
3. Click [[3]] **Import Updates**.

![The window after choosing a file. The store is marked 1, the green Ready to import line 2 and the Import Updates button 3.](3-choose-store-and-import.webp "The quantity is the stock at this store only.")

## 4. Check the result

A message at the bottom of the screen says how many items were changed, for example *Successfully updated 2 variants.*

![The message Successfully updated 2 variants.](4-result.webp)

If some rows could not be changed, a red message lists them, for example *1 of 2 rows applied. 1 failed — SAR-XYZ: SKU not found.* Fix those rows and import them again.

To see the new number, open **Inventory** and search for the SKU. [[1]] The stock shows the number from your file.

![Inventory Overview searched for SAR-MYS-GRN. The row with stock 8 is marked 1.](5-check.webp "Each change is saved in the stock history as a manual correction.")

## Common problems

:::faq "Row 2 (SKU-001): No valid update fields provided."
That row has a SKU but every other cell is empty. Add a quantity or a reorder level, or delete the row.
:::

:::faq "SKU not found"
The SKU in your file does not match any item. Check the spelling. You can copy the exact SKU from the product's **Variants** tab.
:::

:::faq "Invalid quantity."
Quantities must be a number of 0 or more. Remove text, spaces and minus signs.
:::

:::faq The import button does not work for me
Changing stock in bulk needs permission to correct stock. The owner, an admin or an inventory manager can do it. Ask your shop owner.
:::
