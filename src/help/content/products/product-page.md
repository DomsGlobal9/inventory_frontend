---
title: The product page: stock, history and suppliers
summary: Everything about one product in one place. See its stock in each store, every stock movement, and who you buy each colour and size from.
for: Owners, admins and inventory managers. Other roles see less.
minutes: 4
app: /products
appLabel: Products
keywords: product page details stock breakdown per store location total stock history ledger movements record transaction stock movement suppliers who supplies cheapest preferred product code copy tiles
---

Each product has its own page. It shows the product's numbers at the top and has four tabs: **Overview**, **Variants**, **Images** and **Inventory History**.

## 1. Open a product

1. In the menu on the left, click [[1]] **Products**.
2. Click [[2]] the product in the list, for example *Kanchipuram Silk Saree*.

![The Products list. Products is marked 1 in the menu and Kanchipuram Silk Saree is marked 2.](1-open.webp "Click anywhere on the row to open the product.")

:::tip Faster: search
On a computer, type the product name or SKU in the search box at the top of the screen and press **Enter**. ScaleEzy opens the product straight away.
:::

## 2. Read the top of the page

Four boxes show the product's numbers:

1. [[1]] **Base Price**: the normal selling price of the product.
2. [[2]] **Total Variants**: how many colours and sizes it has.
3. [[3]] **Total Stock Units**: how many pieces you have of all its colours and sizes together.
4. [[4]] **Low Stock Variants**: how many colours and sizes are low. The box turns red when this is more than 0.

Under them are [[5]] the four tabs.

![The top of the Kanchipuram Silk Saree page. The four boxes Base Price, Total Variants, Total Stock Units and Low Stock Variants are marked 1 to 4, and the tabs are marked 5.](2-the-top.webp "The buttons at the top right publish, archive or trash the product.")

For **Publish**, **Unpublish**, **Archive** and **Move to Trash**, see [Publish, archive and delete](/help/products/publish-archive-delete).

## 3. Copy the product code

The **Overview** tab shows the product's details. On the right, under **Identifiers**, is the **PRODUCT CODE**.

Click [[1]] the copy button (*Copy Product Code*) next to it. The code is copied, and a green tick shows for a moment. Paste it where you need it, for example in the **ProductCode** column of an [import sheet](/help/products/import-products).

![The Identifiers box. The copy button next to the product code is marked 1.](3-copy-code.webp "The Try-On QR Code is under the identifiers.")

## 4. See the stock of each colour and size

Click the **Variants** tab. The **Total Stock** column shows the pieces of each colour and size in **all your stores added together**. It is not only the store chosen at the top of the screen.

To see how many are in each store, click [[1]] the small **i** button next to the number (*View Stock Breakdown*).

![The Variants tab. The i button next to Total Stock 16 of the red saree is marked 1.](4-total-stock.webp "Status shows In Stock, Low Stock or Out of Stock.")

## 5. Read the Stock Breakdown

The **Stock Breakdown** window lists each store and how many pieces it has. **Total** at the bottom is the same number as **Total Stock**.

![The Stock Breakdown window for SAR-KAN-RED: Godown 3, Main Store 13, Total 16.](5-stock-breakdown.webp "Click the cross at the top right to close it.")

If the item has no stock anywhere, it says *No stock in any location*.

For the rest of the Variants tab (prices, labels, new sizes), see [Sizes, colours and barcodes](/help/products/variants-and-barcodes).

## 6. Who supplies this item

On the **Variants** tab, click [[1]] the truck button on a row (*Who supplies this item*). A list opens under the row with every supplier you buy this colour and size from.

1. [[2]] **PREFERRED**: the supplier you usually order this item from.
2. [[3]] Their price: what this supplier charges. When you have more than one price, the cheapest is green and marked **CHEAPEST**. Under the name you may also see how many days they take (*10d lead*) and their smallest order (*min 2*).
3. [[4]] **Create PO**: starts a new purchase order to this supplier, with this item, their price and their smallest order already filled in.
4. [[5]] The green phone button opens a WhatsApp chat with the supplier. It shows only when the supplier has a mobile number.
5. [[6]] The star makes this supplier the preferred one for this item.
6. [[7]] The red bin removes this supplier from the item's list. ScaleEzy asks *Remove this supplier?* first. Orders already placed do not change.

![The supplier list for SAR-KAN-RED. The truck button is marked 1, PREFERRED on Kanchi Weavers 2, the green price of Arani Silk Traders 3, its Create PO button 4, WhatsApp 5, the star 6 and the bin 7.](6-who-supplies.webp "Click the truck button again to close the list.")

