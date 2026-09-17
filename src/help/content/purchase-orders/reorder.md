---
title: Reorder suggestions
summary: See every item that is running low in a store, grouped by supplier, and make draft purchase orders for all of them in one click.
for: Owners and managers
minutes: 2
app: /inventory/reorder
appLabel: Reorder
keywords: reorder suggestions low stock restock replenish draft orders auto purchase order supplier minimum on order
---

## 1. Open Reorder

1. In the menu on the left, click [[1]] **Purchase Orders**.
2. At the top, click the [[2]] **Reorder** tab.

![The Reorder tab. Purchase Orders is marked 1 in the menu and the Reorder tab is marked 2.](1-open.webp "Suggestions are for the store chosen at the top of the screen.")

**Action Required** lists items at or under their reorder level in this store, grouped by the supplier you buy them from (the **PREFERRED** one, see [Suppliers](/help/purchase-orders/suppliers)).

Items that are low but already have enough on an open purchase order are left out. A line under the title says how many.

## 2. Choose what to order

For each item:

1. [[1]] Tick the items to order. Untick any you do not want now.
2. [[2]] **Stock here**: how many pieces this store has.
3. [[3]] **On order**: pieces already on open purchase orders for this store, drafts included.
4. [[4]] **Order Quantity**: starts with a suggestion. Change it if you like.
5. Press [[5]] **Create Draft Orders**. The total above it shows the value of what you ticked.

![Action Required for Main Store. For Kanchipuram Silk Saree Maroon, the tick box is marked 1, Stock here 2, On order 3 and Order Quantity 4. Create Draft Orders is marked 5.](2-choose.webp "Reorder Threshold is the item's reorder level. Unit Cost is the supplier's price.")

If a supplier has a minimum order, the quantity is raised to it and the line says *Auto-adjusted to minimum order*.

## 3. Open the new orders

ScaleEzy makes **one draft purchase order per supplier**, delivered to this store. [[1]] Click an order number to open it.

![The green box saying 1 Draft Purchase Order Created. The order number button is marked 1.](3-created.webp "Nothing is sent to the supplier yet.")

Check each order, then send it with **Email to supplier**, **Send on WhatsApp** or **Mark as Sent**. See [Raise and send a purchase order](/help/purchase-orders/create-a-purchase-order).

:::note Draft orders cannot be edited
The green box says you can adjust the drafts, but a saved purchase order cannot be changed. Set the right quantities **before** you press **Create Draft Orders**.
:::

## Items with no supplier

Items that are low but have never been ordered from any supplier show under **Action Required: Unassigned Items**. Press **Create Manual Order** to start a purchase order for one, then choose the supplier. Next time, that item is grouped under that supplier.

## Who can do this

Owners, admins and managers. Stock room staff can open the tab but cannot create orders, and they do not see prices.

## Common problems

:::faq Inventory is Healthy, but I know something is low
Either enough is already on order (see the line under the message), the item's reorder level is 0, or you are looking at a different store. Check the store at the top of the screen.
:::

:::faq An item keeps showing even after I ordered it
The order may be for a different store. Only open orders for this store count as **On order**. Open the order and check **Deliver to**.
:::

:::faq An item is under the wrong supplier
Open the right supplier's page and click the star next to the item to make them the preferred supplier. See [Suppliers](/help/purchase-orders/suppliers).
:::
