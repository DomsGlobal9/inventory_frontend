---
title: Low stock alerts
summary: ScaleEzy warns you when an item falls to its reorder level or runs out, so you can order more in time.
for: Owners, managers and stock room staff
minutes: 2
app: /inventory/alerts
appLabel: Inventory Alerts
keywords: alert alerts low stock out of stock bell reorder level warning running out notification pin dismiss create po
---

## 1. Open Stock alerts

1. In the menu on the left, click **Inventory**.
2. At the top right, click [[1]] **Stock alerts**.

![The Inventory screen. The Stock alerts button at the top right is marked 1.](1-open.webp "The bell at the top of every screen shows the same alerts.")

You can also click the bell at the top of any screen, then **View All Alerts**. See [Find your way around](/help/start/find-your-way).

## 2. Read the list

1. [[1]] **Out of Stock**: items with nothing left.
2. [[2]] **Low Stock**: items at or under their reorder level.
3. [[3]] **Current Stock**: how many pieces are left in this store.
4. [[4]] **Reorder Level**: the number that sets off the alert.

![The Inventory Alerts screen on the Low Stock tab. The two tabs are marked 1 and 2, the Current Stock of Mysore Crepe Saree 3 and its Reorder Level 4.](2-alert-list.webp "A red dot means nobody has opened this alert yet.")

Alerts are for the store chosen at the top of the screen. An alert goes away by itself once the stock is back above its reorder level.

## 3. What to do with an alert

1. [[1]] **Pin**: keeps it at the top of the list.
2. [[2]] **Dismiss** (×): removes it from the list.
3. [[3]] **View**: opens the product.
4. [[4]] **Create PO**: starts a purchase order for this item.

![The buttons at the end of the Mysore Crepe Saree alert, marked 1 to 4.](3-row-buttons.webp "Export Report at the top saves the list as a spreadsheet file.")

## 4. Order more with Create PO

**Create PO** opens a new purchase order with the item and a quantity already filled in, delivered to the store the alert is for.

1. [[1]] Choose the supplier.
2. [[2]] Type what you pay for one piece. It starts at **0**, so do not skip this.
3. [[3]] Check the quantity.
4. Press [[4]] **Create PO**.

![A new purchase order made from the alert. Select Supplier is marked 1, the price box 2, the quantity 3 and the Create PO button 4.](4-create-po.webp "Add more items with Add Item before you press Create PO.")

The rest is the same as [Raise and send a purchase order](/help/purchase-orders/create-a-purchase-order). To order many low items at once, use [Reorder suggestions](/help/purchase-orders/reorder).

## Set the reorder level

The reorder level is the number that sets off a low stock alert. There is no box on the screen to change it. This is how it works:

- A new colour or size starts with a reorder level of **5**.
- To change it, use a file: the **reorderLevel** column in [Change stock or reorder levels in bulk](/help/products/bulk-updates), or the **ReorderLevel** column when you [import products from a sheet](/help/products/import-products).
- A reorder level of **0** means the item is not tracked. It is never marked low, only out of stock.
- One item has one reorder level. It is the same in every store.
- The new level counts from the next time that item's stock changes.

:::warning Do not import the Variants export as it is
The **Export** on a product's **Variants** tab has a **Quantity** column. That number is the stock of **all** your stores added together. **Import Updates** treats **Quantity** as the stock of **one** store. If you import that file as it is, the store you choose gets the total of all stores. Delete the **Quantity** column before you import it.
:::

## Common problems

:::faq An item is low but has no alert
Check its reorder level. An item with a reorder level of 0 is never marked low (only out of stock). Also check the store at the top of the screen. See [Set the reorder level](/help/inventory/low-stock-alerts#set-the-reorder-level).
:::

:::faq Create PO is there but saving fails
Raising purchase orders needs the **Raise a purchase order** permission. Stock room staff see the button but cannot save the order. Ask a manager or the owner.
:::

:::faq I dismissed an alert by mistake
If the item is still low, the alert comes back the next time its stock changes.
:::