A supplier is added to this list by itself the first time you raise a purchase order for the item with them. When the list is empty, it says *No supplier is recorded for* the SKU *yet*. See also [Suppliers](/help/purchase-orders/suppliers).

## 7. Open Inventory History

Click the **Inventory History** tab. The **Inventory Ledger** lists every stock movement of this product, newest first, from all your stores.

1. [[1]] **All Types**: show only **Stock In**, **Stock Out** or **Adjustment**.
2. [[2]] **All Reasons**: show only one reason, for example **Sale**, **Damage** or **Supplier Delivery**.
3. [[3]] **Export**: saves the movements on the screen as a spreadsheet (CSV) file.
4. [[4]] **Record Transaction**: add a stock movement by hand.

![The Inventory History tab. All Types is marked 1, All Reasons 2, Export 3 and Record Transaction 4.](7-inventory-history.webp "Each card shows the change, the reason, the SKU and the running stock.")

On each card, the green or red number is the change. **Running Stock** is how many pieces were left **in that store** after the movement.

## 8. Record a stock movement

:::note Most people should use Add stock or Remove stock
The usual way to change stock is [Add stock](/help/inventory/add-stock) or [Remove stock](/help/inventory/remove-stock). They ask more questions and keep better records. Use **Record Transaction** only for a quick change on one product.
:::

Click **Record Transaction**. The **Record Stock Movement** window opens.

1. [[1]] **Select SKU**: choose the colour and size. The *Stock* number in this list counts all your stores.
2. [[2]] **Type**: **Stock IN** adds pieces, **Stock OUT** takes pieces away, **Adjustment** adds or takes away by the number you type (type a minus sign to take away, for example *-1*).
3. [[3]] **Quantity**: how many pieces.
4. [[4]] **Reason**: ScaleEzy fills it in from the type: **Purchase** for Stock IN, **Sale** for Stock OUT and **Manual Correction** for Adjustment.
5. [[5]] **Notes (Optional)**: why, for example *Torn border, kept aside*.
6. Click [[6]] **Confirm Transaction**.

![The Record Stock Movement window. Select SKU is marked 1, Type Adjustment 2, Quantity -1 3, Reason Manual Correction 4, Notes 5 and Confirm Transaction 6.](8-record-movement.webp "The change is made in the store chosen at the top of the screen.")

:::warning It changes the store at the top of the screen
The pieces are added to or taken from the store chosen at the top of the screen. Check it before you press **Confirm Transaction**.
:::

The message *Transaction recorded successfully* shows, and [[1]] the new movement is at the top of the ledger.

![The Inventory Ledger with the new card at the top, marked 1: -1 MANUAL CORRECTION for SAR-KAN-MRN, running stock 5, note Torn border, kept aside.](9-new-line.webp "The Total Stock on the Variants tab changes too.")

## Who can do what

| Part | Who |
|---|---|
| Open the product page, the Overview and the Variants tab | Everyone who can see products |
| **Inventory History** | People who can see stock. Salespeople get *Could not load stock movements.* |
| Save a **Record Transaction** | People who can correct stock: the owner, an admin or an inventory manager |
| The supplier list | People who can see suppliers: the owner, an admin or an inventory manager |
| **Create PO**, the star and the bin in the supplier list | People who can raise orders and change suppliers |

## Common problems

:::faq "You do not have permission to: correct stock counts."
Everyone who opens the page sees **Record Transaction**, but only the owner, an admin or an inventory manager can save it. Stock room staff and salespeople get this message. Stock room staff can use [Add stock](/help/inventory/add-stock) instead, or ask a manager.
:::

:::faq Total Stock is bigger than the stock in my store
**Total Stock** adds up all your stores. Click the **i** button next to it to see each store.
:::

:::faq The supplier list says no supplier is recorded, but we buy it from someone
A supplier is added to the list only when you raise a purchase order for this item with them. Also, stock room staff and salespeople cannot see suppliers, so for them the list is always empty.
:::

:::faq The Reason list has nothing to choose
The reason follows the **Type** you choose. To record damage or a return with the right reason, use [Remove stock](/help/inventory/remove-stock) or [Add stock](/help/inventory/add-stock).
:::

:::faq Older movements are missing from Inventory History
The ledger shows the newest 50 movements of the product. To see more, use [Stock history](/help/inventory/stock-history).
:::
