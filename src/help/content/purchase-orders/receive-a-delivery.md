---
title: Receive a delivery
summary: When a supplier's goods arrive, count them against the purchase order, add them to stock and get a goods receipt.
for: Stock room staff, managers and owners
minutes: 3
app: /inventory/purchase-orders
appLabel: Purchase Orders
keywords: receive delivery goods receipt grn arrived supplier purchase order po inward challan invoice part delivery partial put away
---

You can receive goods only on an order that is **SENT** or **PARTIALLY RECEIVED**. If it is still a draft, ask the person who raised it to send it first. See [Raise and send a purchase order](/help/purchase-orders/create-a-purchase-order).

## 1. Open the purchase order

1. In the menu on the left, click [[1]] **Purchase Orders**.
2. Click [[2]] the order the goods belong to. The supplier's invoice or challan usually shows the PO number.

![The Purchase Orders list. Purchase Orders is marked 1 in the menu and the SENT order PO-000003 is marked 2.](1-open.webp "Choose Open (waiting for delivery) in the status list to see only orders still to arrive.")

## 2. Type what arrived

Count the pieces in the boxes. For each item:

1. [[1]] **Ordered** is what you asked for.
2. [[2]] Type in **Receive Now** how many pieces of this item really arrived.
3. [[3]] Do the same for every item. Leave a box empty if none of that item came.

![Line Items of PO-000003. The Ordered column is marked 1, Receive Now 6 for Mysore Crepe Saree is marked 2 and 4 for Banarasi Silk Saree is marked 3.](2-receive-now.webp "Here 6 of the 10 Mysore sarees came. The other 4 come later.")

:::tip Only part of the order came?
Type only what arrived. The rest stays open on the order for the next delivery.
:::

## 3. Fill in the receipt

In the **Goods Receipt (GRN)** box on the right:

1. [[1]] **Receive into**: the store the goods went to. It starts with the store on the order, marked *this order*.
2. [[2]] **Received by**: the name of the person who took the goods at the door. You must fill this.
3. [[3]] **Supplier invoice / challan no.**: the number on the supplier's bill. Optional, but it helps later.
4. Add the receiver's phone and a **Note** if you like.
5. Press [[4]] **Confirm Receipt**.

![The Goods Receipt box. Receive into Main Store is marked 1, Received by Ravi Kumar 2, invoice KW-3310 3 and Confirm Receipt 4.](3-receipt-details.webp "The note is printed on the receipt, for example damaged boxes.")

:::warning Receiving into a different store
If you pick a store that is not the one on the order, ScaleEzy asks you to confirm. The goods then go into that store, and the store on the order stays short until you [move the stock](/help/transfers/transfers).
:::

## 4. Download the receipt

The goods are now in stock. A green box says the receipt is saved, for example *GRN-000003 saved*, and how many pieces went in.

Click [[1]] **Download receipt PDF** to save the goods receipt. Print it or send it to the supplier.

![The receipt saved box. Download receipt PDF is marked 1.](4-receipt-saved.webp "Every delivery gets its own receipt number.")

## 5. What a part delivery looks like

- [[1]] **Received** shows what has arrived so far.
- [[2]] **Receive Now** is still open for the pieces that have not come.
- [[3]] **Full** means that item has fully arrived.

![Line Items after the delivery. Received 6 for Mysore Crepe Saree is marked 1, its empty Receive Now box 2, and Full for Banarasi Silk Saree 3.](5-part-received.webp "When the rest comes, open the same order and do steps 2 to 4 again.")

[[1]] The order now says **PARTIALLY RECEIVED**. When everything has arrived it says **RECEIVED**.

![The top of PO-000003. The PARTIALLY RECEIVED label is marked 1.](6-status.webp "A fully received order has no Receive Now column.")

## 6. Deliveries received, and put away

Lower on the order:

1. [[1]] The yellow box says how many pieces of this order are not on a shelf yet. Click **Put away** to shelve them. See [Put away stock](/help/shelves/put-away).
2. [[2]] **Deliveries received** lists every delivery on this order: when, who received it and the invoice number.
3. [[3]] **Receipt PDF** downloads that delivery's receipt again at any time.

![The yellow put-away box with its Put away button marked 1, and Deliveries received with the receiver line marked 2 and Receipt PDF marked 3.](7-deliveries-and-put-away.webp "The yellow box shows only in stores that use shelves.")

## Who can do this

Stock room staff, managers, admins and owners.

## Common problems

:::faq There is no Receive Now column
The order is still a **DRAFT**, or it is already fully **RECEIVED**. A draft must be sent first.
:::

:::faq Enter the name of the person who received the goods
**Received by** is empty. Type the name of whoever took the delivery.
:::

:::faq Cannot receive more than remaining quantity
You typed more than is still waiting on the order. If the supplier sent extra, receive what was ordered, then add the extra with [Add stock](/help/inventory/add-stock).
:::

:::faq No quantities to receive
All the **Receive Now** boxes are empty. Type how many of at least one item arrived.
:::
