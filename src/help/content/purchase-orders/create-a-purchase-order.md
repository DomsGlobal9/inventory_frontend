---
title: Raise and send a purchase order
summary: Order stock from a supplier, check your margin before you buy, then send the order by email, WhatsApp or PDF.
for: Owners and managers
minutes: 4
app: /inventory/purchase-orders
appLabel: Purchase Orders
keywords: purchase order po create raise order supplier buy send email whatsapp pdf mark as sent draft margin cost deliver to
---

A purchase order (PO) is the list of what you are buying from one supplier, at what price, and which store it goes to. It moves through: **DRAFT** → **SENT** → **PARTIALLY RECEIVED** → **RECEIVED**.

## 1. Open Purchase Orders

1. In the menu on the left, click [[1]] **Purchase Orders**.
2. Click [[2]] **Create PO**.

![The Purchase Orders screen. Purchase Orders is marked 1 in the menu and Create PO is marked 2.](1-open.webp "All your purchase orders, newest first.")

## 2. Choose the supplier and the store

1. [[1]] **Supplier Details**: pick the supplier.
2. [[2]] **Deliver to**: the store the goods should arrive at. It starts with the store chosen at the top of the screen.

![Create Purchase Order. The supplier Kanchi Weavers is marked 1 and Deliver to Main Store is marked 2.](2-supplier-and-store.webp "The store's address is printed on the order for the supplier.")

## 3. Add the items

Click [[1]] **Add Item**.

![The Line Items box. The Add Item button is marked 1.](3-add-item.webp "An empty order cannot be saved.")

The list first shows the items this supplier already sends you.

1. [[1]] Search by name, SKU or barcode to find something else.
2. [[2]] Click the item to add it.

![Add Item to PO with Anarkali typed in the search. The search box is marked 1 and Anarkali Suit Set Pink M is marked 2.](4-choose-item.webp "SUPPLIED BY means you have ordered it from this supplier before. NOT LINKED means you never have.")

Press **Add Item** again for each item you want.

## 4. Type the price and quantity

1. [[1]] **You pay**: the price for one piece. It starts with this supplier's price for the item, or the item's usual cost.
2. [[2]] A margin note shows when this price leaves little profit against the selling price. Red means very low or a loss.
3. [[3]] **Ordered**: how many pieces.
4. [[4]] **Grand Total**: the value of the whole order.

![Line Items with the Anarkali suit. You pay 2600 is marked 1, the note about 19% margin 2, Ordered 6 is marked 3 and the Grand Total 4.](5-price-and-quantity.webp "Check prices now. A saved order cannot be edited.")

:::warning Check everything before you save
Once saved, the supplier, items, prices and quantities cannot be changed. Only **Deliver to** can still be changed.
:::

## 5. Press Create PO

Click [[1]] **Create PO** at the top right. You see *Purchase Order created successfully*.

![The Create PO button at the top right is marked 1.](6-create.webp "The order is saved as a DRAFT.")

[[1]] The new order is at the top of the list as **DRAFT**, with a number like *PO-000006*. Click it to open it.

![The purchase order list. The new DRAFT order to Kanchi Weavers is marked 1.](7-in-the-list.webp "Deliver to shows the store each order is for.")

## 6. Send it to the supplier

A draft order has these buttons at the top:

1. [[1]] **Email to supplier**: emails the full order to the supplier. It asks you first and shows the email address. After it is sent, the order becomes **SENT** by itself.
2. [[2]] **Send on WhatsApp**: opens WhatsApp with the order already typed. You press Send in WhatsApp, then come back and press **Mark as Sent**.
3. [[3]] **Mark as Sent**: only records that you sent the order some other way, for example by phone. It does not send anything.
4. [[4]] **Download PDF**: saves the order as a PDF you can print or share.

![A draft purchase order. Email to supplier is marked 1, Send on WhatsApp 2, Mark as Sent 3 and Download PDF 4.](8-send-options.webp "Greyed-out buttons: hold the mouse over them to see why.")

:::warning Email to supplier really sends the email
Check the supplier and the order first. An email that has gone cannot be called back.
:::

## 7. Mark as Sent

If you sent the order by WhatsApp, phone or in person, click **Mark as Sent**, read the message and press [[1]] **Confirm**.

![The Mark Purchase Order as Sent box. It says this only records that the order was sent. Confirm is marked 1.](9-mark-as-sent.webp "Cancel leaves the order as a draft.")

[[1]] The order now says **SENT**. When the goods arrive, see [Receive a delivery](/help/purchase-orders/receive-a-delivery).

![The top of the order. The SENT label is marked 1, next to Download PDF.](10-sent.webp "The send buttons go away once the order is sent.")

## Who can do this

Owners, admins and managers. Stock room staff can open orders and receive deliveries, but cannot raise or send them.

## Common problems

:::faq Email to supplier or Send on WhatsApp is greyed out
The supplier has no email or usable phone number, or the order has no store under **Deliver to**. See [Suppliers](/help/purchase-orders/suppliers) to add the details.
:::

:::faq I made a mistake on a saved order
A saved order cannot be edited, and there is no button to cancel it. Raise a new, correct order and tell the supplier if you already sent the wrong one. The wrong order stays in the list and still counts as *on order* in [Reorder suggestions](/help/purchase-orders/reorder), so ask ScaleEzy support to cancel it.
:::

:::faq The supplier should deliver to a different store
On the order, under **Deliver to**, click **Change**, choose the store and press **Save**. If the order was already sent, ScaleEzy reminds you to tell the supplier yourself.
:::

:::faq Choose the store this order is for
Every order needs a store under **Deliver to** before it can be saved or sent.
:::
