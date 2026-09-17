---
title: Your dashboard
summary: The first screen after you sign in. Five tiles show your stock value, open purchase orders, low stock, dead stock and products on sale.
for: Owners, admins and inventory managers (others see a shorter dashboard)
minutes: 3
app: /dashboard
appLabel: Dashboard
keywords: dashboard home tiles inventory value stock value open po low stock dead stock active products analytics chart overview
---

The **Dashboard** is the first screen after you sign in. Click **Dashboard** at the top of the menu to come back to it.

## 1. The five tiles

![The Dashboard. The five tiles are marked 1 Inventory Value, 2 Open PO Value, 3 Low Stock Count, 4 Dead Stock Value and 5 Active Products.](1-the-tiles.webp "Click any tile to see the items behind the number.")

[[1]] **Inventory Value**: what your stock is worth, at what you paid for it, in the store chosen at the top of the screen. The small line under it shows the value across all your locations. If some items have no cost, a note says so: those are counted at their selling price, or at ₹0 when they have no price either. Click the tile to open **Inventory**.

[[2]] **Open PO Value**: the total of your purchase orders that are sent to suppliers but not fully received yet. This is money you still expect to pay. Click the tile to open **Purchase Orders** showing only these open orders.

[[3]] **Low Stock Count**: how many items are at or below their reorder level. The line under it counts items that are completely out of stock. Click the tile to open **Inventory** showing only low stock items.

[[4]] **Dead Stock Value**: the value of stock that has not moved (not sold, received or changed) for more than 90 days. Money sitting on your shelves. Click the tile to open **Inventory**.

[[5]] **Active Products**: how many products are published and on sale. Drafts and archived products are not counted. Click the tile to open **Products**.

:::tip Numbers look wrong?
The first tile follows the store chosen at the top of the screen. Change the store to see another one.
:::

## 2. Shortcuts

[[1]] The buttons under the tiles take you straight to common jobs: **+ Product** opens Add Product, **+ Stock In** opens Inventory, **+ Purchase Order** starts a new purchase order and **+ Supplier** opens your suppliers. You only see the buttons your role can use.

![The shortcut buttons + Product, + Stock In, + Purchase Order and + Supplier, marked 1.](2-shortcuts.webp)

## 3. Overview, Inventory and Analytics

Below the shortcuts are three tabs.

- **Overview**: *Recent Transactions* (the latest stock movements) and *Low Stock Items*.
- **Inventory**: *Low Stock Items* and the *Dead Stock List*. [[1]] **View All** opens all stock alerts.

![The Inventory tab with Low Stock Items and the Dead Stock List. View All is marked 1.](4-inventory-tab.webp "4 / 5 means 4 pieces left, and the warning level is 5.")

- **Analytics**: *Inventory Value Trend*, *Stock Movement (30 Days)*, *Supplier Concentration* (how much you buy from each supplier) and *Top Suppliers*.

![The Analytics tab with four charts: Inventory Value Trend, Stock Movement, Supplier Concentration and Top Suppliers.](5-analytics-tab.webp "A new shop has no trend line yet. The chart starts the next day.")

## 4. Where Open PO Value takes you

Clicking **Open PO Value** opens **Purchase Orders** with [[1]] **Open (waiting for delivery)** already chosen. These are the orders that make up the number on the tile.

![Purchase Orders with the filter Open (waiting for delivery) marked 1, showing PO-000003 from Kanchi Weavers, status SENT.](6-open-po-value.webp "Choose All statuses to see every order again.")

## 5. What other roles see

Stock value, open orders and dead stock are money figures. Only roles that may see financial reports see the tiles: the owner, admins and inventory managers.

A salesperson or stock room staff sees [[1]] *Stock value, open orders and dead stock aren't part of your role. Ask whoever manages your team.* instead. Parts of the tabs below can also show *Not part of your role*.

![The Dashboard for a salesperson. The message Not part of your role is marked 1 where the tiles would be.](7-salesperson.webp "The shortcut buttons are hidden too, because this role cannot use them.")

## Common problems

:::faq Inventory Value is ₹0 or very low
Your stock has no cost recorded. Add what you paid when you receive stock, or set **You pay** on the product's Variants tab.
:::

:::faq Clicking an item in Low Stock Items or Dead Stock List goes back to the Dashboard
Open the item from **Products** or **Inventory** instead. To see all low stock items, click the **Low Stock Count** tile or **View All**.
:::

:::faq Dead Stock Value opens the whole inventory
The tile opens **Inventory** with all items. To see the items that have not moved, use the **Dead Stock List** on the **Inventory** tab of the Dashboard.
:::

:::faq I only see "Not part of your role"
Your role does not include financial reports. Ask your shop owner. See [Roles](/help/settings/roles).
:::
