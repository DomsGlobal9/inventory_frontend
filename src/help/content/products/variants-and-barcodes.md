---
title: Sizes, colours and barcodes
summary: Each colour and size of a product is a variant with its own SKU, barcode, stock and price. Add new ones, change a price and print labels.
for: Owners, admins and inventory managers
minutes: 4
app: /products
appLabel: Products
keywords: variant variants size colour color sku barcode label print price generate add size new colour sticker tag
---

A product such as *Cotton Kurti* can come in several sizes and colours. Each size and colour is a **variant**. Every variant has its own **SKU** (item code), **barcode**, stock and price.

## 1. Open the Variants tab

1. In the menu, click [[1]] **Products**, then click the product in the list.
2. Click the [[2]] **Variants** tab.

![A product page for Cotton Kurti. Products is marked 1 in the menu and the Variants tab is marked 2.](1-open.webp "The product page has four tabs: Overview, Variants, Images and Inventory History.")

## 2. Read the variants table

Each row is one variant.

- [[1]] **Identifiers**: the SKU (in bold) and the variant code. The copy button copies it. The pin button shows which shelf it is on.
- [[2]] **Barcode**: the barcode that goes on the label, with its number under it.
- [[3]] **Status**: *In Stock*, *Low Stock* or *Out of Stock*.

![The Product Variants table. The SKU of the M size is marked 1, its barcode 2 and its status 3.](2-the-variants.webp "NO PHOTO means nobody has added a photo of this colour yet.")

Further right you see **Total Stock**, **You pay**, **Add profit**, **You sell at** and **Your share %**, and the buttons for each row. Only people who may see costs see **You pay**, **Add profit** and **Your share %**.

**Total Stock** is the stock of all your stores added together. The small **i** next to it shows each store. See [The product page](/help/products/product-page).

## 3. Add a new size or colour

Click [[1]] **Generate Variants**. A panel opens under it.

![The Generate Variants button, marked 1.](3-generate-button.webp)

## 4. Choose the sizes, colours and stock

1. [[1]] **Select Sizes**: click each size to add.
2. [[2]] **Select Colors**: **double-click** a colour, or click it once and then click one of its shades. Each colour you add shows as a chip below.
3. [[3]] **Initial Stock Quantity**: type how many pieces you have of each new variant. Leave it empty for 0.
4. [[4]] **What you pay per piece**: the cost of one piece. **Bought from** is optional.
5. Tick **Price each one differently** only when the new variants have a different price. Otherwise they sell at the product's base price.
6. Click [[5]] **Confirm Generation**.

![Generate Variant Combinations. Sizes are marked 1, colours 2, the stock grid 3, the cost box 4 and Confirm Generation 5.](4-choose-sizes-colours.webp "Will generate 1 new combinations: Blue in XL.")

:::note Which store gets the new stock
The stock goes into the store chosen at the top of the screen. Tick **Stock at … only** to put the same number of pieces in every store instead.
:::

ScaleEzy makes the SKU and barcode for you. The new row appears in the table.

## 5. Change the selling price of one variant

1. [[1]] Click in the **You sell at** box of the row and type the new price.
2. Press **Enter**, or click the green tick next to the box, to save.

![The You sell at box of the Blue XL row with 1550 typed in, marked 1.](5-change-price.webp "Press Esc to cancel.")

:::warning Clicking away does not save
If you click somewhere else without pressing **Enter** or the tick, the new price is not saved. Leave the box empty and save to use the product's base price again.
:::

**Add profit** helps you set a price: type a percentage, for example 40, and ScaleEzy fills in **You sell at** as **You pay** plus 40%. If **You pay** is empty, it uses the average cost of the stock you received instead. The small line under **You pay** says which one. You still press **Enter** to save it.

For a different price in one store only, see [A different price in one store](/help/products/price-per-store).

## 6. Change what you pay (You pay)

**You pay** is what one piece costs you.

1. [[1]] Click in the **You pay** box of the row and type the new cost.
2. Press **Enter**, or click the green tick next to the box, to save. Press **Esc**, or click the cross, to cancel.

![The You pay box of the Blue M row with 820 typed in, marked 1. A green tick and a cross are next to it.](5b-change-cost.webp "The small line under the box says which cost the profit is worked out from.")

- If this stock never had a cost before, saving also gives the pieces you already hold this cost. Your stock value then counts them.
- The small line under the box says which cost profit is worked out from: *what you pay* when this box has a number in it, or *average cost of stock received* when it is empty.
- Clicking away without **Enter** or the tick does not save.

Only the owner, an admin or an inventory manager sees **You pay** and can change it.

## 7. Print labels

- For one variant, click [[1]] the **Print Label** button (the printer) on its row.
- For every variant of the product, click [[2]] **Print All Labels**.
- For some of them, tick the boxes at the start of the rows, then click **Print Labels** with the number in brackets.

![The Variants tab. The Print Label button on the Blue XL row is marked 1 and Print All Labels is marked 2.](6-print-label.webp "The buttons next to it: who supplies this item, location settings and delete.")

The truck button (*Who supplies this item*) lists every supplier of this colour and size, with their prices. See [The product page](/help/products/product-page#who-supplies-this-item).

ScaleEzy downloads a PDF file, for example *Labels_Cotton Kurti.pdf*. Open it and print it on your label printer. Each label is 50 mm by 25 mm, one label per page, with the product name, the price, the SKU and the barcode.

![One printed label: Cotton Kurti, Rs.1550.00, the SKU of the Blue XL variant and a barcode.](7-the-label.webp "Scan this barcode at the counter to sell the item.")

## Common problems

:::faq The price on the label is wrong
The label uses the price for the store chosen at the top of the screen. Check the price in **You sell at**, save it, then print the label again.
:::

:::faq "Cannot add variants: this product has no product code."
Reload the page and try again. If it happens again, contact support.
:::

:::faq I cannot delete a variant
A variant can be deleted only if it never had any stock movement, is on no purchase order and was never in a stock count. The message says which reason applies, for example *Cannot delete variant: it has inventory transaction history.* Deleting cannot be undone. For an item you no longer sell, set its stock to 0, or archive the whole product.
:::

:::faq I don't see You pay or Your share %
These show only for roles that may see what the shop paid, such as the owner, an admin or an inventory manager.
:::
